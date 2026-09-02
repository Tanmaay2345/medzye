# Data correction: composition artifacts in `medicine_details`

`public.medicine_details.composition`, five rows: 19, 49, 50, 65, 97.

## The bug

`scripts/seed/build-medicine-details.ts` builds a composition string by pulling
candidate terms out of each medicine's free-text `description` and resolving
them against RxNorm ingredient concepts (IN/PIN/MIN). `STOPWORDS` exists to
suppress everyday words that happen to be real RxNorm ingredients -- the file
already documents "sugar" (from "blood sugar levels") as exactly this trap.

Three words were missing from that list, and they are the same trap one step
further: they name what the drug **acts on**, not what is in it.

| Term | RxCUI | Appears in a description as |
|---|---|---|
| cholesterol | 2438 | "used to lower cholesterol", "lower LDL cholesterol levels" |
| insulin | 253182 | "improves insulin sensitivity", "stimulates insulin release" |
| fiber | 70727 | "psyllium husk fiber supplement" |

## Rows affected and corrected

| id | Medicine | Was | Now |
|---|---|---|---|
| 19 | Glucophage | Metformin + Insulin, regular, human | Metformin |
| 49 | Amaryl | Glimepiride + Insulin, regular, human | Glimepiride |
| 50 | Rosuvas | Rosuvastatin + Cholesterol | Rosuvastatin |
| 65 | Storvas | Atorvastatin + Cholesterol | Atorvastatin |
| 97 | Isabgol | Ispaghula husk + Fiber | Ispaghula husk |

The `Active ingredients:` prefix was reduced to the singular `Active
ingredient:` and the artifact's RxCUI dropped from the trailing list, so each
string matches exactly what the fixed generator would now emit.

## Why the fix is safe

Every mention of these three words anywhere in the 97-medicine catalogue was
checked. All six are targets or descriptive nouns, never actives:

- insulin: 19 Glucophage, 49 Amaryl, 94 Diamicron
- cholesterol: 50 Rosuvas, 65 Storvas
- fiber: 97 Isabgol

No medicine in this catalogue has insulin, cholesterol or fiber as an active
ingredient, so listing them as stopwords cannot suppress a real one. Isabgol's
actual active, ispaghula husk, is matched separately and is unaffected.

**94 Diamicron** ("helps the pancreas release insulin") is a latent sixth case:
it has no `medicine_details` row yet, so it was never miswritten, but it would
have been on the next generator run. The fix prevents that.

`calcium`, `iron` and `zinc` remain deliberately absent from `STOPWORDS` --
they are genuine actives here (Shelcal) and the existing comment says so.

## Blast radius

Guarded UPDATE per row on `medicine_id` AND the exact prior `composition`
string, so a row whose value had drifted would have matched zero rows rather
than being overwritten. Each returned exactly 1 row.

Verified after: `medicine_details` still 60 rows; exactly rows 19, 49, 50, 65
and 97 changed; the only columns touched were `composition` and the automatic
`updated_at`; `medicines` (97), `medicine_product_urls` (214) and
`medicine_prices` (586) byte-identical. Zero composition artifacts remain, and
all five pages render the corrected string in the server response.

Not touched: medicine 19's `side_effects` legitimately mentions insulin -- it is
FDA label text about a metformin/insulin interaction, not an artifact.
