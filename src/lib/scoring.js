const SERVICE_BENCHMARKS = {
  'CRM': 1200,
  'DMS': 2500,
  'F&I Products': 2500,
  'F&I': 2500,
  'Service': 800,
  'Parts': 600,
  'Marketing': 1500,
  'Website': 1000,
  'Inventory': 800,
}
const DEFAULT_BENCHMARK = 1500

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function scorePricing(data) {
  const benchmark = SERVICE_BENCHMARKS[data.service_type] || DEFAULT_BENCHMARK
  const cost = data.monthly_cost ?? 0

  const ratio = cost / benchmark
  let base
  if (ratio <= 0.5) base = 100
  else if (ratio <= 1.0) base = Math.round(100 - (ratio - 0.5) * 40)
  else if (ratio <= 2.0) base = Math.round(80 - (ratio - 1.0) * 60)
  else base = Math.round(Math.max(0, 20 - (ratio - 2.0) * 20))

  const fees = Array.isArray(data.additional_fees) ? data.additional_fees : []
  base -= fees.length * 10

  if (data.escalator_pct != null && data.escalator_pct > 5) {
    base -= 15
  }

  return clamp(base, 0, 100)
}

export function scoreTerms(data) {
  const months = data.term_months ?? 0
  let base
  if (months <= 1) base = 100
  else if (months <= 12) base = Math.round(100 - (months - 1) * (20 / 11))
  else if (months <= 24) base = Math.round(80 - (months - 12) * (20 / 12))
  else if (months <= 36) base = Math.round(60 - (months - 24) * (20 / 12))
  else base = Math.round(Math.max(15, 40 - (months - 36) * (25 / 24)))

  if (data.auto_renewal === true) base -= 20

  if (data.escalator_pct != null && data.escalator_pct > 0) {
    base -= Math.round(data.escalator_pct * 3)
  }

  return clamp(base, 0, 100)
}

export function scoreFlexibility(data) {
  const days = data.cancellation_notice_days ?? 0
  let base
  if (days <= 30) base = 90
  else if (days <= 60) base = 75
  else if (days <= 90) base = 60
  else if (days <= 120) base = 45
  else if (days <= 180) base = 25
  else base = 10

  if (data.early_termination_fee != null && data.early_termination_fee > 0) {
    base -= 25
  }

  if (data.data_exportable === true) base += 15
  if (data.data_ownership === 'dealership') base += 10

  return clamp(base, 0, 100)
}

export function calculateDealScore(pricing, terms, flexibility) {
  return Math.round(pricing * 0.4 + terms * 0.3 + flexibility * 0.3)
}

export function scoreContract(data) {
  const pricing = scorePricing(data)
  const terms = scoreTerms(data)
  const flexibility = scoreFlexibility(data)
  const deal = calculateDealScore(pricing, terms, flexibility)
  return { score_pricing: pricing, score_terms: terms, score_flexibility: flexibility, score_deal: deal }
}

export function generateNegotiationPoints(data) {
  const points = []

  if (data.additional_fees?.length > 0) {
    const total = data.additional_fees.reduce((s, f) => s + (f.amount || 0), 0)
    points.push(
      `$${total.toLocaleString()} in additional fees (${data.additional_fees.map(f => f.name).join(', ')}) — negotiate waiver or consolidation`
    )
  }
  if (data.escalator_pct != null && data.escalator_pct > 0) {
    points.push(
      `${data.escalator_pct}% annual escalator will compound over the term — cap at CPI or remove`
    )
  }
  if (data.auto_renewal === true) {
    points.push('Auto-renewal clause detected — request opt-in renewal instead')
  }
  if (data.term_months != null && data.term_months > 24) {
    points.push(
      `${data.term_months}-month term is long — negotiate to 12–24 months or add performance exit clauses`
    )
  }
  if (data.early_termination_fee != null && data.early_termination_fee > 0) {
    points.push(
      `$${data.early_termination_fee.toLocaleString()} early termination fee — negotiate reduction or performance-based exit`
    )
  }
  if (data.cancellation_notice_days != null && data.cancellation_notice_days > 60) {
    points.push(
      `${data.cancellation_notice_days}-day cancellation notice exceeds industry standard (30–60 days) — negotiate shorter window`
    )
  }
  if (data.data_exportable === false) {
    points.push('No data export rights — demand data portability provisions')
  }
  if (data.data_ownership === 'vendor') {
    points.push('Vendor owns the data — negotiate for dealership data ownership')
  } else if (data.data_ownership === 'shared') {
    points.push('Shared data ownership — push for full dealership ownership of customer data')
  }

  return points
}

export function getScoreColor(score) {
  if (score == null) return '#94a3b8'
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#ca8a04'
  if (score >= 40) return '#ea580c'
  return '#dc2626'
}

export function getScoreLabel(score) {
  if (score == null) return 'N/A'
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Acceptable'
  if (score >= 40) return 'Weak'
  return 'Walk Away'
}
