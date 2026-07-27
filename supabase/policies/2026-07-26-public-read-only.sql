-- Medyze: public read-only access for the storefront catalog tables.
--
-- Root cause being fixed: RLS is enabled on categories, medicines,
-- pharmacies, and medicine_prices with zero policies attached, so the
-- Data API silently returns 0 rows to every client (anon and authenticated
-- alike) even though the tables have data.
--
-- This script:
--   - Keeps RLS enabled on all four tables (does not disable it).
--   - Adds ONE policy per table: SELECT only, granted to `public`
--     (i.e. every request through the Data API, anon or authenticated).
--   - Grants no INSERT / UPDATE / DELETE — those remain denied by default
--     because RLS is on and no write policy exists for any table.
--
-- Safe to re-run: policies are dropped and recreated if they already exist.
-- Does not alter table structure, columns, or existing data.

begin;

-- categories --------------------------------------------------------------
alter table public.categories enable row level security;

drop policy if exists "Public read access" on public.categories;
create policy "Public read access"
  on public.categories
  for select
  to public
  using (true);

-- medicines -----------------------------------------------------------------
alter table public.medicines enable row level security;

drop policy if exists "Public read access" on public.medicines;
create policy "Public read access"
  on public.medicines
  for select
  to public
  using (true);

-- pharmacies ------------------------------------------------------------
alter table public.pharmacies enable row level security;

drop policy if exists "Public read access" on public.pharmacies;
create policy "Public read access"
  on public.pharmacies
  for select
  to public
  using (true);

-- medicine_prices ---------------------------------------------------------
alter table public.medicine_prices enable row level security;

drop policy if exists "Public read access" on public.medicine_prices;
create policy "Public read access"
  on public.medicine_prices
  for select
  to public
  using (true);

commit;
