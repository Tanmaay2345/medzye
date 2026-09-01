# Catalogue correction: medicine 9, Refresh Tears Eye Drops

`public.medicines.manufacturer`: `Abbott India` -> `Allergan India`

## Why the old value was wrong

Batch 4 could not store any URL for this medicine: all four pharmacies named
Allergan as the marketer while our record said Abbott India, and a manufacturer
conflict is a rejection under the acceptance rules. Investigation confirmed the
catalogue was at fault, not the pharmacies.

Evidence, deliberately not limited to pharmacy listings:

- **FDA DailyMed** label for REFRESH TEARS(R) gives the labeler as
  **"Allergan, Inc."**, carboxymethylcellulose sodium 0.5%. It contains no
  mention of Abbott or AbbVie.
- **AbbVie's own newsroom** publishes "Allergan Expands REFRESH(R) Portfolio".
- **Allergan Inc. SEC filings** list REFRESH among its brands.
- All four Indian pharmacies name Allergan India Pvt Ltd (Apollo: Allergan
  Healthcare India Pvt Ltd). None mentions Abbott.

## Why "Abbott" was plausible enough to survive seeding

SEC filings confirm **AbbVie was spun off from Abbott Laboratories on
1 January 2013** and has been a separate company since, and **AbbVie acquired
Allergan on 8 May 2020**. The true ownership chain is Refresh Tears -> Allergan
-> AbbVie. "Abbott" and "AbbVie" differ by three letters and share real history,
so the substitution reads as credible until checked. This is the same class of
error as Sunways for Lubrex and Ipca for Metacin.

## Why this is a manufacturer-field change and not a convention mismatch

`medicines` has a `manufacturer` column and **no `marketer` column**. Across the
34 medicines with accepted URLs, that column has consistently been matched
against each pharmacy's *marketer* field, and contract manufacturers have been
deliberately rejected (Akums for Susten, Recipharm for Crocin Baby, Encore
Healthcare for Crocin Advance). The column therefore holds the brand
owner/marketer, and under that convention no contract-manufacturing relationship
could explain "Abbott" here.

The catalogue's other Abbott rows -- 22 Digene, 85 Duphaston, 86 Cremaffin Syrup
-- are genuine Abbott brands and are untouched. Medicine 9 was the sole outlier.

## Value chosen

`Allergan India`, matching the catalogue's existing short brand-owner style
(`Abbott India`, `Novartis India`, `Sanofi India`, `Beiersdorf India`) and what
all four pharmacies display today.

Known future drift: the Indian entity is mid-transition. Apollo already says
"Allergan Healthcare India Pvt Ltd" and "AbbVie Therapeutics India Private
Limited" has begun to appear. Correct today; will need revisiting, like
GSK -> Haleon and J&J -> JNTL.

## Blast radius

None beyond the single cell. Medicine 9 had **zero** rows in
`medicine_product_urls` -- the conflict meant no URL was ever stored -- so no URL,
foreign key, or id was affected. Verified: 128 URL rows before and after with an
identical content fingerprint, exactly one medicine row changed, and
`manufacturer` the only column changed anywhere.

## Also checked, no change needed

**16 Voveran.** 1mg named Dr. Reddy's while Apollo named Novartis. Dr. Reddy's
held an exclusive sales and distribution agreement with Novartis India from
February 2022 covering Voveran, terminating after 30 September 2026. Voveran
remains a Novartis brand and our value is correct.

**18 Benadryl.** Apollo names JNTL Consumer Health (India), the post-Kenvue
successor to Johnson & Johnson's consumer arm, while Netmeds and PharmEasy still
say Johnson & Johnson. Entity drift, not an error. Left as is.
