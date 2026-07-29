-- Medyze: AI-generated medicine details, cached one row per medicine.
--
-- This is ADDITIVE ONLY. It creates a new table and touches nothing that
-- already exists: `medicines`, `pharmacies`, `medicine_prices`, `categories`,
-- their columns, their data, and their RLS policies are all left alone.
--
-- Relationship: strictly 1:1 with `medicines`.
--   - `medicine_id` is a FK to medicines(id) with ON DELETE CASCADE, so
--     deleting a medicine (as was done for Cetzine / Azithral 500 / Cardace)
--     takes its details with it and never orphans a row.
--   - The UNIQUE constraint on `medicine_id` is what makes it 1:1 rather than
--     1:many. It is also why the bulk generation script is safe to re-run: a
--     second run cannot create a duplicate row for a medicine that already
--     has one, independently of the script's own skip check.
--
-- Security: RLS is enabled with a SELECT-only policy for `public`, matching
-- the existing catalog tables. There is deliberately NO insert/update/delete
-- policy — writes require the service-role key, which is used only by the
-- offline scripts in scripts/seed and never ships to the browser. The app
-- reads this table and can never write to it.
--
-- Safe to re-run: every object is created IF NOT EXISTS or dropped first.

begin;

create table if not exists public.medicine_details (
  id bigint generated always as identity primary key,

  medicine_id bigint not null
    references public.medicines (id) on delete cascade,

  medicine_activity   text not null,
  uses                text not null,
  side_effects        text not null,
  composition         text not null,
  manufacturer_details text not null,

  -- Only 'generated' is ever written today: the generation script refuses to
  -- insert a partial record, so a row existing at all means generation
  -- succeeded and was validated. 'pending' / 'failed' are permitted by the
  -- check constraint so a future queue-based flow can use this table without
  -- another migration.
  generation_status text not null default 'generated'
    check (generation_status in ('pending', 'generated', 'failed')),

  generated_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint medicine_details_medicine_id_key unique (medicine_id),

  -- A "generated" row must actually carry content. This is the last line of
  -- defence behind the generation script's own validation: even a direct
  -- service-role INSERT cannot store a blank field as a finished record.
  -- NOTE: widened by 20260728160000 to also cover warnings and
  -- storage_information.
  constraint medicine_details_generated_is_complete check (
    generation_status <> 'generated'
    or (
      length(btrim(medicine_activity)) > 0
      and length(btrim(uses)) > 0
      and length(btrim(side_effects)) > 0
      and length(btrim(composition)) > 0
      and length(btrim(manufacturer_details)) > 0
      and generated_at is not null
    )
  )
);

comment on table public.medicine_details is
  'Informational content for a medicine. Exactly one row per medicine; populated offline by scripts/seed/generate-medicine-details.ts and read-only at runtime.';

-- The unique constraint already indexes medicine_id, which is the only
-- lookup path the app uses (WHERE medicine_id = $1), so no extra index.

-- updated_at ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists medicine_details_set_updated_at on public.medicine_details;
create trigger medicine_details_set_updated_at
  before update on public.medicine_details
  for each row
  execute function public.set_updated_at();

-- RLS ----------------------------------------------------------------------
alter table public.medicine_details enable row level security;

drop policy if exists "Public read access" on public.medicine_details;
create policy "Public read access"
  on public.medicine_details
  for select
  to public
  using (true);

commit;
