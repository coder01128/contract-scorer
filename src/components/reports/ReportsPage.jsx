import { useMemo } from 'react'
import { getScoreColor, getScoreLabel } from '../../lib/scoring'
import { getVendorInitials, getVendorColor, formatCurrency, formatDate } from '../../lib/ui-utils'

export default function ReportsPage({ contracts, loading }) {
  const scored = useMemo(() =>
    contracts.filter(c => c.status === 'scored' && c.score_deal != null)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  , [contracts])

  if (loading) return <div className="loading-screen" style={{ height: 300 }}><span className="spinner" /></div>

  function handlePrint() {
    window.print()
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Reports</h1>
          <p className="dashboard-subtitle">{scored.length} scored contract{scored.length !== 1 ? 's' : ''}</p>
        </div>
        {scored.length > 0 && (
          <button className="btn btn-primary" onClick={handlePrint}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 6 4 1 12 1 12 6" />
              <rect x="2" y="6" width="12" height="6" rx="1" />
              <rect x="4" y="10" width="8" height="5" rx="0.5" />
            </svg>
            Print Report
          </button>
        )}
      </div>

      {scored.length === 0 ? (
        <div className="contracts-section">
          <div className="empty-state">
            <div className="empty-state-icon">&#128203;</div>
            <h3>No reports available</h3>
            <p>Score contracts to generate reports.</p>
          </div>
        </div>
      ) : (
        <div className="report-list">
          {scored.map(c => {
            const points = Array.isArray(c.negotiation_points) ? c.negotiation_points.slice(0, 3) : []
            return (
              <div key={c.id} className="report-card">
                <div className="report-card-header">
                  <div className="report-card-vendor">
                    <div className="vendor-avatar" style={{ background: getVendorColor(c.vendor_name) }}>
                      {getVendorInitials(c.vendor_name)}
                    </div>
                    <div>
                      <h3>{c.vendor_name}</h3>
                      <span className="report-card-meta">{c.service_type} &middot; {formatDate(c.created_at)}</span>
                    </div>
                  </div>
                  <div className="report-card-score" style={{ color: getScoreColor(c.score_deal) }}>
                    <span className="report-card-score-num">{c.score_deal}</span>
                    <span className="report-card-score-label">{getScoreLabel(c.score_deal)}</span>
                  </div>
                </div>

                <div className="report-card-scores">
                  <div className="report-score-item">
                    <span className="report-score-label">Pricing (40%)</span>
                    <div className="report-score-bar-track">
                      <div className="report-score-bar-fill" style={{ width: `${c.score_pricing}%`, background: getScoreColor(c.score_pricing) }} />
                    </div>
                    <span className="report-score-val">{c.score_pricing}</span>
                  </div>
                  <div className="report-score-item">
                    <span className="report-score-label">Terms (30%)</span>
                    <div className="report-score-bar-track">
                      <div className="report-score-bar-fill" style={{ width: `${c.score_terms}%`, background: getScoreColor(c.score_terms) }} />
                    </div>
                    <span className="report-score-val">{c.score_terms}</span>
                  </div>
                  <div className="report-score-item">
                    <span className="report-score-label">Flexibility (30%)</span>
                    <div className="report-score-bar-track">
                      <div className="report-score-bar-fill" style={{ width: `${c.score_flexibility}%`, background: getScoreColor(c.score_flexibility) }} />
                    </div>
                    <span className="report-score-val">{c.score_flexibility}</span>
                  </div>
                </div>

                <div className="report-card-details">
                  <span>Monthly: {formatCurrency(c.monthly_cost)}</span>
                  <span>Term: {c.term_months != null ? `${c.term_months} mo` : '—'}</span>
                  <span>Auto-Renew: {c.auto_renewal === true ? 'Yes' : c.auto_renewal === false ? 'No' : '—'}</span>
                </div>

                {points.length > 0 && (
                  <div className="report-card-points">
                    <h4>Top Negotiation Points</h4>
                    <ol>
                      {points.map((p, i) => <li key={i}>{p}</li>)}
                    </ol>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
