# Data sources for `medicine_details`

The brief asked for Indian government sources first, and said to stop and report
rather than bypass any source that has no public API or prohibits automated
access. This is that report. Every claim below was verified by request on
2026-07-28, not assumed.

## Verdict

| Source | Public API? | Used | Evidence |
|---|---|---|---|
| Jan Aushadhi | No | **No** | `/robots.txt` returns the React app shell (HTTP 200, `<div id="root">`), i.e. no robots file and a client-rendered SPA. Product data is fetched by undocumented internal XHR endpoints. |
| CDSCO | No | **No** | `/robots.txt` → HTTP 404. No published API; the drug database is behind search forms and PDF circulars. |
| National Health Portal | **Site is gone** | **No** | `www.nhp.gov.in` does not resolve (`Could not resolve host`); `nhp.gov.in` times out after 20s. The portal has been decommissioned. |
| Indian Pharmacopoeia Commission | No | **No** | `/robots.txt` → 302 to a Joomla 404 page. Monographs are sold as publications, not exposed as data. |
| **RxNorm / RxNav** (NLM) | **Yes** | **Yes** | Documented public REST API. `GET /REST/rxcui.json?name=paracetamol` → `{"rxnormId":["161"]}`. |
| **openFDA Drug Label** (FDA) | **Yes** | **Yes** | Documented public REST API. `search=openfda.generic_name:"acetaminophen"` → 3,530 label records. |
| DailyMed (NLM) | Yes | Not needed | Verified working, but openFDA already exposes the same SPL label sections in a form better suited to this pipeline. |

**Nothing was scraped.** The four Indian sources were left untouched beyond a
`robots.txt` / reachability check. Extracting their data would have meant
reverse-engineering an undocumented SPA API (Jan Aushadhi) or parsing HTML and
PDFs (CDSCO, IPC) — automated access neither documented nor permitted. That is
the limitation the brief asked to have reported instead of worked around.

## What this costs, and how it is mitigated

The two usable sources are **United States** drug databases. They do not know
Indian brand names — there is no "Dolo 650" in openFDA — and they do not carry
Indian regulatory or manufacturer detail.

The pipeline bridges that gap through the **generic composition**, which is the
part that is pharmacologically identical across markets:

```
  medicines.description        "Paracetamol 650mg tablet for fast relief…"
        │                       (curated locally, already in the database)
        ▼
  candidate tokens             paracetamol
        │
        ▼  RxNorm validation — rejects anything that is not an IN/PIN/MIN concept
  normalised ingredient        acetaminophen  (RxCUI 161)
        │
        ▼  openFDA label lookup by generic name
  label sections               indications, adverse reactions, warnings, storage
```

RxNorm is what makes this defensible rather than a guess. A word from the local
description only becomes an ingredient if RxNorm resolves it to a real
ingredient concept, and RxNorm supplies the normalisation that maps Indian
usage onto the vocabulary the FDA indexes (*paracetamol* → *acetaminophen*).
Anything that fails to resolve is never guessed at — it goes to
[manual-review.md](./manual-review.md).

Consequences worth knowing:

- **`manufacturer_details` is the one field not sourced from a drug database.**
  It is composed from the existing `medicines.manufacturer` column plus, where
  available, the labeller named on the openFDA record. Indian manufacturer
  profiles are exactly what CDSCO would have supplied, and CDSCO has no API.
- **Uses, side effects, warnings and storage describe the *ingredient*,** taken
  from the US label for that ingredient — not the specific Indian pack. This is
  accurate for the molecule and is the strongest claim these sources support.
- **Multi-vitamins, ayurvedic preparations, devices and cosmetics are not in
  RxNorm** and are reported for manual review rather than filled in.

## Copyright

openFDA and RxNorm are U.S. Government works in the public domain. Label text
is submitted by manufacturers and published by the FDA without copyright.
Extracts are kept short (600 characters, trimmed at a sentence boundary) and
attributed in the generated SQL header.

## Reproducing

```bash
npm run build:medicine-details
```

Reads `medicines`, writes `medicine_details.sql` and `manual-review.md`. It
performs no database writes of its own — importing the SQL is a separate,
deliberate step.
