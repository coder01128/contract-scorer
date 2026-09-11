import { getScoreLabel } from './scoring'

export function getVendorInitials(name) {
  if (!name) return '??'
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s&.]+/).filter(w => /^[A-Z]/.test(w))
  if (words.length >= 2) return words[0][0] + words[1][0]
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

export function getVendorColor(name) {
  if (!name) return '#94a3b8'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
  return colors[Math.abs(hash) % colors.length]
}

export function formatCurrency(val) {
  if (val == null) return '—'
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function getScoreBadgeClass(score) {
  if (score >= 70) return 'score-badge--strong'
  if (score >= 30) return 'score-badge--weak'
  return 'score-badge--bad'
}

export function ScoreBadge({ score }) {
  if (score == null) return null
  const label = getScoreLabel(score)
  return <span className={`score-badge ${getScoreBadgeClass(score)}`}>{score} — {label}</span>
}

export function StatusBadge({ status }) {
  const labels = { pending: 'Awaiting Extraction', extracting: 'Extracting...', failed: 'Extraction Failed' }
  return <span className={`status-badge status-badge--${status}`}>{labels[status] || status}</span>
}
