import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { getScoreColor, getScoreLabel } from '../../lib/scoring'

function getVendorInitials(name) {
  if (!name) return '??'
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s&.]+/).filter(w => /^[A-Z]/.test(w))
  if (words.length >= 2) return words[0][0] + words[1][0]
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function getVendorColor(name) {
  if (!name) return '#94a3b8'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
  return colors[Math.abs(hash) % colors.length]
}

function ScoreBadge({ score }) {
  if (score == null) return null
  const label = getScoreLabel(score)
  let cls = 'score-badge '
  if (score >= 70) cls += 'score-badge--strong'
  else if (score >= 30) cls += 'score-badge--weak'
  else cls += 'score-badge--bad'
  return <span className={cls}>{score} — {label}</span>
}

function StatusBadge({ status }) {
  const labels = {
    pending: 'Awaiting Extraction',
    extracting: 'Extracting...',
    failed: 'Extraction Failed',
  }
  return <span className={`status-badge status-badge--${status}`}>{labels[status] || status}</span>
}

function formatCurrency(val) {
  if (val == null) return '—'
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const ITEMS_PER_PAGE = 10

export default function Dashboard({ onSelectContract }) {
  const [contracts, setContracts] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const [searchQuery, setSearchQuery] = useState('')
  const [filterVendor, setFilterVendor] = useState('')
  const [filterServiceType, setFilterServiceType] = useState('')
  const [filterScoreRange, setFilterScoreRange] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [contractsRes, summaryRes] = await Promise.all([
        supabase.from('contracts').select('*').order('created_at', { ascending: false }),
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

  const filtered = useMemo(() => {
    setCurrentPage(1)
    return contracts.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!(c.vendor_name?.toLowerCase().includes(q) || c.service_type?.toLowerCase().includes(q) || c.file_name?.toLowerCase().includes(q)))
          return false
      }
      if (filterVendor && c.vendor_name !== filterVendor) return false
      if (filterServiceType && c.service_type !== filterServiceType) return false
      if (filterScoreRange) {
        const score = c.score_deal
        if (filterScoreRange === 'strong' && (score == null || score < 70)) return false
        if (filterScoreRange === 'weak' && (score == null || score < 30 || score >= 70)) return false
        if (filterScoreRange === 'walkaway' && (score == null || score >= 30)) return false
      }
      if (filterTerm) {
        const months = c.term_months
        if (months == null) return false
        if (filterTerm === '12' && months > 12) return false
        if (filterTerm === '24' && (months <= 12 || months > 24)) return false
        if (filterTerm === '36' && (months <= 24 || months > 36)) return false
        if (filterTerm === '36+' && months <= 36) return false
      }
      return true
    })
  }, [contracts, searchQuery, filterVendor, filterServiceType, filterScoreRange, filterTerm])

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let av = a[sortField], bv = b[sortField]
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
  }, [filtered, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sorted.slice(start, start + ITEMS_PER_PAGE)
  }, [sorted, currentPage])

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
    const attentionChange = attThis - attLast
    return { countChange, scoreChange, attentionChange }
  }, [contracts])

  const dateRange = useMemo(() => {
    if (contracts.length === 0) return null
    const dates = contracts.map(c => new Date(c.created_at))
    const min = new Date(Math.min(...dates))
    const max = new Date(Math.max(...dates))
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${fmt(min)} – ${fmt(max)}`
  }, [contracts])

  const uniqueVendors = useMemo(() => [...new Set(contracts.map(c => c.vendor_name).filter(Boolean))].sort(), [contracts])
  const uniqueServiceTypes = useMemo(() => [...new Set(contracts.map(c => c.service_type).filter(Boolean))].sort(), [contracts])

  function resetFilters() {
    setSearchQuery('')
    setFilterVendor('')
    setFilterServiceType('')
    setFilterScoreRange('')
    setFilterTerm('')
  }

  function exportCSV() {
    const headers = ['Vendor', 'Service Type', 'Deal Score', 'Monthly Cost', 'Term (months)', 'Uploaded']
    const rows = sorted.map(c => [
      c.vendor_name || '', c.service_type || '', c.score_deal ?? '', c.monthly_cost ?? '',
      c.term_months ?? '', c.created_at ? new Date(c.created_at).toLocaleDateString() : ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contracts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleAll(checked) {
    if (checked) setSelectedRows(new Set(paginated.map(c => c.id)))
    else setSelectedRows(new Set())
  }

  function toggleRow(id) {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return <div className="loading-screen" style={{ height: 300 }}><span className="spinner" /></div>
  }

  if (error) {
    return (
      <div className="error-message">
        Failed to load dashboard: {error}
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }} onClick={loadData}>Retry</button>
      </div>
    )
  }

  const scoredCount = summary?.total_contracts ?? 0

  function SortArrow({ field }) {
    const active = sortField === field
    return <span className={`sort-arrow ${active ? 'active' : ''}`}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  }

  function TrendIndicator({ value, suffix = 'vs. previous 7 days' }) {
    if (value == null) return null
    const isUp = value > 0
    const isZero = value === 0
    return (
      <div className={`trend-indicator ${isUp ? 'trend-up' : isZero ? 'trend-neutral' : 'trend-down'}`}>
        <span className="trend-arrow">{isUp ? '↑' : isZero ? '→' : '↓'}</span>
        <span className="trend-value">{Math.abs(value)}{typeof value === 'number' && !Number.isInteger(value) ? '' : value > 1000 ? '' : '%'}</span>
        <span className="trend-label">{suffix}</span>
      </div>
    )
  }

  function TrendIndicatorAbs({ value, suffix = 'vs. previous 7 days' }) {
    if (value == null) return null
    const isUp = value > 0
    const isZero = value === 0
    return (
      <div className={`trend-indicator ${isUp ? 'trend-up' : isZero ? 'trend-neutral' : 'trend-down'}`}>
        <span className="trend-arrow">{isUp ? '↑' : isZero ? '→' : '↓'}</span>
        <span className="trend-value">{Math.abs(value)}</span>
        <span className="trend-label">{suffix}</span>
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
        {dateRange && (
          <div className="date-range-picker">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="3" width="12" height="11" rx="1.5" />
              <line x1="2" y1="7" x2="14" y2="7" />
              <line x1="5" y1="1" x2="5" y2="4" />
              <line x1="11" y1="1" x2="11" y2="4" />
            </svg>
            <span>{dateRange}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 5l3 3 3-3" />
            </svg>
          </div>
        )}
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-card-icon summary-card-icon--blue">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z" />
                <path d="M13 2v5h5" />
                <line x1="8" y1="12" x2="14" y2="12" />
                <line x1="8" y1="16" x2="14" y2="16" />
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
                <circle cx="11" cy="11" r="9" />
                <line x1="11" y1="7" x2="11" y2="11" />
                <circle cx="11" cy="15" r="0.5" fill="#fff" />
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
            <div className="summary-card-value" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>
              No scored contracts yet
            </div>
          )}
          <TrendIndicatorAbs value={trends.attentionChange} />
        </div>

        <div className="summary-card summary-card--market">
          <div className="summary-card-top">
            <div className="summary-card-icon summary-card-icon--blue">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="12" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="12" width="7" height="7" rx="1" />
                <rect x="12" y="12" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div className="summary-card-label">Market Comparison</div>
          </div>
          <div className="summary-card-market-body">
            <span>Upload 3+ contracts in the same service category to unlock comparison</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M7 4l6 6-6 6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="contracts-section">
        <div className="contracts-section-header">
          <h2>Contracts <span className="contracts-count">({sorted.length})</span></h2>
          <div className="contracts-filter-bar">
            <div className="filter-search">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="4.5" />
                <line x1="10.5" y1="10.5" x2="14" y2="14" />
              </svg>
              <input
                type="text"
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} className="filter-select">
              <option value="">All Vendors</option>
              {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={filterServiceType} onChange={e => setFilterServiceType(e.target.value)} className="filter-select">
              <option value="">All Service Types</option>
              {uniqueServiceTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterScoreRange} onChange={e => setFilterScoreRange(e.target.value)} className="filter-select">
              <option value="">All Score Ranges</option>
              <option value="strong">Strong (70+)</option>
              <option value="weak">Weak (30–69)</option>
              <option value="walkaway">Walk Away (&lt;30)</option>
            </select>
            <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="filter-select">
              <option value="">All Terms</option>
              <option value="12">≤ 12 mo</option>
              <option value="24">13–24 mo</option>
              <option value="36">25–36 mo</option>
              <option value="36+">36+ mo</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
              Reset
            </button>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v3H2V9" />
                <polyline points="4 5 7 8 10 5" />
                <line x1="7" y1="8" x2="7" y2="1" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {contracts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128196;</div>
            <h3>No contracts yet</h3>
            <p>Upload a vendor contract or run the demo to get started.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="contract-table">
                <thead>
                  <tr>
                    <th className="col-checkbox">
                      <input
                        type="checkbox"
                        checked={paginated.length > 0 && paginated.every(c => selectedRows.has(c.id))}
                        onChange={e => toggleAll(e.target.checked)}
                      />
                    </th>
                    <th onClick={() => handleSort('vendor_name')}>Vendor <SortArrow field="vendor_name" /></th>
                    <th onClick={() => handleSort('service_type')}>Service Type <SortArrow field="service_type" /></th>
                    <th onClick={() => handleSort('score_deal')}>Deal Score <SortArrow field="score_deal" /></th>
                    <th onClick={() => handleSort('monthly_cost')}>Monthly Cost <SortArrow field="monthly_cost" /></th>
                    <th onClick={() => handleSort('term_months')}>Term <SortArrow field="term_months" /></th>
                    <th onClick={() => handleSort('created_at')}>Uploaded <SortArrow field="created_at" /></th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(c => (
                    <tr key={c.id} className="clickable" onClick={() => onSelectContract(c)}>
                      <td className="col-checkbox" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedRows.has(c.id)} onChange={() => toggleRow(c.id)} />
                      </td>
                      <td className="vendor-cell">
                        <div className="vendor-avatar" style={{ background: getVendorColor(c.vendor_name) }}>
                          {getVendorInitials(c.vendor_name)}
                        </div>
                        <span className="vendor-name">{c.vendor_name || c.file_name}</span>
                      </td>
                      <td className="service-type">{c.service_type || '—'}</td>
                      <td>{c.status === 'scored' ? <ScoreBadge score={c.score_deal} /> : <StatusBadge status={c.status} />}</td>
                      <td className="cost">{c.status === 'scored' ? formatCurrency(c.monthly_cost) : '—'}</td>
                      <td>{c.term_months != null ? `${c.term_months} mo` : '—'}</td>
                      <td className="uploaded-cell">
                        <div>{formatDate(c.created_at)}</div>
                        <div className="uploaded-time">{formatTime(c.created_at)}</div>
                      </td>
                      <td className="col-actions" onClick={e => e.stopPropagation()}>
                        <button className="btn-view" onClick={() => onSelectContract(c)}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <circle cx="7" cy="7" r="3" />
                            <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
                          </svg>
                          View
                        </button>
                        <div className="action-menu-wrap" ref={openMenuId === c.id ? menuRef : null}>
                          <button className="btn-dots" onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="8" cy="3" r="1.5" />
                              <circle cx="8" cy="8" r="1.5" />
                              <circle cx="8" cy="13" r="1.5" />
                            </svg>
                          </button>
                          {openMenuId === c.id && (
                            <div className="action-dropdown">
                              <button onClick={() => { onSelectContract(c); setOpenMenuId(null) }}>View Details</button>
                              <button onClick={() => setOpenMenuId(null)}>Download PDF</button>
                              <button className="action-danger" onClick={() => setOpenMenuId(null)}>Delete</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <div className="table-footer-info">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sorted.length)} of {sorted.length} contracts
              </div>
              <div className="pagination">
                <button className="page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 3L4 7l4 4" /></svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`page-btn${currentPage === p ? ' active' : ''}`} onClick={() => setCurrentPage(p)}>
                    {p}
                  </button>
                ))}
                <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 3l4 4-4 4" /></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
