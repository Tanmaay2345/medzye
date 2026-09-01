# Corrections and deferred follow-ups

## 1. Correction to commit 06455e3 (Batch 3)

Commit `06455e3` ("feat(urls): batch 3 — 10 medicines, 20 verified URLs, 20
ambiguous rejections") contains an **incorrect claim** in its message and in the
reporting that accompanied it.

**What was claimed:**

> our Rosuvas composition reads "Rosuvastatin + Cholecalciferol" and our Storvas
> composition "Atorvastatin + Cholecalciferol", which describe the Rosuvas D and
> Storvas D combination products rather than the plain brands our name field
> names. Isabgol lists "Ispaghula husk + Fennel" ...

**What the data actually says:**

| medicine_id | name    | actual stored composition                |
|-------------|---------|------------------------------------------|
| 50          | Rosuvas | `Rosuvastatin + Cholesterol`             |
| 65          | Storvas | `Atorvastatin + Cholesterol`             |
| 97          | Isabgol | `Ispaghula husk + Fiber`                 |

The ingredients are **Cholesterol** and **Fiber** — not Cholecalciferol and not
Fennel. The conclusion drawn from the misreading ("these describe the Rosuvas D /
Storvas D vitamin-D combination products") is therefore also **wrong**: these rows
have nothing to do with vitamin D combinations.

The *outcome* of Batch 3 is unaffected. All five medicines were rejected as
AMBIGUOUS on the independent and correct ground that the brands ship multiple
strengths and our catalogue records none. No URL was stored on the basis of the
incorrect claim, and no data was changed because of it.

Git history is intentionally left untouched — no rewrite, no force-push. This
note is the correction of record.

## 2. Deferred follow-up: composition-generation artifact

Deferred by decision until after the URL verification run. **Not fixed here, and
no composition data has been modified.**

**Symptom.** 5 of the 60 populated `medicine_details.composition` rows list an
"active ingredient" that is not an ingredient of the product:

| medicine_id | name       | stored ingredients                     | spurious term |
|-------------|------------|----------------------------------------|---------------|
| 19          | Glucophage | Metformin + Insulin, regular, human    | insulin       |
| 49          | Amaryl     | Glimepiride + Insulin, regular, human  | insulin       |
| 50          | Rosuvas    | Rosuvastatin + Cholesterol             | cholesterol   |
| 65          | Storvas    | Atorvastatin + Cholesterol             | cholesterol   |
| 97          | Isabgol    | Ispaghula husk + Fiber                 | fiber         |

`51 Shelcal 500` (`Vitamin d3 + Calcium`) was flagged by the same detector but is
a **true positive for the product** — Shelcal genuinely is calcium carbonate plus
vitamin D3. It is not part of this defect.

**Root cause.** `scripts/urls/../seed/build-medicine-details.ts`:

- `candidateTerms()` (line ~204) splits `medicines.description` into unigrams and
  bigrams. `description` is curated marketing prose, not structured data.
- The resolver (line ~503) accepts any token that resolves to an RxNorm concept
  whose term type is `IN` / `PIN` / `MIN`.
- RxNorm legitimately contains ingredient concepts for **cholesterol** (RxCUI
  2438), **fiber** (70727) and **insulin, regular, human** (253182). So mechanism
  and category words lifted from prose — "lower cholesterol", "improves insulin
  sensitivity", "fiber supplement" — become "active ingredients".

The RxNorm validation is doing what it was designed to do. The flaw is the
assumption that a description word which resolves to an ingredient concept is an
ingredient *of that product*. Nothing checks membership in the actual formulation.

**Not doing now, deliberately:** no generator change, no data correction, no
silent edit. When picked up, the fix needs a guard in the generator plus a
reviewed correction of the 5 rows, verified individually rather than by regex.
