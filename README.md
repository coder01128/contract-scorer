# Contract Scorer

AI-powered vendor contract analysis for car dealerships. Upload a vendor agreement, get a Deal Score with negotiation leverage points.

**Live demo:** [URL TBD after deployment]
**Demo login:** demo@riverside.test / [set during setup]

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/coder01128/contract-scorer.git
cd contract-scorer
npm install
```

### 2. Supabase project

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in the Supabase dashboard
3. Paste the contents of `setup-database.sql` and run it — this creates all tables, RLS policies, and functions
4. Go to **Storage** and create a new bucket called `contracts` (set to private)
5. Go to **Authentication → Users** and create a user: `demo@riverside.test` with a password you'll remember
6. Copy that user's UUID from the Auth dashboard
7. Open `seed.sql`, replace every instance of `REPLACE_WITH_AUTH_USER_UUID` with the real UUID
8. Paste the updated `seed.sql` into the SQL Editor and run it

### 3. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the values:
- `VITE_SUPABASE_URL` — from Supabase dashboard → Project Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` — from Supabase dashboard → Project Settings → API → anon/public key
- `VITE_ANTHROPIC_API_KEY` — your Anthropic API key

### 4. Run locally

```bash
npm run dev
```

Opens at `http://localhost:5173`. Log in with the demo credentials.

### 5. Deploy to Vercel

1. Push the repo to GitHub
2. Import the repo in Vercel
3. Add the three env vars in Vercel → Project Settings → Environment Variables (same names, same values as `.env.local`)
4. Deploy happens automatically on push to `main`

**Do not run `vercel` CLI commands from the repo.** Use `git push` only.

---

## Architecture

```
Upload PDF → pdfjs-dist renders pages → Claude vision extracts fields →
Scoring engine calculates Deal Score → Dashboard displays results
```

- **Multi-tenant**: Supabase RLS scopes all data to the logged-in user's dealership
- **Extraction**: Client-side calls to Anthropic API via vision model
- **Scoring**: Pure functions — Pricing (40%) + Terms (30%) + Flexibility (30%)
- **Storage**: Original PDFs in Supabase Storage, extracted data in Postgres
