-- ============================================================
-- Contract Scorer — Seed Data
-- ============================================================
-- Run AFTER setup-database.sql
-- Assumes a demo user has been created via Supabase Auth dashboard
-- with email: demo@riverside.test
--
-- After creating the user in the Auth dashboard, copy their UUID
-- and replace the placeholder below.
-- ============================================================

-- Step 1: Create demo dealership
insert into dealerships (id, name) values
  ('d0000000-0000-0000-0000-000000000001', 'Riverside Motors');

-- Step 2: Link the demo user to the dealership
-- REPLACE this UUID with the actual auth.users.id from the Supabase Auth dashboard
insert into dealership_users (user_id, dealership_id, role) values
  ('d2ac8d48-180c-495b-9dbc-543bca954a90', 'd0000000-0000-0000-0000-000000000001', 'owner');

-- Step 3: Seed scored contracts across the score range

-- Contract 1: Strong deal (score ~85)
insert into contracts (
  id, dealership_id, uploaded_by, file_path, file_name, status,
  vendor_name, service_type, monthly_cost, term_months, auto_renewal,
  escalator_pct, cancellation_notice_days, early_termination_fee,
  data_exportable, data_ownership, additional_fees, key_clauses,
  score_pricing, score_terms, score_flexibility, score_deal,
  negotiation_points
) values (
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'd2ac8d48-180c-495b-9dbc-543bca954a90',
  'd0000000-0000-0000-0000-000000000001/c0000000-0000-0000-0000-000000000001/vinsolutions-crm.pdf',
  'vinsolutions-crm.pdf',
  'scored',
  'VinSolutions', 'CRM', 995.00, 12, false,
  null, 30, null,
  true, 'dealership',
  '[]'::jsonb,
  '["Standard 12-month CRM agreement", "Includes up to 10 user seats", "Data export available via API"]'::jsonb,
  88, 80, 90, 85,
  '["Negotiate for month-to-month after initial term"]'::jsonb
);

-- Contract 2: Mid deal (score ~58)
insert into contracts (
  id, dealership_id, uploaded_by, file_path, file_name, status,
  vendor_name, service_type, monthly_cost, term_months, auto_renewal,
  escalator_pct, cancellation_notice_days, early_termination_fee,
  data_exportable, data_ownership, additional_fees, key_clauses,
  score_pricing, score_terms, score_flexibility, score_deal,
  negotiation_points
) values (
  'c0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000001',
  'd2ac8d48-180c-495b-9dbc-543bca954a90',
  'd0000000-0000-0000-0000-000000000001/c0000000-0000-0000-0000-000000000002/reynolds-dms.pdf',
  'reynolds-dms.pdf',
  'scored',
  'Reynolds & Reynolds', 'DMS', 2850.00, 36, true,
  3.5, 90, 15000.00,
  false, 'vendor',
  '[{"name": "Setup fee", "amount": 5000}, {"name": "Training", "amount": 2500}]'::jsonb,
  '["36-month DMS agreement with auto-renewal", "90-day cancellation notice required", "$15,000 early termination fee", "Vendor retains data ownership", "3.5% annual escalator"]'::jsonb,
  52, 40, 65, 52,
  '["Push back on auto-renewal — request opt-in renewal", "Negotiate data export rights before signing", "Challenge the 3.5% escalator — cap at CPI", "Reduce early termination fee or add performance exit clause", "$7,500 in upfront fees — negotiate waiver for multi-year commitment"]'::jsonb
);

-- Contract 3: Weak deal (score ~35)
insert into contracts (
  id, dealership_id, uploaded_by, file_path, file_name, status,
  vendor_name, service_type, monthly_cost, term_months, auto_renewal,
  escalator_pct, cancellation_notice_days, early_termination_fee,
  data_exportable, data_ownership, additional_fees, key_clauses,
  score_pricing, score_terms, score_flexibility, score_deal,
  negotiation_points
) values (
  'c0000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000001',
  'd2ac8d48-180c-495b-9dbc-543bca954a90',
  'd0000000-0000-0000-0000-000000000001/c0000000-0000-0000-0000-000000000003/dealer-fi-warranty.pdf',
  'dealer-fi-warranty.pdf',
  'scored',
  'Dealer F&I Solutions', 'F&I Products', 3200.00, 60, true,
  5.0, 180, 25000.00,
  false, 'vendor',
  '[{"name": "Platform fee", "amount": 3500}, {"name": "Integration fee", "amount": 4000}, {"name": "Annual compliance fee", "amount": 1200}]'::jsonb,
  '["60-month agreement with automatic 24-month renewal", "180-day cancellation window", "$25,000 early exit penalty", "5% annual escalation clause", "Vendor owns all transaction data", "No data export provision"]'::jsonb,
  28, 25, 40, 31,
  '["Five-year lock-in is extreme — negotiate to 24 months maximum", "Demand data export rights — this is your customer data", "Remove auto-renewal or reduce renewal term to 12 months", "5% escalator will compound to 28% over the term — cap at 2%", "Early termination fee is punitive — negotiate performance-based exit clause", "$8,700 in additional fees on top of $3,200/mo — push for fee consolidation", "180-day notice period is unreasonable — standard is 30-60 days"]'::jsonb
);

-- Contract 4: Pending extraction (shows the upload state)
insert into contracts (
  id, dealership_id, uploaded_by, file_path, file_name, status
) values (
  'c0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000001',
  'd2ac8d48-180c-495b-9dbc-543bca954a90',
  'd0000000-0000-0000-0000-000000000001/c0000000-0000-0000-0000-000000000004/pending-review.pdf',
  'pending-review.pdf',
  'pending'
);
