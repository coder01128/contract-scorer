import { useMemo } from 'react'
import { getScoreColor, getScoreLabel } from '../../lib/scoring'
import { getVendorInitials, getVendorColor, formatDate, ScoreBadge, StatusBadge } from '../../lib/ui-utils'

export default function Dashboard({ contracts, summary, loading, error, onSelectContract, onUpload, onRetry }) {
  const trends = useMemo(() => {
    const now = new Date()
    const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const d14 = new Date(now - 14 * 24 * 60 * 60 * 1000)
    const thisWeek = contracts.filter(c => new Date(c.created_at) >= d7)
    const lastWeek = contracts.filter(c => { const d = new Date(c.created_at); return d >= d14 && d < d7 })
    const countChange = lastWeek.length === 0 ? (thisWeek.length > 0 ? 100 : 0)
      : Math.round((thisWeek.length - lastWeek.length) / lastWeek.length * 100)
    const scoredThis = thisWeek.filter(c => c.score_deal != null)
    const scoredLast = lastWeek.filter(c => c.score_deal != null)
    const avgThis = scoredThis.length > 0 ? scoredThis.reduce((s, c) => s + c.score_deal, 0) / scoredThis.length : null
    const avgLast = scoredLast.length > 0 ? scoredLast.reduce((s, c) => s + c.score_deal, 0) / scoredLast.length : null
    const scoreChange = avgLast != null && avgThis != null ? Math.round((avgThis - avgLast) / avgLast * 100) : null
    const attThis = thisWeek.filter(c => c.score_deal != null && c.score_deal < 40).length
    const attLast = lastWeek.filter(c => c.score_deal != null && c.score_deal < 40).length
    return { countChange, scoreChange, attentionChange: attThis - attLast }
  }, [contracts])

  const dateRange = useMemo(() => {
    if (contracts.length === 0) return null
    const dates = contracts.map(c => new Date(c.created_at))
    const min = new Date(Math.min(...dates))
    const max = new Date(Math.max(...dates))
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${fmt(min)} – ${fmt(max)}`
  }, [contracts])

  const recentContracts = useMemo(() => contracts.slice(0, 5), [contracts])

  const scoreDist = useMemo(() => {
    const scored = contracts.filter(c => c.score_deal != null)
    return {
      strong: scored.filter(c => c.score_deal >= 70).length,
      weak: scored.filter(c => c.score_deal >= 30 && c.score_deal < 70).length,
      walkAway: scored.filter(c => c.score_deal < 30).length,
      total: scored.length,
    }
  }, [contracts])

  if (loading) return <div className="loading-screen" style={{ height: 300 }}><span className="spinner" /></div>

  if (error) {
    return (
      <div className="error-message">
        Failed to load dashboard: {error}
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }} onClick={onRetry}>Retry</button>
      </div>
    )
  }

  const scoredCount = summary?.total_contracts ?? 0

  function TrendIndicator({ value, abs }) {
    if (value == null) return null
    const isUp = value > 0
    const isZero = value === 0
    return (
      <div className={`trend-indicator ${isUp ? 'trend-up' : isZero ? 'trend-neutral' : 'trend-down'}`}>
        <span className="trend-arrow">{isUp ? '↑' : isZero ? '→' : '↓'}</span>
        <span className="trend-value">{Math.abs(value)}{abs ? '' : '%'}</span>
        <span className="trend-label">vs. previous 7 days</span>
      </div>
    )
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Contract performance at a glance</p>
        </div>
        <div className="dashboard-header-right">
          {dateRange && (
            <div className="date-range-picker">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="3" width="12" height="11" rx="1.5" />
                <line x1="2" y1="7" x2="14" y2="7" />
                <line x1="5" y1="1" x2="5" y2="4" />
                <line x1="11" y1="1" x2="11" y2="4" />
              </svg>
              <span>{dateRange}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 5l3 3 3-3" /></svg>
            </div>
          )}
          <button className="btn btn-primary" onClick={onUpload}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 10v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3" />
              <polyline points="5 5 8 2 11 5" />
              <line x1="8" y1="2" x2="8" y2="10" />
            </svg>
            Upload Contract
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-card-icon summary-card-icon--blue">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z" />
                <path d="M13 2v5h5" /><line x1="8" y1="12" x2="14" y2="12" /><line x1="8" y1="16" x2="14" y2="16" />
              </svg>
            </div>
            <div className="summary-card-label">Contracts Analyzed</div>
          </div>
          <div className="summary-card-value">{scoredCount}</div>
          <div className="summary-card-sub">{contracts.length} total uploaded</div>
          <TrendIndicator value={trends.countChange} />
        </div>

        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-card-icon summary-card-icon--blue">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 11 16 11 13 19 9 3 6 11 2 11" />
              </svg>
            </div>
            <div className="summary-card-label">Average Deal Score</div>
          </div>
          <div className="summary-card-value" style={{ color: getScoreColor(summary?.avg_score) }}>
            {scoredCount > 0 ? summary.avg_score : '—'}
          </div>
          {scoredCount > 0 && <div className="summary-card-sub">{getScoreLabel(summary.avg_score)}</div>}
          <TrendIndicator value={trends.scoreChange} />
        </div>

        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-card-icon summary-card-icon--red">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="9" /><line x1="11" y1="7" x2="11" y2="11" /><circle cx="11" cy="15" r="0.5" fill="#fff" />
              </svg>
            </div>
            <div className="summary-card-label">Needs Attention</div>
          </div>
          {scoredCount > 0 && summary.worst_contract_vendor ? (
            <>
              <div className="summary-card-value summary-card-value--attention" style={{ color: getScoreColor(summary.worst_score) }}>
                {summary.worst_contract_vendor}
              </div>
              <div className="summary-card-sub">Score: {summary.worst_score} — {getScoreLabel(summary.worst_score)}</div>
            </>
          ) : (
            <div className="summary-card-value" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>No scored contracts yet</div>
          )}
          <TrendIndicator value={trends.attentionChange} abs />
        </div>

        <div className="summary-card summary-card--market">
          <div className="summary-card-top">
            <div className="summary-card-icon summary-card-icon--blue">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="12" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="12" width="7" height="7" rx="1" /><rect x="12" y="12" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div className="summary-card-label">Market Comparison</div>
          </div>
          <div className="summary-card-market-body">
            <span>Upload 3+ contracts in the same service category to unlock comparison</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round"><path d="M7 4l6 6-6 6" /></svg>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="contracts-section">
          <div className="contracts-section-header">
            <h2>Recent Contracts</h2>
          </div>
          {recentContracts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">&#128196;</div>
              <h3>No contracts yet</h3>
              <p>Upload a vendor contract or run the demo to get started.</p>
            </div>
          ) : (
            <div className="recent-list">
              {recentContracts.map(c => (
                <div key={c.id} className="recent-item" onClick={() => onSelectContract(c)}>
                  <div className="recent-item-left">
                    <div className="vendor-avatar" style={{ background: getVendorColor(c.vendor_name) }}>
                      {getVendorInitials(c.vendor_name)}
                    </div>
                    <div className="recent-item-info">
                      <div className="vendor-name">{c.vendor_name || c.file_name}</div>
                      <div className="recent-item-meta">{c.service_type || '—'}</div>
                    </div>
                  </div>
                  <div className="recent-item-right">
                    {c.status === 'scored' ? <ScoreBadge score={c.score_deal} /> : <StatusBadge status={c.status} />}
                    <span className="recent-item-date">{formatDate(c.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="contracts-section">
          <div className="contracts-section-header">
            <h2>Score Distribution</h2>
          </div>
          {scoreDist.total === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>No scored contracts yet</p>
            </div>
          ) : (
            <div className="score-dist-wrap">
              <div className="score-dist-bar">
                {scoreDist.strong > 0 && (
                  <div className="score-dist-segment score-dist-strong" style={{ flex: scoreDist.strong }}>
                    <span>{scoreDist.strong}</span>
                  </div>
                )}
                {scoreDist.weak > 0 && (
                  <div className="score-dist-segment score-dist-weak" style={{ flex: scoreDist.weak }}>
                    <span>{scoreDist.weak}</span>
                  </div>
                )}
                {scoreDist.walkAway > 0 && (
                  <div className="score-dist-segment score-dist-walkaway" style={{ flex: scoreDist.walkAway }}>
                    <span>{scoreDist.walkAway}</span>
                  </div>
                )}
              </div>
              <div className="score-dist-legend">
                <div className="score-dist-legend-item">
                  <span className="score-dist-dot" style={{ background: 'var(--color-score-strong)' }} />
                  <span>Strong (70+)</span>
                  <strong>{scoreDist.strong}</strong>
                </div>
                <div className="score-dist-legend-item">
                  <span className="score-dist-dot" style={{ background: 'var(--color-score-weak)' }} />
                  <span>Weak (30–69)</span>
                  <strong>{scoreDist.weak}</strong>
                </div>
                <div className="score-dist-legend-item">
                  <span className="score-dist-dot" style={{ background: 'var(--color-score-bad)' }} />
                  <span>Walk Away (&lt;30)</span>
                  <strong>{scoreDist.walkAway}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
