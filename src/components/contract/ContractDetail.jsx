import { supabase } from '../../lib/supabase'
import { getScoreColor, getScoreLabel } from '../../lib/scoring'

function ScoreGauge({ score, label, weight, size = 120 }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className="score-gauge-card">
      <div className="gauge-svg-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="gauge-score-text"
            fill="var(--color-text)"
          >
            {score}
          </text>
        </svg>
      </div>
      <span className="gauge-label">{label}</span>
      <span className="gauge-weight">{weight}% of Deal Score</span>
    </div>
  )
}

function formatCurrency(val) {
  if (val == null) return '—'
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ContractDetail({ contract, onBack }) {
  const c = contract
  const isScored = c.status === 'scored'

  async function handleDownload() {
    const { data, error } = await supabase.storage
      .from('contracts')
      .createSignedUrl(c.file_path, 300)

    if (error) {
      alert('Could not generate download link: ' + error.message)
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  if (!isScored) {
    const statusLabels = {
      pending: 'This contract is awaiting extraction. The AI has not yet analyzed it.',
      extracting: 'The AI is currently analyzing this contract. This may take a minute.',
      failed: 'Extraction failed for this contract. Try re-uploading it.',
    }
    return (
      <div>
        <button className="detail-back" onClick={onBack}>&#8592; Back to Dashboard</button>
        <div className="detail-section" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
            {c.status === 'failed' ? '⚠' : '📄'}
          </div>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>{c.file_name}</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            {statusLabels[c.status]}
          </p>
          {c.status === 'extracting' && (
            <div style={{ marginTop: 16 }}>
              <span className="spinner" />
            </div>
          )}
        </div>
      </div>
    )
  }

  const additionalFees = Array.isArray(c.additional_fees) ? c.additional_fees : []
  const keyClauses = Array.isArray(c.key_clauses) ? c.key_clauses : []
  const negotiationPoints = Array.isArray(c.negotiation_points) ? c.negotiation_points : []

  return (
    <div>
      <button className="detail-back" onClick={onBack}>&#8592; Back to Dashboard</button>

      <div className="detail-header-row">
        <div className="detail-title">
          <h2>{c.vendor_name}</h2>
          <span className="detail-meta">
            {c.service_type} &middot; Uploaded {formatDate(c.created_at)}
          </span>
        </div>
        <div className="deal-score-large">
          <div className="deal-score-number" style={{ color: getScoreColor(c.score_deal) }}>
            {c.score_deal}
          </div>
          <div className="deal-score-label" style={{ color: getScoreColor(c.score_deal) }}>
            {getScoreLabel(c.score_deal)}
          </div>
          <div className="deal-score-sublabel">Deal Score</div>
        </div>
      </div>

      <div className="score-gauges">
        <ScoreGauge score={c.score_pricing} label="Pricing" weight={40} />
        <ScoreGauge score={c.score_terms} label="Terms" weight={30} />
        <ScoreGauge score={c.score_flexibility} label="Flexibility" weight={30} />
      </div>

      {negotiationPoints.length > 0 && (
        <div className="negotiation-panel">
          <div className="negotiation-header">
            <span style={{ fontSize: 18 }}>&#9888;</span>
            <h3>Negotiation Opportunities</h3>
          </div>
          <ul className="negotiation-list">
            {negotiationPoints.map((point, i) => (
              <li key={i} className="negotiation-item">
                <span className="negotiation-icon">{i + 1}</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {negotiationPoints.length === 0 && (
        <div className="negotiation-panel">
          <div className="negotiation-header">
            <span style={{ fontSize: 18 }}>&#10003;</span>
            <h3>Negotiation Opportunities</h3>
          </div>
          <div className="no-negotiation-points">
            This contract scores well — no major negotiation points identified.
          </div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Extracted Contract Data</h3>
        </div>
        <div className="extracted-grid">
          <div className="extracted-item">
            <div className="extracted-item-label">Vendor</div>
            <div className="extracted-item-value">{c.vendor_name || '—'}</div>
          </div>
          <div className="extracted-item">
            <div className="extracted-item-label">Service Type</div>
            <div className="extracted-item-value">{c.service_type || '—'}</div>
          </div>
          <div className="extracted-item">
            <div className="extracted-item-label">Monthly Cost</div>
            <div className="extracted-item-value">{formatCurrency(c.monthly_cost)}</div>
          </div>
          <div className="extracted-item">
            <div className="extracted-item-label">Contract Term</div>
            <div className="extracted-item-value">
              {c.term_months != null ? `${c.term_months} months` : '—'}
            </div>
          </div>
          <div className="extracted-item">
            <div className="extracted-item-label">Auto-Renewal</div>
            <div className="extracted-item-value">
              {c.auto_renewal === true ? 'Yes' : c.auto_renewal === false ? 'No' : '—'}
            </div>
          </div>
          <div className="extracted-item">
            <div className="extracted-item-label">Price Escalator</div>
            <div className="extracted-item-value">
              {c.escalator_pct != null ? `${c.escalator_pct}% / year` : 'None'}
            </div>
          </div>
          <div className="extracted-item">
            <div className="extracted-item-label">Cancellation Notice</div>
            <div className="extracted-item-value">
              {c.cancellation_notice_days != null ? `${c.cancellation_notice_days} days` : '—'}
            </div>
          </div>
          <div className="extracted-item">
            <div className="extracted-item-label">Early Termination Fee</div>
            <div className="extracted-item-value">
              {c.early_termination_fee != null ? formatCurrency(c.early_termination_fee) : 'None'}
            </div>
          </div>
          <div className="extracted-item">
            <div className="extracted-item-label">Data Exportable</div>
            <div className="extracted-item-value">
              {c.data_exportable === true ? 'Yes' : c.data_exportable === false ? 'No' : '—'}
            </div>
          </div>
          <div className="extracted-item">
            <div className="extracted-item-label">Data Ownership</div>
            <div className="extracted-item-value" style={{ textTransform: 'capitalize' }}>
              {c.data_ownership || '—'}
            </div>
          </div>

          {additionalFees.length > 0 && (
            <div className="extracted-item extracted-item--full">
              <div className="extracted-item-label">Additional Fees</div>
              <ul className="fee-list">
                {additionalFees.map((fee, i) => (
                  <li key={i}>
                    {fee.name}
                    <span className="fee-amount">{formatCurrency(fee.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {keyClauses.length > 0 && (
            <div className="extracted-item extracted-item--full">
              <div className="extracted-item-label">Key Clauses</div>
              <ul className="clause-list">
                {keyClauses.map((clause, i) => (
                  <li key={i}>{clause}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <button className="btn btn-outline" onClick={handleDownload}>
        &#128196; View Original Document
      </button>
    </div>
  )
}
