import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { pdfToImages, extractContractData } from '../../lib/anthropic'
import { scoreContract, generateNegotiationPoints } from '../../lib/scoring'

const STEPS = [
  { key: 'upload', label: 'Uploading document' },
  { key: 'extract', label: 'AI extracting contract data' },
  { key: 'score', label: 'Scoring and analyzing' },
  { key: 'done', label: 'Complete' },
]

export default function UploadFlow({ dealership, userId, onClose, onComplete }) {
  const [step, setStep] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState(null)
  const fileRef = useRef(null)

  function getStepStatus(stepKey) {
    if (!step) return 'pending'
    const currentIdx = STEPS.findIndex(s => s.key === step)
    const thisIdx = STEPS.findIndex(s => s.key === stepKey)
    if (error && thisIdx === currentIdx) return 'error'
    if (thisIdx < currentIdx) return 'done'
    if (thisIdx === currentIdx) return 'active'
    return 'pending'
  }

  async function processFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }

    setFileName(file.name)
    setError(null)
    const contractId = crypto.randomUUID()
    const filePath = `${dealership.id}/${contractId}/${file.name}`

    try {
      setStep('upload')

      const { error: insertError } = await supabase
        .from('contracts')
        .insert({
          id: contractId,
          dealership_id: dealership.id,
          uploaded_by: userId,
          file_path: filePath,
          file_name: file.name,
          status: 'pending',
        })
      if (insertError) throw new Error('Database insert failed: ' + insertError.message)

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, file)
      if (uploadError) throw new Error('File upload failed: ' + uploadError.message)

      setStep('extract')

      await supabase
        .from('contracts')
        .update({ status: 'extracting' })
        .eq('id', contractId)

      const pageImages = await pdfToImages(file)
      const extracted = await extractContractData(pageImages)

      setStep('score')

      const scores = scoreContract(extracted)
      const negotiationPoints = generateNegotiationPoints(extracted)

      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          status: 'scored',
          vendor_name: extracted.vendor_name,
          service_type: extracted.service_type,
          monthly_cost: extracted.monthly_cost,
          term_months: extracted.term_months,
          auto_renewal: extracted.auto_renewal,
          escalator_pct: extracted.escalator_pct,
          cancellation_notice_days: extracted.cancellation_notice_days,
          early_termination_fee: extracted.early_termination_fee,
          data_exportable: extracted.data_exportable,
          data_ownership: extracted.data_ownership,
          additional_fees: extracted.additional_fees || [],
          key_clauses: extracted.key_clauses || [],
          extraction_raw: extracted,
          ...scores,
          negotiation_points: negotiationPoints,
        })
        .eq('id', contractId)

      if (updateError) throw new Error('Failed to save results: ' + updateError.message)

      setStep('done')
    } catch (err) {
      setError(err.message || 'An unexpected error occurred')

      await supabase
        .from('contracts')
        .update({ status: 'failed' })
        .eq('id', contractId)
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

  const isProcessing = step && step !== 'done' && !error

  return (
    <div className="upload-overlay" onClick={isProcessing ? undefined : onClose}>
      <div className="upload-modal" onClick={e => e.stopPropagation()}>
        <div className="upload-modal-header">
          <h2>Upload Contract</h2>
          {!isProcessing && (
            <button className="upload-close" onClick={onClose}>&times;</button>
          )}
        </div>

        <div className="upload-body">
          {!step && !error && (
            <>
              <div
                className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="upload-dropzone-icon">&#128196;</div>
                <h3>Drop your contract here</h3>
                <p>or click to browse &middot; PDF files only</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </>
          )}

          {(step || error) && (
            <div className="upload-progress">
              {fileName && (
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
                  {fileName}
                </p>
              )}
              {STEPS.map(s => {
                const status = getStepStatus(s.key)
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

              {error && (
                <div className="progress-error-msg">{error}</div>
              )}
            </div>
          )}

          <div className="upload-actions">
            {step === 'done' && (
              <button className="btn btn-primary" onClick={onComplete}>
                View Dashboard
              </button>
            )}
            {error && (
              <>
                <button className="btn btn-outline" onClick={onClose}>Close</button>
                <button className="btn btn-primary" onClick={() => { setStep(null); setError(null); setFileName(null) }}>
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
