import { useState, useEffect, useMemo, useRef } from 'react'
import { getVendorInitials, getVendorColor, formatCurrency, formatDate, formatTime, ScoreBadge, StatusBadge } from '../../lib/ui-utils'

const ITEMS_PER_PAGE = 10

export default function ContractsPage({ contracts, loading, onSelectContract, onUpload, initialVendorFilter, onClearVendorFilter }) {
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVendor, setFilterVendor] = useState(initialVendorFilter || '')
  const [filterServiceType, setFilterServiceType] = useState('')
  const [filterScoreRange, setFilterScoreRange] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (initialVendorFilter) setFilterVendor(initialVendorFilter)
  }, [initialVendorFilter])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

  const uniqueVendors = useMemo(() => [...new Set(contracts.map(c => c.vendor_name).filter(Boolean))].sort(), [contracts])
  const uniqueServiceTypes = useMemo(() => [...new Set(contracts.map(c => c.service_type).filter(Boolean))].sort(), [contracts])

  function resetFilters() {
    setSearchQuery(''); setFilterVendor(''); setFilterServiceType(''); setFilterScoreRange(''); setFilterTerm('')
    if (onClearVendorFilter) onClearVendorFilter()
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
    a.href = url; a.download = 'contracts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function toggleAll(checked) {
    if (checked) setSelectedRows(new Set(paginated.map(c => c.id)))
    else setSelectedRows(new Set())
  }

  function toggleRow(id) {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (loading) return <div className="loading-screen" style={{ height: 300 }}><span className="spinner" /></div>

  function SortArrow({ field }) {
    const active = sortField === field
    return <span className={`sort-arrow ${active ? 'active' : ''}`}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Contracts</h1>
          <p className="dashboard-subtitle">Manage and review all vendor contracts</p>
        </div>
        <button className="btn btn-primary" onClick={onUpload}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 10v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3" />
            <polyline points="5 5 8 2 11 5" /><line x1="8" y1="2" x2="8" y2="10" />
          </svg>
          Upload Contract
        </button>
      </div>

      <div className="contracts-section">
        <div className="contracts-section-header">
          <h2>All Contracts <span className="contracts-count">({sorted.length})</span></h2>
          <div className="contracts-filter-bar">
            <div className="filter-search">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
              </svg>
              <input type="text" placeholder="Search contracts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l12 12M13 1L1 13" /></svg>
              Reset
            </button>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v3H2V9" /><polyline points="4 5 7 8 10 5" /><line x1="7" y1="8" x2="7" y2="1" />
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
                      <input type="checkbox" checked={paginated.length > 0 && paginated.every(c => selectedRows.has(c.id))} onChange={e => toggleAll(e.target.checked)} />
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
                        <div className="vendor-avatar" style={{ background: getVendorColor(c.vendor_name) }}>{getVendorInitials(c.vendor_name)}</div>
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
                            <circle cx="7" cy="7" r="3" /><path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
                          </svg>
                          View
                        </button>
                        <div className="action-menu-wrap" ref={openMenuId === c.id ? menuRef : null}>
                          <button className="btn-dots" onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
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
              <div className="table-footer-info">Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sorted.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} of {sorted.length} contracts</div>
              <div className="pagination">
                <button className="page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 3L4 7l4 4" /></svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`page-btn${currentPage === p ? ' active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
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
