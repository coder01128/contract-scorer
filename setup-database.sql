-- ============================================================
-- Contract Scorer — Database Schema
-- ============================================================
-- This file is the SOLE source of truth for all table names,
-- column names, types, and RPC functions. The seed script and
-- all application code are written to match THIS file.
--
-- Run this in the Supabase SQL Editor BEFORE seeding.
--
-- Required env vars (must be identical everywhere):
--   VITE_SUPABASE_URL
--   VITE_SUPABASE_ANON_KEY
--   VITE_ANTHROPIC_API_KEY
-- ============================================================

-- Dealerships (tenants)
create table if not exists dealerships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Map auth users to dealerships
create table if not exists dealership_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dealership_id uuid not null references dealerships(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (user_id, dealership_id)
);

-- Contracts
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  file_path text not null,
  file_name text not null,
  status text not null default 'pending' check (status in ('pending', 'extracting', 'scored', 'failed')),

  -- Extracted fields (nullable — populated after extraction)
  vendor_name text,
  service_type text,
  monthly_cost numeric,
  term_months integer,
  auto_renewal boolean,
  escalator_pct numeric,
  cancellation_notice_days integer,
  early_termination_fee numeric,
  data_exportable boolean,
  data_ownership text check (data_ownership in ('dealership', 'vendor', 'shared', null)),
  additional_fees jsonb default '[]'::jsonb,
  key_clauses jsonb default '[]'::jsonb,

  -- Scores (populated after scoring)
  score_pricing integer,
  score_terms integer,
  score_flexibility integer,
  score_deal integer,

  -- Negotiation opportunities (generated from score breakdown)
  negotiation_points jsonb default '[]'::jsonb,

  -- Raw extraction response for debugging
  extraction_raw jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for dashboard queries
create index if not exists idx_contracts_dealership on contracts(dealership_id);
create index if not exists idx_contracts_status on contracts(status);
create index if not exists idx_dealership_users_user on dealership_users(user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

alter table dealerships enable row level security;
alter table dealership_users enable row level security;
alter table contracts enable row level security;

-- Dealership users can see their own dealership
create policy "Users see own dealership"
  on dealerships for select
  using (
    id in (
      select dealership_id from dealership_users
      where user_id = auth.uid()
    )
  );

-- Users can see their own membership
create policy "Users see own membership"
  on dealership_users for select
  using (user_id = auth.uid());

-- Contracts: scoped to dealership
create policy "Users see dealership contracts"
  on contracts for select
  using (
    dealership_id in (
      select dealership_id from dealership_users
      where user_id = auth.uid()
    )
  );

create policy "Users insert dealership contracts"
  on contracts for insert
  with check (
    dealership_id in (
      select dealership_id from dealership_users
      where user_id = auth.uid()
    )
  );

create policy "Users update dealership contracts"
  on contracts for update
  using (
    dealership_id in (
      select dealership_id from dealership_users
      where user_id = auth.uid()
    )
  );

create policy "Users delete dealership contracts"
  on contracts for delete
  using (
    dealership_id in (
      select dealership_id from dealership_users
      where user_id = auth.uid()
    )
  );

-- ============================================================
-- RPC: Get dashboard summary for the user's dealership
-- ============================================================
-- JS destructures: { total_contracts, avg_score, worst_contract_id, worst_contract_vendor, worst_score }

create or replace function get_dashboard_summary()
returns table (
  total_contracts bigint,
  avg_score integer,
  worst_contract_id uuid,
  worst_contract_vendor text,
  worst_score integer
)
language sql
security definer
as $$
  with user_dealership as (
    select dealership_id from dealership_users where user_id = auth.uid() limit 1
  ),
  scored as (
    select id, vendor_name, score_deal
    from contracts
    where dealership_id = (select dealership_id from user_dealership)
      and status = 'scored'
  ),
  worst as (
    select id, vendor_name, score_deal
    from scored
    order by score_deal asc
    limit 1
  )
  select
    (select count(*) from scored)::bigint as total_contracts,
    (select coalesce(round(avg(score_deal))::integer, 0) from scored) as avg_score,
    (select id from worst) as worst_contract_id,
    (select vendor_name from worst) as worst_contract_vendor,
    (select score_deal from worst) as worst_score;
$$;

-- ============================================================
-- Storage bucket + policies
-- ============================================================
-- Create manually in Supabase dashboard: bucket name "contracts", private
-- File path convention: {dealership_id}/{contract_id}/{filename}
-- Then run these policies in the SQL Editor:

create policy "Users read own dealership files"
  on storage.objects for select
  using (
    bucket_id = 'contracts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select dealership_id::text from dealership_users
      where user_id = auth.uid()
    )
  );

create policy "Users upload to own dealership"
  on storage.objects for insert
  with check (
    bucket_id = 'contracts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select dealership_id::text from dealership_users
      where user_id = auth.uid()
    )
  );

create policy "Users delete own dealership files"
  on storage.objects for delete
  using (
    bucket_id = 'contracts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select dealership_id::text from dealership_users
      where user_id = auth.uid()
    )
  );

-- ============================================================
-- Updated_at trigger
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contracts_updated_at
  before update on contracts
  for each row execute function update_updated_at();
