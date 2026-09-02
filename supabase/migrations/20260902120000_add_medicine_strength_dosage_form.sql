-- Adds the two variant-defining fields the URL pipeline needs to disambiguate a
-- brand that ships in several strengths or dosage forms.
--
-- NOT YET APPLIED. This file is prepared by the final audit; apply it manually
-- in the Supabase SQL editor (project lzaxjqxmowpigpphwmnw) the same way the
-- medicine_product_urls migration was applied.
--
-- Why this is safe to apply to live data:
--
--   * Both columns are ADDED, nullable, with NO DEFAULT and NO backfill. In
--     PostgreSQL this is a catalogue-only change: it does not rewrite the table
--     and cannot alter, reorder or invalidate any existing row.
--   * Nothing reads these columns yet, so adding them changes no behaviour.
--     `select *` callers receive two extra null fields; the frontend renders
--     from named fields only.
--   * They are deliberately NOT NOT-NULL and have no CHECK on the value. A
--     NOT NULL column would require a backfill, and backfilling a strength we
--     have not verified is exactly the guess this project has refused to make
--     for nine batches. Null means "we do not know", which is the honest state
--     for all 97 rows on day one.
--
-- What it unblocks (from recorded rejection evidence, see
-- scripts/urls/results/batch*-rejections.json):
--
--   strength     up to 20 medicines. 10 rejected on strength with live evidence
--                (15, 16, 29, 32, 49, 50, 64, 65, 79, 92) and up to 10 more
--                that the selector excluded pre-emptively and that were never
--                searched (34, 58, 59, 72, 74, 80, 85, 87, 89, 94) -- those ten
--                are PRESUMED strength-ambiguous from their code comments, not
--                verified, so they must be re-investigated rather than assumed.
--   dosage_form  4 medicines (22 Digene, 62 Febrex Plus, 67 Pudin Hara,
--                82 Liv 52), each of which ships in two or more forms with
--                different compositions.
--
-- What it does NOT unblock: 30 and 45 (bulk commodities where pack size, not
-- strength, is identity-bearing), 60 and 90 (product ranges rather than SKUs),
-- the 6 manufacturer conflicts and the 6 catalogue-identity cases.
--
-- pack_size is deliberately omitted. It was evaluated and dropped earlier in the
-- project: it is not a medicine-level identifier, and treating it as one would
-- split a single medicine into one row per tube size.

alter table public.medicines
  add column if not exists strength text,
  add column if not exists dosage_form text;

comment on column public.medicines.strength is
  'Variant-defining strength as printed on the pack, e.g. "500mg", "0.5% w/v", "50mg/1000mg". NULL means unknown -- never guess it. Used by the URL pipeline to choose between same-brand SKUs.';

comment on column public.medicines.dosage_form is
  'Variant-defining dosage form, e.g. "tablet", "syrup", "eye drops", "cream". NULL means unknown -- never guess it. Used by the URL pipeline to choose between same-brand presentations.';
