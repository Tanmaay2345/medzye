-- Medyze: add `warnings` and `storage_information` to medicine_details.
--
-- Why this exists: the bulk generation script populates seven fields, but the
-- original table was created with five. These two columns did not exist, so
-- they are added here rather than silently dropped from the script.
--
-- Scope: ADDITIVE and limited to medicine_details. It adds two columns and
-- widens one check constraint. It does not touch `medicines`, `pharmacies`,
-- `medicine_prices`, or `categories`, and changes no relationship, foreign
-- key, index, or RLS policy anywhere.
--
-- The columns are nullable so this ALTER is safe whether the table is empty
-- or already populated. Content is enforced where it matters instead: the
-- completeness constraint below requires all seven fields to be non-empty for
-- any row marked 'generated', so a partial record still cannot masquerade as
-- a finished one.
--
-- Safe to re-run.

begin;

alter table public.medicine_details
  add column if not exists warnings text,
  add column if not exists storage_information text;

comment on column public.medicine_details.warnings is
  'Precautions and interactions a patient should know before use.';
comment on column public.medicine_details.storage_information is
  'How to store the medicine, and disposal/expiry guidance.';

-- Widen the completeness constraint to cover the two new fields.
alter table public.medicine_details
  drop constraint if exists medicine_details_generated_is_complete;

alter table public.medicine_details
  add constraint medicine_details_generated_is_complete check (
    generation_status <> 'generated'
    or (
      length(btrim(medicine_activity)) > 0
      and length(btrim(uses)) > 0
      and length(btrim(side_effects)) > 0
      and length(btrim(composition)) > 0
      and length(btrim(manufacturer_details)) > 0
      and length(btrim(coalesce(warnings, ''))) > 0
      and length(btrim(coalesce(storage_information, ''))) > 0
      and generated_at is not null
    )
  );

commit;
