-- Medyze: managed pharmacy/brand product URLs, one row per (medicine, pharmacy, url_type).
--
-- ADDITIVE ONLY. Creates one table. Touches nothing existing: medicines,
-- pharmacies, medicine_prices, medicine_details, categories -- their columns,
-- data, constraints and RLS policies are all left exactly as they are. The
-- existing catalogue remains the single source of truth for medicine identity;
-- this table only ever REFERENCES it.
--
-- Reuses public.set_updated_at(), created by 20260728120000. Not redefined here.
--
-- Safe to re-run.

begin;

create table if not exists public.medicine_product_urls (
  id bigint generated always as identity primary key,

  medicine_id bigint not null references public.medicines (id)  on delete cascade,
  pharmacy_id bigint not null references public.pharmacies (id) on delete cascade,

  url_type text not null check (url_type in ('DIRECT_PRODUCT', 'SEARCH')),

  url       text not null check (url ~ '^https://'),
  final_url text check (final_url is null or final_url ~ '^https://'),

  verification_status text not null default 'PENDING' check (verification_status in (
    'PENDING', 'VERIFIED', 'REDIRECT_VERIFIED', 'INVALID',
    'UNREACHABLE', 'NOT_FOUND', 'AMBIGUOUS', 'TEMPLATE_UNVERIFIED'
  )),

  match_confidence   numeric(3,2) check (match_confidence between 0 and 1),
  last_verified_at   timestamptz,
  source_skill       text,
  verification_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Idempotency key. Re-running discovery UPDATES this row rather than
  -- inserting a second one. url_type is part of the key because a medicine may
  -- legitimately have both a direct product URL and a search fallback at the
  -- same pharmacy; without it the two would overwrite each other.
  constraint medicine_product_urls_unique_target
    unique (medicine_id, pharmacy_id, url_type),

  -- Mirrors medicine_details_generated_is_complete: a row may not CLAIM
  -- verification without carrying the evidence that produced it. This is the
  -- last line of defence behind the import script's own validation -- even a
  -- direct service-role INSERT cannot store a bare URL as "verified".
  constraint medicine_product_urls_verified_has_evidence check (
    verification_status not in ('VERIFIED', 'REDIRECT_VERIFIED')
    or (last_verified_at is not null
        and source_skill is not null
        and match_confidence is not null)
  ),

  constraint medicine_product_urls_redirect_has_final_url check (
    verification_status <> 'REDIRECT_VERIFIED' or final_url is not null
  ),

  -- robots.txt disallows /search on all four supported pharmacies (1mg,
  -- Apollo, PharmEasy, Netmeds), so a SEARCH URL can never be legitimately
  -- machine-verified -- verifying one would mean crawling a disallowed path.
  -- A search URL is therefore always template-derived and must never
  -- masquerade as a verified product page. It may still record that it broke.
  constraint medicine_product_urls_search_never_verified check (
    url_type <> 'SEARCH'
    or verification_status in ('TEMPLATE_UNVERIFIED', 'PENDING', 'INVALID', 'UNREACHABLE', 'NOT_FOUND')
  )
);

comment on table public.medicine_product_urls is
  'Managed outbound pharmacy URLs for a medicine. Written offline by scripts/urls/*; read-only at runtime and filtered to verified rows by RLS.';
comment on column public.medicine_product_urls.url_type is
  'DIRECT_PRODUCT = a verified pharmacy product page. SEARCH = a template-derived search fallback that is never machine-verified.';
comment on column public.medicine_product_urls.source_skill is
  'Which Claude finder skill produced this URL, e.g. tata-1mg-product-url-finder. Provenance for re-discovery.';
comment on column public.medicine_product_urls.match_confidence is
  'Normalised 0-1 from the VERIFIER (not the finder): HIGH=0.95, MEDIUM=0.70, LOW=0.40.';

-- The unique constraint indexes (medicine_id, pharmacy_id, url_type) with
-- medicine_id leftmost, which serves the only runtime lookup
-- (WHERE medicine_id = $1). No additional index needed.

drop trigger if exists medicine_product_urls_set_updated_at on public.medicine_product_urls;
create trigger medicine_product_urls_set_updated_at
  before update on public.medicine_product_urls
  for each row execute function public.set_updated_at();

-- RLS ----------------------------------------------------------------------
-- Read-only for the browser AND filtered to verified rows only: the frontend
-- cannot read a PENDING, INVALID, AMBIGUOUS or TEMPLATE_UNVERIFIED row even if
-- it asks for one. "Prefer missing data over incorrect data" is enforced at
-- the database boundary rather than trusted to application code. Writes
-- require the service-role key, used only by the offline scripts.
alter table public.medicine_product_urls enable row level security;

drop policy if exists "Public read verified only" on public.medicine_product_urls;
create policy "Public read verified only"
  on public.medicine_product_urls
  for select to public
  using (verification_status in ('VERIFIED', 'REDIRECT_VERIFIED'));

commit;
