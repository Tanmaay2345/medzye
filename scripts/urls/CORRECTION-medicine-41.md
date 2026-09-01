# Catalogue correction: medicine 41, Practin Syrup

`public.medicines.manufacturer`: `Sun Pharmaceutical Industries` -> `Dr. Reddy's Laboratories`

## Why the old value was wrong

Batch 5 stored no URL for this medicine. Our record said Sun Pharmaceutical
Industries; Apollo and PharmEasy both named Wockhardt Ltd and Netmeds named
Dr. Reddy's Laboratories Ltd. No source named Sun Pharma in any era.

## The ownership chain

| Step | Evidence |
|---|---|
| Practin is a **Merind Ltd** brand (Tata group) | MedIndia manufacturer index lists it under "Wockhardt Ltd. (Merind)" |
| **Wockhardt acquired Merind**, 1998 | Business Standard, "Wockhardt Buys Merind"; The Pharmaletter, "India's Wockhardt Expands With Take Over Of Merind" |
| **Dr. Reddy's acquired Practin from Wockhardt** | Announced 13 Feb 2020, completed 10 June 2020. Rs 1,850 crore for 62 branded-generics brands plus the Baddi (Himachal Pradesh) plant and the sales and marketing teams. **"Practin" is named explicitly**, alongside Zedex, Bro-zedex, Tryptomer and Biovac. Reported by Business Today, Business Standard and Pharmaceutical Business Review, and filed by Dr. Reddy's on SEC Form 6-K. |

SEC EDGAR returns HTTP 403 to automated agents, so the brand list was confirmed
from a fetchable source rather than from a search snippet.

## Reading the three pharmacy signals

| Source | Says | Assessment |
|---|---|---|
| Netmeds | Dr. Reddy's Laboratories Ltd | **Correct** -- current owner since June 2020 |
| Apollo, PharmEasy | Wockhardt Ltd | **Stale** -- the pre-June-2020 owner |
| Our catalogue | Sun Pharmaceutical Industries | **Wrong in every era** |

**The majority was wrong.** Two of three pharmacies said Wockhardt; the single
dissenting source was right. Choosing by frequency would have produced an
incorrect correction, which is why that approach was explicitly ruled out.

## Manufacturer / marketer / brand owner

The Baddi manufacturing plant transferred to Dr. Reddy's together with the
brands, so brand owner, marketer and manufacturing site all converge on
Dr. Reddy's here. There is no contract-manufacturer split of the kind seen with
Akums (Susten), Recipharm (Crocin Baby) or Encore Healthcare (Crocin Advance),
where the pharmacy's "manufacturer" field names a production site rather than the
brand owner.

## Value chosen

`Dr. Reddy's Laboratories`, matching the catalogue's short brand-owner style
(`Sun Pharmaceutical Industries`, `Micro Labs`, `Cipla`, `GSK`).

## Blast radius

None beyond the single cell. Medicine 41 had **zero** rows in
`medicine_product_urls` -- the conflict prevented any URL being stored -- so no
URL, foreign key or id was affected. Verified: 155 URL rows before and after with
an identical fingerprint, exactly one medicine row changed, and `manufacturer`
the only column changed anywhere. The four other rows reading "Sun Pharmaceutical
Industries" (50 Rosuvas, 65 Storvas, 99 Milflox, 100 Susten 200) are untouched.

## Known friction ahead

Apollo and PharmEasy still display Wockhardt. Until those listings refresh, a
future Practin batch may see a manufacturer mismatch on two of four pharmacies
even though our value is now correct.
