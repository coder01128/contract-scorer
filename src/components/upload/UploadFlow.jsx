import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { pdfToImages, extractContractData } from '../../lib/anthropic'
import { scoreContract, generateNegotiationPoints, getScoreColor, getScoreLabel } from '../../lib/scoring'

const SINGLE_STEPS = [
  { key: 'upload', label: 'Uploading document' },
  { key: 'extract', label: 'AI extracting contract data' },
  { key: 'score', label: 'Scoring and analyzing' },
  { key: 'done', label: 'Complete' },
]

const DEMO_STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'render', label: 'Render' },
  { key: 'extract', label: 'Extract' },
  { key: 'score', label: 'Score' },
  { key: 'done', label: 'Done' },
]

const SAMPLE_FILES = [
  { path: '/samples/sample-contract-autoserve-dms.pdf', name: 'sample-contract-autoserve-dms.pdf' },
  { path: '/samples/sample-contract-driveguard-fi.pdf', name: 'sample-contract-driveguard-fi.pdf' },
]

const DISPLAY_FIELDS = [
  { key: 'vendor_name', label: 'Vendor' },
  { key: 'service_type', label: 'Service Type' },
  { key: 'monthly_cost', label: 'Monthly Cost', format: 'currency' },
  { key: 'term_months', label: 'Term', format: 'months' },
  { key: 'auto_renewal', label: 'Auto-Renewal', format: 'bool' },
  { key: 'escalator_pct', label: 'Escalator', format: 'pct' },
  { key: 'cancellation_notice_days', label: 'Cancel Notice', format: 'days' },
  { key: 'early_termination_fee', label: 'Termination Fee', format: 'currency' },
  { key: 'data_exportable', label: 'Data Exportable', format: 'bool' },
  { key: 'data_ownership', label: 'Data Ownership' },
]

function formatFieldValue(value, format) {
  if (value == null) return '—'
  switch (format) {
    case 'currency': return '$' + Number(value).toLocaleString()
    case 'months': return `${value} months`
    case 'bool': return value ? 'Yes' : 'No'
    case 'pct': return `${value}%`
    case 'days': return `${value} days`
    default: return String(value)
  }
}

function makeDemoContract(name) {
  return { fileName: name, step: 'waiting', pages: [], totalPages: null, extractedData: null, visibleFields: 0, scores: null, animatedScore: null, error: null }
}

export default function UploadFlow({ dealership, userId, onClose, onComplete }) {
  const [mode, setMode] = useState('idle')
  const [step, setStep] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState(null)
  const fileRef = useRef(null)
  const [demoContracts, setDemoContracts] = useState([])
  const [demoComplete, setDemoComplete] = useState(false)

  function updateDemo(index, updates) {
    setDemoContracts(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c))
  }

  function getSingleStepStatus(stepKey) {
    if (!step) return 'pending'
    const ci = SINGLE_STEPS.findIndex(s => s.key === step)
    const ti = SINGLE_STEPS.findIndex(s => s.key === stepKey)
    if (error && mode === 'single' && ti === ci) return 'error'
    if (ti < ci) return 'done'
    if (ti === ci) return 'active'
    return 'pending'
  }

  async function getVerifiedAuth() {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Session expired. Please sign in again.')
    const { data: membership, error: memErr } = await supabase
      .from('dealership_users')
      .select('dealership_id')
      .eq('user_id', user.id)
      .single()
    if (memErr || !membership) throw new Error('No dealership linked to your account.')
    return { verifiedUserId: user.id, verifiedDealershipId: membership.dealership_id }
  }

  async function processFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    setMode('single')
    setFileName(file.name)
    setError(null)
    const contractId = crypto.randomUUID()

    try {
      setStep('upload')
      const { verifiedUserId, verifiedDealershipId } = await getVerifiedAuth()
      const filePath = `${verifiedDealershipId}/${contractId}/${file.name}`
      const { error: ie } = await supabase.from('contracts').insert({ id: contractId, dealership_id: verifiedDealershipId, uploaded_by: verifiedUserId, file_path: filePath, file_name: file.name, status: 'pending' })
      if (ie) throw new Error('Database insert failed: ' + ie.message)
      const { error: ue } = await supabase.storage.from('contracts').upload(filePath, file)
      if (ue) throw new Error('File upload failed: ' + ue.message)

      setStep('extract')
      await supabase.from('contracts').update({ status: 'extracting' }).eq('id', contractId)
      const pageImages = await pdfToImages(file)
      const extracted = await extractContractData(pageImages)

      setStep('score')
      const scores = scoreContract(extracted)
      const negotiationPoints = generateNegotiationPoints(extracted)
      const { error: sue } = await supabase.from('contracts').update({
        status: 'scored', vendor_name: extracted.vendor_name, service_type: extracted.service_type,
        monthly_cost: extracted.monthly_cost, term_months: extracted.term_months, auto_renewal: extracted.auto_renewal,
        escalator_pct: extracted.escalator_pct, cancellation_notice_days: extracted.cancellation_notice_days,
        early_termination_fee: extracted.early_termination_fee, data_exportable: extracted.data_exportable,
        data_ownership: extracted.data_ownership, additional_fees: extracted.additional_fees || [],
        key_clauses: extracted.key_clauses || [], extraction_raw: extracted, ...scores, negotiation_points: negotiationPoints,
      }).eq('id', contractId)
      if (sue) throw new Error('Failed to save results: ' + sue.message)
      setStep('done')
    } catch (err) {
      setError(err.message || 'An unexpected error occurred')
      await supabase.from('contracts').update({ status: 'failed' }).eq('id', contractId)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) processFile(file)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  async function cleanupExistingDemoContracts() {
    console.log('[Demo] Cleanup: checking for existing sample contracts...')
    const sampleNames = SAMPLE_FILES.map(s => s.name)
    const { data: existing } = await supabase
      .from('contracts')
      .select('id, file_path')
      .in('file_name', sampleNames)
    if (!existing || existing.length === 0) {
      console.log('[Demo] Cleanup: no existing samples found')
      return
    }
    console.log(`[Demo] Cleanup: deleting ${existing.length} existing sample(s)`)
    for (const contract of existing) {
      await supabase.storage.from('contracts').remove([contract.file_path])
      await supabase.from('contracts').delete().eq('id', contract.id)
    }
    console.log('[Demo] Cleanup: done')
  }

  async function startDemo() {
    setMode('demo')
    const contracts = SAMPLE_FILES.map(s => makeDemoContract(s.name))
    setDemoContracts(contracts)
    setDemoComplete(false)

    try {
      await cleanupExistingDemoContracts()
    } catch {}

    for (let i = 0; i < SAMPLE_FILES.length; i++) {
      try {
        await processDemoContract(i)
      } catch (err) {
        setDemoContracts(prev => prev.map((c, idx) => idx === i ? { ...c, step: 'error', error: err.message } : c))
      }
    }
    setDemoComplete(true)
  }

  async function processDemoContract(index) {
    const sample = SAMPLE_FILES[index]
    const set = (u) => setDemoContracts(prev => prev.map((c, i) => i === index ? { ...c, ...u } : c))

    set({ step: 'upload' })
    const resp = await fetch(sample.path)
    if (!resp.ok) throw new Error(`Failed to fetch ${sample.name}`)
    const blob = await resp.blob()
    const file = new File([blob], sample.name, { type: 'application/pdf' })

    const contractId = crypto.randomUUID()
    const { verifiedUserId, verifiedDealershipId } = await getVerifiedAuth()
    const filePath = `${verifiedDealershipId}/${contractId}/${file.name}`

    const { error: ie } = await supabase.from('contracts').insert({ id: contractId, dealership_id: verifiedDealershipId, uploaded_by: verifiedUserId, file_path: filePath, file_name: file.name, status: 'pending' })
    if (ie) throw new Error('Database insert failed: ' + ie.message)
    const { error: ue } = await supabase.storage.from('contracts').upload(filePath, file)
    if (ue) throw new Error('File upload failed: ' + ue.message)

    set({ step: 'render' })
    await supabase.from('contracts').update({ status: 'extracting' }).eq('id', contractId)

    const pageImages = await pdfToImages(file, (dataUrl, pageNum, total) => {
      setDemoContracts(prev => prev.map((c, i) => {
        if (i !== index) return c
        return { ...c, pages: [...c.pages, dataUrl], totalPages: total }
      }))
    })

    set({ step: 'extract' })
    const extracted = await extractContractData(pageImages)
    set({ extractedData: extracted })

    for (let f = 1; f <= DISPLAY_FIELDS.length; f++) {
      set({ visibleFields: f })
      await new Promise(r => setTimeout(r, 120))
    }

    set({ step: 'score' })
    const scores = scoreContract(extracted)
    const negotiationPoints = generateNegotiationPoints(extracted)
    set({ scores })

    const target = scores.score_deal
    await new Promise(resolve => {
      const duration = 900
      const start = performance.now()
      function tick(now) {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        set({ animatedScore: Math.round(eased * target) })
        if (progress < 1) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })

    const { error: sue } = await supabase.from('contracts').update({
      status: 'scored', vendor_name: extracted.vendor_name, service_type: extracted.service_type,
      monthly_cost: extracted.monthly_cost, term_months: extracted.term_months, auto_renewal: extracted.auto_renewal,
      escalator_pct: extracted.escalator_pct, cancellation_notice_days: extracted.cancellation_notice_days,
      early_termination_fee: extracted.early_termination_fee, data_exportable: extracted.data_exportable,
      data_ownership: extracted.data_ownership, additional_fees: extracted.additional_fees || [],
      key_clauses: extracted.key_clauses || [], extraction_raw: extracted, ...scores, negotiation_points: negotiationPoints,
    }).eq('id', contractId)
    if (sue) throw new Error('Failed to save results: ' + sue.message)

    set({ step: 'done' })

    if (index < SAMPLE_FILES.length - 1) {
      await new Promise(r => setTimeout(r, 600))
    }
  }

  const isProcessing = (mode === 'single' && step && step !== 'done' && !error) || (mode === 'demo' && !demoComplete)

  return (
    <div className="upload-overlay" onClick={isProcessing ? undefined : onClose}>
      <div className={`upload-modal ${mode === 'demo' ? 'upload-modal--wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="upload-modal-header">
          <h2>{mode === 'demo' ? 'Processing Sample Contracts' : 'Upload Contract'}</h2>
          {!isProcessing && <button className="upload-close" onClick={onClose}>&times;</button>}
        </div>

        <div className="upload-body">
          {mode === 'idle' && (
            <>
              <div
                className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="upload-dropzone-icon">&#128196;</div>
                <h3>Drop your contract here</h3>
                <p>or click to browse &middot; PDF files only</p>
              </div>
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
              <button className="btn demo-btn" onClick={startDemo}>
                Run Demo &mdash; Process Sample Contracts
              </button>
            </>
          )}

          {mode === 'single' && (step || error) && (
            <div className="upload-progress">
              {fileName && <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>{fileName}</p>}
              {SINGLE_STEPS.map(s => {
                const status = getSingleStepStatus(s.key)
                return (
                  <div key={s.key} className={`progress-step progress-step--${status}`}>
                    <div className="progress-step-icon">
                      {status === 'done' && '✓'}
                      {status === 'active' && '●'}
                      {status === 'pending' && '○'}
                      {status === 'error' && '✕'}
                    </div>
                    <span className="progress-step-label">{s.label}</span>
                  </div>
                )
              })}
              {error && <div className="progress-error-msg">{error}</div>}
            </div>
          )}

          {mode === 'demo' && (
            <div className="demo-extraction">
              {demoContracts.map((contract, i) => (
                <DemoCard key={i} contract={contract} index={i} />
              ))}
            </div>
          )}

          <div className="upload-actions">
            {((mode === 'single' && step === 'done') || (mode === 'demo' && demoComplete)) && (
              <button className="btn btn-primary" onClick={onComplete}>View Dashboard</button>
            )}
            {mode === 'single' && error && (
              <>
                <button className="btn btn-outline" onClick={onClose}>Close</button>
                <button className="btn btn-primary" onClick={() => { setMode('idle'); setStep(null); setError(null); setFileName(null) }}>Try Again</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DemoCard({ contract: c, index }) {
  if (c.step === 'waiting') {
    return (
      <div className="demo-card demo-card--waiting">
        <div className="demo-card-header">
          <span className="demo-card-number">{index + 1}</span>
          <span className="demo-card-filename">{c.fileName}</span>
        </div>
        <div className="demo-card-body-waiting">Waiting for previous contract to finish...</div>
      </div>
    )
  }

  return (
    <div className={`demo-card ${c.step === 'done' ? 'demo-card--done' : ''} ${c.step === 'error' ? 'demo-card--error' : ''}`}>
      <div className="demo-card-header">
        <span className="demo-card-number">{index + 1}</span>
        <span className="demo-card-filename">{c.fileName}</span>
      </div>

      <DemoSteps step={c.step} error={c.error} />

      <div className="demo-card-content">
        {c.pages.length > 0 && (
          <div className="demo-pages">
            <div className="demo-pages-label">
              {c.pages.length === c.totalPages
                ? `${c.totalPages} page${c.totalPages > 1 ? 's' : ''} rendered`
                : `Rendering page ${c.pages.length} of ${c.totalPages || '?'}...`}
            </div>
            <div className="demo-pages-row">
              {c.pages.map((img, pi) => (
                <img key={pi} src={img} alt={`Page ${pi + 1}`} className="demo-page-thumb" />
              ))}
            </div>
          </div>
        )}

        {c.extractedData && c.visibleFields > 0 && (
          <div className="demo-fields">
            <div className="demo-fields-label">Extracted Data</div>
            <div className="demo-fields-grid">
              {DISPLAY_FIELDS.slice(0, c.visibleFields).map(field => (
                <div key={field.key} className="demo-field">
                  <span className="demo-field-key">{field.label}</span>
                  <span className="demo-field-val">{formatFieldValue(c.extractedData[field.key], field.format)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {c.animatedScore != null && (
          <div className="demo-score-row">
            <div className="demo-score-num" style={{ color: getScoreColor(c.scores?.score_deal) }}>
              {c.animatedScore}
            </div>
            <div className="demo-score-info">
              {c.step === 'done' && (
                <span className="demo-score-verdict" style={{ color: getScoreColor(c.scores?.score_deal) }}>
                  {getScoreLabel(c.scores?.score_deal)}
                </span>
              )}
              <span className="demo-score-tag">Deal Score</span>
            </div>
          </div>
        )}
      </div>

      {c.error && <div className="progress-error-msg" style={{ marginTop: 12 }}>{c.error}</div>}
    </div>
  )
}

function DemoSteps({ step, error }) {
  return (
    <div className="demo-steps">
      {DEMO_STEPS.map((s, i) => {
        const si = DEMO_STEPS.findIndex(d => d.key === step)
        const ti = DEMO_STEPS.findIndex(d => d.key === s.key)
        let status = 'pending'
        if (error && ti === si) status = 'error'
        else if (ti < si) status = 'done'
        else if (ti === si) status = 'active'

        return (
          <div key={s.key} className={`demo-step demo-step--${status}`}>
            <div className="demo-step-dot">
              {status === 'done' && '✓'}
              {status === 'active' && '●'}
              {status === 'error' && '✕'}
            </div>
            <span className="demo-step-text">{s.label}</span>
            {i < DEMO_STEPS.length - 1 && <div className="demo-step-line" />}
          </div>
        )
      })}
    </div>
  )
}
