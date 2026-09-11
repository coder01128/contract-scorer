import { useMemo } from 'react'
import { getScoreColor } from '../../lib/scoring'

export default function AnalyticsPage({ contracts, loading }) {
  const scored = useMemo(() => contracts.filter(c => c.status === 'scored' && c.score_deal != null), [contracts])

  if (loading) return <div className="loading-screen" style={{ height: 300 }}><span className="spinner" /></div>

  const scoreDist = useMemo(() => {
    const buckets = [
      { label: '0–19', min: 0, max: 19, count: 0 },
      { label: '20–39', min: 20, max: 39, count: 0 },
      { label: '40–59', min: 40, max: 59, count: 0 },
      { label: '60–79', min: 60, max: 79, count: 0 },
      { label: '80–100', min: 80, max: 100, count: 0 },
    ]
    scored.forEach(c => {
      const b = buckets.find(b => c.score_deal >= b.min && c.score_deal <= b.max)
      if (b) b.count++
    })
    return buckets
  }, [scored])

  const avgByService = useMemo(() => {
    const map = {}
    scored.forEach(c => {
      const st = c.service_type || 'Unknown'
      if (!map[st]) map[st] = { total: 0, sum: 0 }
      map[st].total += c.monthly_cost || 0
      map[st].sum++
    })
    return Object.entries(map).map(([name, { total, sum }]) => ({ name, avg: sum > 0 ? total / sum : 0 }))
      .sort((a, b) => b.avg - a.avg).slice(0, 8)
  }, [scored])

  const avgScoreByVendor = useMemo(() => {
    const map = {}
    scored.forEach(c => {
      const v = c.vendor_name || 'Unknown'
      if (!map[v]) map[v] = { totalScore: 0, count: 0 }
      map[v].totalScore += c.score_deal
      map[v].count++
    })
    return Object.entries(map).map(([name, { totalScore, count }]) => ({ name, avg: Math.round(totalScore / count) }))
      .sort((a, b) => b.avg - a.avg).slice(0, 8)
  }, [scored])

  const scatterData = useMemo(() =>
    scored.filter(c => c.monthly_cost != null).map(c => ({ cost: c.monthly_cost, score: c.score_deal, vendor: c.vendor_name }))
  , [scored])

  const maxDist = Math.max(...scoreDist.map(b => b.count), 1)
  const maxCost = Math.max(...avgByService.map(r => r.avg), 1)
  const maxVScore = Math.max(...avgScoreByVendor.map(r => r.avg), 1)
  const maxScatterCost = Math.max(...scatterData.map(d => d.cost), 1)

  function truncName(n, max = 14) {
    return n.length > max ? n.slice(0, max - 1) + '…' : n
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Analytics</h1>
          <p className="dashboard-subtitle">Visual insights across {scored.length} scored contracts</p>
        </div>
      </div>

      {scored.length === 0 ? (
        <div className="contracts-section">
          <div className="empty-state">
            <div className="empty-state-icon">&#128200;</div>
            <h3>No scored contracts</h3>
            <p>Upload and score contracts to see analytics.</p>
          </div>
        </div>
      ) : (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3 className="analytics-card-title">Score Distribution</h3>
            <svg viewBox="0 0 320 200" className="analytics-chart">
              {scoreDist.map((b, i) => {
                const barW = 40
                const gap = 24
                const x = 20 + i * (barW + gap)
                const maxH = 140
                const h = maxDist > 0 ? (b.count / maxDist) * maxH : 0
                const color = getScoreColor(b.min + 10)
                return (
                  <g key={i}>
                    <rect x={x} y={160 - h} width={barW} height={h} rx={4} fill={color} opacity={0.85} />
                    {b.count > 0 && <text x={x + barW / 2} y={155 - h} textAnchor="middle" className="chart-value">{b.count}</text>}
                    <text x={x + barW / 2} y={180} textAnchor="middle" className="chart-label">{b.label}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="analytics-card">
            <h3 className="analytics-card-title">Avg Cost by Service Type</h3>
            <svg viewBox={`0 0 320 ${Math.max(avgByService.length * 36 + 20, 80)}`} className="analytics-chart">
              {avgByService.map((r, i) => {
                const y = 10 + i * 36
                const maxW = 180
                const w = maxCost > 0 ? (r.avg / maxCost) * maxW : 0
                return (
                  <g key={i}>
                    <text x={0} y={y + 16} className="chart-label-left">{truncName(r.name)}</text>
                    <rect x={120} y={y + 2} width={w} height={20} rx={4} fill="#3b82f6" opacity={0.8} />
                    <text x={125 + w} y={y + 16} className="chart-value">${Math.round(r.avg).toLocaleString()}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="analytics-card">
            <h3 className="analytics-card-title">Avg Score by Vendor</h3>
            <svg viewBox={`0 0 320 ${Math.max(avgScoreByVendor.length * 36 + 20, 80)}`} className="analytics-chart">
              {avgScoreByVendor.map((r, i) => {
                const y = 10 + i * 36
                const maxW = 180
                const w = maxVScore > 0 ? (r.avg / maxVScore) * maxW : 0
                const color = getScoreColor(r.avg)
                return (
                  <g key={i}>
                    <text x={0} y={y + 16} className="chart-label-left">{truncName(r.name)}</text>
                    <rect x={120} y={y + 2} width={w} height={20} rx={4} fill={color} opacity={0.8} />
                    <text x={125 + w} y={y + 16} className="chart-value">{r.avg}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="analytics-card">
            <h3 className="analytics-card-title">Cost vs Score</h3>
            <svg viewBox="0 0 320 220" className="analytics-chart">
              <line x1="40" y1="10" x2="40" y2="180" stroke="var(--color-border)" strokeWidth="1" />
              <line x1="40" y1="180" x2="310" y2="180" stroke="var(--color-border)" strokeWidth="1" />
              <text x="20" y="100" textAnchor="middle" className="chart-axis-label" transform="rotate(-90 20 100)">Score</text>
              <text x={175} y={200} textAnchor="middle" className="chart-axis-label">Monthly Cost</text>
              <text x={38} y={18} textAnchor="end" className="chart-tick">100</text>
              <text x={38} y={95} textAnchor="end" className="chart-tick">50</text>
              <text x={38} y={178} textAnchor="end" className="chart-tick">0</text>
              {scatterData.map((d, i) => {
                const x = 40 + (d.cost / maxScatterCost) * 260
                const y = 180 - (d.score / 100) * 170
                return <circle key={i} cx={x} cy={y} r={5} fill={getScoreColor(d.score)} opacity={0.7} />
              })}
            </svg>
          </div>
        </div>
      )}
    </>
  )
}
