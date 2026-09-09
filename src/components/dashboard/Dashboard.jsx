import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { getScoreColor, getScoreLabel } from '../../lib/scoring'

function ScoreBadge({ score }) {
  if (score == null) return null
  const label = getScoreLabel(score)
  let cls = 'score-badge '
  if (score >= 80) cls += 'score-badge--strong'
  else if (score >= 60) cls += 'score-badge--acceptable'
  else if (score >= 40) cls += 'score-badge--weak'
  else cls += 'score-badge--bad'

  return <span className={cls}>{score} — {label}</span>
}

function StatusBadge({ status }) {
  const labels = {
    pending: 'Awaiting Extraction',
    extracting: 'Extracting...',
    failed: 'Extraction Failed',
  }
  return (
    <span className={`status-badge status-badge--${status}`}>
      {labels[status] || status}
    </span>
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

export default function Dashboard({ onSelectContract }) {
  const [contracts, setContracts] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [contractsRes, summaryRes] = await Promise.all([
        supabase
          .from('contracts')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.rpc('get_dashboard_summary'),
      ])

      if (contractsRes.error) throw contractsRes.error
      if (summaryRes.error) throw summaryRes.error

      setContracts(contractsRes.data || [])
      const s = summaryRes.data
      setSummary(Array.isArray(s) ? s[0] : s)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const copy = [...contracts]
    copy.sort((a, b) => {
      let av = a[sortField]
      let bv = b[sortField]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [contracts, sortField, sortDir])

  if (loading) {
    return (
      <div className="loading-screen" style={{ height: 300 }}>
        <span className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-message">
        Failed to load dashboard: {error}
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }} onClick={loadData}>
          Retry
        </button>
      </div>
    )
  }

  const scoredCount = summary?.total_contracts ?? 0

  function SortArrow({ field }) {
    const active = sortField === field
    return (
      <span className={`sort-arrow ${active ? 'active' : ''}`}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '▽'}
      </span>
    )
  }

  return (
    <>
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-label">Contracts Analyzed</div>
          <div className="summary-card-value">{scoredCount}</div>
          <div className="summary-card-sub">{contracts.length} total uploaded</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Average Deal Score</div>
          <div className="summary-card-value" style={{ color: getScoreColor(summary?.avg_score) }}>
            {scoredCount > 0 ? summary.avg_score : '—'}
          </div>
          {scoredCount > 0 && (
            <div className="summary-card-sub">{getScoreLabel(summary.avg_score)}</div>
          )}
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Needs Attention</div>
          {scoredCount > 0 && summary.worst_contract_vendor ? (
            <>
              <div className="summary-card-value" style={{ fontSize: 18, color: getScoreColor(summary.worst_score) }}>
                {summary.worst_contract_vendor}
              </div>
              <div className="summary-card-sub">
                Score: {summary.worst_score} — {getScoreLabel(summary.worst_score)}
              </div>
            </>
          ) : (
            <div className="summary-card-value" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>
              No scored contracts yet
            </div>
          )}
        </div>

        <div className="summary-card summary-card--placeholder">
          <div className="lock-icon">&#128274;</div>
          <div className="summary-card-label">Market Comparison</div>
          <div className="summary-card-value">
            Upload 3+ contracts in the same service category to unlock comparison
          </div>
        </div>
      </div>

      <div className="contracts-section">
        <div className="contracts-section-header">
          <h2>Contracts</h2>
          <span className="text-muted text-sm">{contracts.length} total</span>
        </div>

        {contracts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128196;</div>
            <h3>No contracts yet</h3>
            <p>Upload a vendor contract or run the demo to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="contract-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('vendor_name')}>
                    Vendor <SortArrow field="vendor_name" />
                  </th>
                  <th onClick={() => handleSort('service_type')}>
                    Service Type <SortArrow field="service_type" />
                  </th>
                  <th onClick={() => handleSort('score_deal')}>
                    Deal Score <SortArrow field="score_deal" />
                  </th>
                  <th onClick={() => handleSort('monthly_cost')}>
                    Monthly Cost <SortArrow field="monthly_cost" />
                  </th>
                  <th onClick={() => handleSort('term_months')}>
                    Term <SortArrow field="term_months" />
                  </th>
                  <th onClick={() => handleSort('created_at')}>
                    Uploaded <SortArrow field="created_at" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(c => (
                  <tr
                    key={c.id}
                    className="clickable"
                    onClick={() => onSelectContract(c)}
                  >
                    <td className="vendor-name">
                      {c.vendor_name || c.file_name}
                    </td>
                    <td className="service-type">
                      {c.service_type || '—'}
                    </td>
                    <td>
                      {c.status === 'scored' ? (
                        <ScoreBadge score={c.score_deal} />
                      ) : (
                        <StatusBadge status={c.status} />
                      )}
                    </td>
                    <td className="cost">
                      {c.status === 'scored' ? formatCurrency(c.monthly_cost) : '—'}
                    </td>
                    <td>
                      {c.term_months != null ? `${c.term_months} mo` : '—'}
                    </td>
                    <td className="text-muted">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
