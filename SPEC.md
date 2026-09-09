# Contract Scorer — Product Spec

## Purpose

Portfolio demo targeting the AutoStak AI role. Proves the full stack they're hiring for: document upload → AI extraction → scoring engine → results dashboard, with dealership-level multi-tenant auth.

**Not a prototype sketch.** This should look and feel like a real product someone handed you a login to.

## Cloud dependencies

- **Supabase**: Postgres, Auth, Storage, RLS (tenant isolation, file storage, auth)
- **Anthropic Claude API**: Vision extraction from uploaded contracts (client-side via `anthropic-dangerous-direct-browser-access` header)
- **Vercel**: Hosting

No server-side runtime. Extraction calls go directly from the browser to the Anthropic API. Supabase handles everything else.

## Stack

- React / Vite
- Supabase (Postgres + Auth + Storage + RLS)
- Anthropic Claude API (vision model)
- Vercel deployment

React is intentional here — the job spec asks for it.

---

## Core flow

### 1. Auth (dealership-level accounts)

- Supabase Auth (email/password)
- Each user belongs to a `dealership` (tenant)
- RLS policies scope all data to the user's dealership
- Seed one demo dealership with a demo login for portfolio viewing

### 2. Contract upload

- Accept PDF and DOCX files
- Store originals in Supabase Storage (bucket scoped to dealership)
- Trigger extraction on upload

### 3. AI extraction pipeline

Upload → convert to images (PDF pages) → Claude vision API → structured JSON

**Extracted fields:**

| Field | Type | Description |
|---|---|---|
| vendor_name | string | Company providing the service |
| service_type | string | What the contract covers (DMS, CRM, F&I, etc.) |
| monthly_cost | number | Monthly fee in USD |
| term_months | number | Contract duration |
| auto_renewal | boolean | Whether contract auto-renews |
| escalator_pct | number \| null | Annual price increase percentage |
| cancellation_notice_days | number | Days notice required to cancel |
| early_termination_fee | number \| null | Penalty for early exit |
| data_exportable | boolean | Whether dealership can export their data |
| data_ownership | string | Who owns the data ("dealership", "vendor", "shared") |
| additional_fees | json | Array of {name, amount} for setup fees, training fees, etc. |
| key_clauses | json | Array of notable clause summaries the model flagged |

**Extraction prompt** instructs the model to return JSON matching this schema. If a field can't be determined from the document, return `null` — never guess.

### 4. Scoring engine

Three categories, weighted per the AutoStak formula:

**Pricing (40% of Deal Score)**
- Base: score monthly_cost against typical ranges for the service_type
- Penalty: -10 per hidden/additional fee
- Penalty: -15 if escalator_pct > 5%
- Score: 0–100

**Terms (30% of Deal Score)**
- Base: shorter term_months = higher score (month-to-month: 100, 12mo: 80, 24mo: 60, 36mo+: 40)
- Penalty: -20 if auto_renewal is true
- Penalty: scaled by escalator_pct magnitude
- Score: 0–100

**Flexibility (30% of Deal Score)**
- Base: shorter cancellation_notice_days = higher score
- Penalty: -25 if early_termination_fee exists
- Bonus: +15 if data_exportable is true
- Bonus: +10 if data_ownership is "dealership"
- Score: 0–100

**Deal Score** = (Pricing × 0.4) + (Terms × 0.3) + (Flexibility × 0.3), rounded to integer.

Score interpretation:
- 80–100: Strong deal
- 60–79: Acceptable, room to negotiate
- 40–59: Weak — significant leverage points
- 0–39: Walk away or renegotiate entirely

### 5. Results dashboard

**Contract list view:**
- Table of all scored contracts for the dealership
- Columns: Vendor, Service Type, Deal Score (color-coded), Monthly Cost, Term, Upload Date
- Sort by any column
- Click to expand

**Contract detail view:**
- Deal Score (large, color-coded)
- Three subscore gauges: Pricing, Terms, Flexibility
- Extracted data displayed in structured format
- "Negotiation opportunities" panel: plain-language list of what's dragging the score down and what to push on
- Link to view/download the original document

**Dashboard summary (top of contract list):**
- Total contracts analysed
- Average Deal Score across portfolio
- Worst-scoring contract flagged
- "Market comparison" placeholder panel: "Upload 3+ contracts in the same service category to unlock comparison" — shows product thinking without needing benchmark data

---

## Data model

See `setup-database.sql` for the canonical schema. Summary:

- `dealerships` — tenant table
- `dealership_users` — maps auth.users to dealerships
- `contracts` — one row per uploaded contract, holds extracted fields + scores
- Supabase Storage bucket `contracts` — original files, scoped by dealership_id path

RLS on every table. A user can only see data belonging to their dealership.

---

## What to skip (for now)

- Multi-user per dealership (auth model supports it, UI doesn't need to show user management)
- DOCX upload (PDF only for demo — DOCX conversion adds a dependency for no portfolio payoff)
- Actual market comparison data (placeholder panel is sufficient)
- Savings estimates (needs benchmark data)
- Bulk upload

---

## Demo seeding

Seed the database with:
- One dealership ("Riverside Motors")
- One user (demo@riverside.test / demo password)
- 3–4 pre-scored contracts with realistic extracted data spanning the score range (one strong, one mid, one weak)

This means someone reviewing the portfolio can log in and see a populated dashboard immediately without uploading anything.

---

## Deployment

- Vercel via GitHub integration (git push to main)
- Supabase project: create manually, run setup-database.sql, seed
- Env vars in Vercel dashboard (not CLI)
- Demo URL in the application submission and on the project showcase
