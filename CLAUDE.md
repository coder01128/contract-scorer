# Contract Scorer — CLAUDE.md

## Project overview

React/Vite app. Supabase backend (Postgres + Auth + Storage + RLS). Anthropic Claude API for vision-based contract extraction. Deployed to Vercel via GitHub integration.

Read `SPEC.md` for the full product spec. Read `setup-database.sql` for the canonical schema — it is the sole source of truth for all table and column names.

## Stack

- React 18+ / Vite
- Supabase JS client (`@supabase/supabase-js`)
- Anthropic API (client-side via `anthropic-dangerous-direct-browser-access` header)
- PDF page rendering: `pdfjs-dist` (convert pages to images for vision API)
- Vercel hosting

## Env vars

Identical everywhere — `.env.local`, `.env.example`, Vercel dashboard, and every file that reads them:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ANTHROPIC_API_KEY
```

No other names. Grep the repo to verify before shipping.

---

## Non-negotiable design rules

- **4.5:1 contrast ratio minimum** on all text
- **13px minimum font size** — nothing smaller, anywhere
- **No gray-on-gray** text on dark backgrounds — use off-white or a colour with strong contrast
- Dropdowns sorted alphabetically unless explicitly told otherwise
- Dark mode not required, but if implemented, enforce the contrast rules

## Non-negotiable build rules

- **Think once, build once.** Don't build incrementally through broken iterations when the correct approach is knowable upfront.
- **Test before shipping.** Null checks, error states, empty states. Don't rely on manual QA for basic functionality.
- **Vision/LLM extraction is the default** for document processing. Don't write heuristic parsers.
- **Browser-to-API calls work** with the `anthropic-dangerous-direct-browser-access` header. Don't claim CORS prevents it.
- **Never run `vercel` CLI deploy commands.** Deploy via `git push` to main only. The CLI has previously broken Vercel project settings.
- **Never print or log API keys** in the terminal.

## Database / API schema contract

- `setup-database.sql` is the SOLE source of truth for table names, column names, types, and RPC functions.
- The RPC function's return columns must EXACTLY match the property names the JS code destructures. Mismatches return `undefined` silently.
- If you add or rename a column, update `setup-database.sql` FIRST, then update the code to match.
- The seed script (`seed.sql`) is written to match `setup-database.sql` — not the other way around.

## Extraction pipeline

1. User uploads PDF
2. Store original in Supabase Storage (`contracts` bucket, path: `{dealership_id}/{contract_id}/{filename}`)
3. Set contract status to `extracting`
4. Use `pdfjs-dist` to render each page to a canvas → base64 image
5. Send images to Claude vision API with the extraction prompt (see SPEC.md for field schema)
6. Parse JSON response, validate against expected schema
7. Run scoring algorithm (see SPEC.md for formula)
8. Generate negotiation points from score breakdown
9. Update contract row with extracted data, scores, and negotiation points
10. Set status to `scored` (or `failed` if extraction returned unusable data)

## Scoring formula

```
Deal Score = (Pricing × 0.4) + (Terms × 0.3) + (Flexibility × 0.3)
```

Each subscore is 0–100. See SPEC.md for the full rubric.

## File structure (expected)

```
src/
  components/
    auth/         — Login, signup
    dashboard/    — Contract list, summary stats
    contract/     — Detail view, score gauges, negotiation panel
    upload/       — Upload flow, extraction progress
  lib/
    supabase.js   — Supabase client init
    anthropic.js  — Extraction API call + prompt
    scoring.js    — Scoring algorithm (pure functions, no side effects)
  App.jsx
  main.jsx
```

## Key implementation notes

- Extraction prompt must instruct the model to return `null` for fields it can't determine — never guess
- Scoring functions must be pure: `(extractedData) => scores` — testable without Supabase or API calls
- The dashboard summary uses an RPC function `get_dashboard_summary()` — don't query contracts and aggregate client-side
- RLS means every Supabase query is automatically scoped to the user's dealership — don't add dealership_id filters in the app code (they're redundant and a maintenance trap)
- The pending contract in the seed data should show a proper "awaiting extraction" state in the UI, not a broken row
