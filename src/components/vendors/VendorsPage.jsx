import { useMemo } from 'react'
import { getVendorInitials, getVendorColor, formatCurrency } from '../../lib/ui-utils'

export default function VendorsPage({ contracts, loading, onSelectVendor }) {
  const vendors = useMemo(() => {
    const map = {}
    contracts.forEach(c => {
      const name = c.vendor_name || 'Unknown'
      if (!map[name]) map[name] = { name, contracts: 0, totalScore: 0, scoredCount: 0, totalSpend: 0 }
      map[name].contracts++
      if (c.score_deal != null) {
        map[name].totalScore += c.score_deal
        map[name].scoredCount++
      }
      if (c.monthly_cost != null) map[name].totalSpend += c.monthly_cost
    })
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [contracts])

  if (loading) return <div className="loading-screen" style={{ height: 300 }}><span className="spinner" /></div>

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Vendors</h1>
          <p className="dashboard-subtitle">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} across all contracts</p>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div className="contracts-section">
          <div className="empty-state">
            <div className="empty-state-icon">&#128101;</div>
            <h3>No vendors yet</h3>
            <p>Upload contracts to see your vendor roster.</p>
          </div>
        </div>
      ) : (
        <div className="vendor-grid">
          {vendors.map(v => {
            const avgScore = v.scoredCount > 0 ? Math.round(v.totalScore / v.scoredCount) : null
            return (
              <div key={v.name} className="vendor-card" onClick={() => onSelectVendor(v.name)}>
                <div className="vendor-card-avatar" style={{ background: getVendorColor(v.name) }}>
                  {getVendorInitials(v.name)}
                </div>
                <h3 className="vendor-card-name">{v.name}</h3>
                <div className="vendor-card-stats">
                  <div className="vendor-card-stat">
                    <span className="vendor-card-stat-value">{v.contracts}</span>
                    <span className="vendor-card-stat-label">Contracts</span>
                  </div>
                  <div className="vendor-card-stat">
                    <span className="vendor-card-stat-value">{avgScore != null ? avgScore : '—'}</span>
                    <span className="vendor-card-stat-label">Avg Score</span>
                  </div>
                  <div className="vendor-card-stat">
                    <span className="vendor-card-stat-value">{formatCurrency(v.totalSpend)}</span>
                    <span className="vendor-card-stat-label">Total Spend</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
