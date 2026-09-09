import { Fragment } from 'react'

const PIPELINE = [
  { label: 'Upload PDF' },
  { label: 'Render Pages' },
  { label: 'AI Extraction' },
  { label: 'Scoring Engine' },
  { label: 'Deal Score' },
]

const PHASES = [
  {
    title: 'Upload & Render',
    desc: 'Drop any vendor contract PDF. Each page is rendered to a high-resolution image for AI analysis.',
  },
  {
    title: 'AI Extraction',
    desc: 'Claude vision reads every page and extracts key terms — pricing, duration, renewal clauses, fees, and data rights.',
  },
  {
    title: 'Scoring Engine',
    desc: 'A weighted algorithm scores pricing against service benchmarks, terms against industry norms, and flexibility on cancellation and data ownership.',
  },
  {
    title: 'Results & Negotiation',
    desc: 'Get a 0–100 Deal Score with Pricing, Terms, and Flexibility breakdowns — plus AI-generated negotiation talking points.',
  },
]

export default function HowItWorks({ onTryIt }) {
  return (
    <div className="hiw">
      <div className="hiw-header">
        <h2>How Contract Scorer Works</h2>
        <p>AI-powered vendor contract analysis for dealerships</p>
      </div>

      <div className="hiw-pipeline">
        {PIPELINE.map((s, i) => (
          <Fragment key={s.label}>
            <div className="hiw-node">
              <div className="hiw-node-num">{i + 1}</div>
              <div className="hiw-node-label">{s.label}</div>
            </div>
            {i < PIPELINE.length - 1 && (
              <div className="hiw-arrow">
                <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                  <path d="M0 7h20m0 0l-5-5m5 5l-5 5" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <div className="hiw-phases">
        {PHASES.map((p, i) => (
          <div key={i} className="hiw-phase">
            <div className="hiw-phase-num">{i + 1}</div>
            <div className="hiw-phase-body">
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="hiw-cta">
        <button className="btn btn-primary btn-lg" onClick={onTryIt}>
          Try It Now
        </button>
        <p className="hiw-cta-sub">Process sample contracts or upload your own</p>
      </div>
    </div>
  )
}
