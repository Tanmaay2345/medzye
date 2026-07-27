// Maps each medicine name to its source file in "Medicine Image/" (the
// user-supplied local folder of real product photos), with a status from
// the visual verification pass (not just filename matching — every image
// was actually viewed and compared against name/strength/form/manufacturer
// before being marked "confirmed").
//
// "flagged" entries are confirmed matches that still need a human decision
// before going live, for one of two reasons:
//   - watermark: the photo has a visible third-party retailer logo baked
//     into it (Apollo Pharmacy or 1mg) — uploading as-is would display a
//     competitor's brand mark on Medyze's own product cards.
//   - mismatch: the depicted product differs materially from the DB entry
//     (different dosage form or different combination/strength), so using
//     it would show the wrong product on that medicine's page.
//
// "missing" means no image file exists for that medicine at all.
export type MatchStatus = "confirmed" | "flagged" | "missing";

export type ImageMatch = {
  medicineName: string;
  filename: string | null;
  status: MatchStatus;
  reason?: string;
};

export const REAL_IMAGE_MATCHES: ImageMatch[] = [
  { medicineName: "Allegra 120", filename: "Allegra 120.webp", status: "confirmed" },
  { medicineName: "Amaryl", filename: "Amaryl.webp", status: "confirmed" },
  { medicineName: "Amlokind-AT", filename: "Amlokind-AT.avif", status: "confirmed" },
  { medicineName: "Amlong 5", filename: "Amlong 5.webp", status: "confirmed" },
  { medicineName: "Ascoril LS Syrup", filename: "Ascoril LS Syrup.jpeg", status: "confirmed" },
  { medicineName: "Asthalin Inhaler", filename: "Asthalin Inhaler.jpeg", status: "confirmed" },
  { medicineName: "Augmentin 625 Duo", filename: "Augmentin 625.jpeg", status: "confirmed" },
  { medicineName: "Avil 25", filename: "Avil 25.jpg", status: "confirmed" },
  { medicineName: "Azithral 500", filename: "Azithral 500, .jpg", status: "flagged", reason: "mismatch (2nd attempt, still wrong): latest replacement box reads \"Fezirag-500\" (Stelon), not \"Azithral 500\" (Alkem) — yet another different registered brand for the same generic (azithromycin 500mg)" },
  { medicineName: "Band-Aid", filename: "Band-Aid.jpeg", status: "confirmed" },
  { medicineName: "Becosules Capsules", filename: "Becosules Capsules.webp", status: "confirmed" },
  { medicineName: "Benadryl Cough Syrup", filename: "Benadryl Cough Syrup.jpeg", status: "confirmed" },
  { medicineName: "Betadine Ointment", filename: "Betadine Ointment.webp", status: "confirmed" },
  { medicineName: "Betnovate-N Cream", filename: "Betnovate-N Cream.jpeg", status: "confirmed" },
  { medicineName: "Budecort Inhaler", filename: "Budecort Inhaler.webp", status: "confirmed" },
  { medicineName: "Burnol Cream", filename: "Burnol Cream.webp", status: "confirmed" },
  { medicineName: "Calpol 250 Syrup", filename: "Calpol 250 Syrup.jpg", status: "confirmed" },
  { medicineName: "Calpol", filename: "Calpol.webp", status: "confirmed" },
  { medicineName: "Candid-B Cream", filename: "Candid-B Cream.webp", status: "confirmed" },
  { medicineName: "Cardace", filename: "Cardace.jpg", status: "flagged", reason: "mismatch (2nd attempt, unchanged): the \"new\" file is byte-identical (same MD5) to the previously-rejected image — still \"Enalapril Maleate\" by Zafa Pharmaceutical Laboratories, Karachi, PAKISTAN, not Ramipril by Sanofi India" },
  { medicineName: "Cetzine", filename: " Cetzine.jpeg", status: "flagged", reason: "mismatch (2nd attempt, still wrong): latest replacement is watermark-free but is \"Cetzine BM\" (Bilastine 20mg + Montelukast 10mg, manufactured by Akums Drugs & Pharmaceuticals, marketed by Dr. Reddy's) — a different combination drug from a different manufacturer than the catalog's plain Cetirizine/Glenmark entry" },
  { medicineName: "Ciplox 500", filename: "Ciplox 500.webp", status: "confirmed" },
  { medicineName: "Combiflam", filename: "Combiflam.webp", status: "confirmed" },
  { medicineName: "Concor", filename: "Concor.jpg", status: "confirmed" },
  { medicineName: "Cremaffin Syrup", filename: "Cremaffin Syrup.jpg", status: "confirmed" },
  { medicineName: "Crocin Advance", filename: "Crocin Advance.jpeg", status: "confirmed" },
  { medicineName: "Crocin Pediatric Drops", filename: "Crocin Pediatric Drops.avif", status: "confirmed" },
  { medicineName: "Cyclopam", filename: "Cyclopam.webp", status: "confirmed" },
  { medicineName: "D-Cold Total", filename: "D-Cold Total.jpeg", status: "confirmed" },
  { medicineName: "Deriphyllin Retard", filename: "Deriphyllin Retard.webp", status: "confirmed" },
  { medicineName: "Dettol Antiseptic Liquid", filename: "Dettol Antiseptic Liquid.webp", status: "confirmed" },
  { medicineName: "Diamicron", filename: "Diamicron.jpeg", status: "confirmed" },
  { medicineName: "Digene", filename: "Digene.jpeg", status: "confirmed" },
  { medicineName: "Dolo 650", filename: "Dolo 650.jpg", status: "confirmed" },
  { medicineName: "Duolin Respules", filename: "Duolin Respules.jpeg", status: "confirmed" },
  { medicineName: "Duphaston", filename: "Duphaston.jpeg", status: "confirmed" },
  { medicineName: "Ecosprin 75", filename: "Ecosprin 75.webp", status: "confirmed" },
  { medicineName: "Evecare Syrup", filename: "Evecare Syrup.webp", status: "confirmed" },
  { medicineName: "Evion 400", filename: "Evion 400.jpg", status: "confirmed" },
  { medicineName: "Febrex Plus", filename: "Febrex Plus.webp", status: "confirmed" },
  { medicineName: "Flexon", filename: ", Flexon.webp", status: "confirmed" },
  { medicineName: "Folvite", filename: "Folvite.jpg", status: "confirmed" },
  { medicineName: "Foracort Inhaler", filename: "Foracort Inhaler.jpg", status: "confirmed" },
  { medicineName: "Galvus Met", filename: "Galvus Met.webp", status: "confirmed" },
  { medicineName: "Gelusil", filename: "Gelusil.jpeg", status: "confirmed" },
  { medicineName: "Genteal Eye Drops", filename: "Genteal Eye Drops.jpeg", status: "confirmed" },
  { medicineName: "Glucophage", filename: "Glucophage.webp", status: "confirmed" },
  { medicineName: "Grilinctus Syrup", filename: "Grilinctus Syrup.webp", status: "confirmed" },
  { medicineName: "Hansaplast", filename: "Hansaplast.webp", status: "confirmed" },
  { medicineName: "Honitus Cough Syrup", filename: "Honitus Cough Syrup.jpg", status: "confirmed" },
  { medicineName: "I-Kul Eye Drops", filename: "I-Kul Eye Drops.jpeg", status: "confirmed" },
  { medicineName: "I-Pill", filename: "I-Pill.png", status: "confirmed" },
  { medicineName: "Isabgol", filename: "Isabgol.jpeg", status: "confirmed" },
  { medicineName: "Istamet", filename: "Istamet.jpeg", status: "confirmed" },
  { medicineName: "Itchguard Cream", filename: "Itchguard Cream.jpeg", status: "confirmed" },
  { medicineName: "Januvia", filename: "Januvia.jpeg", status: "confirmed" },
  { medicineName: "Levocet", filename: "Levocet.jpeg", status: "confirmed" },
  { medicineName: "Liv 52", filename: "Liv 52.webp", status: "confirmed" },
  { medicineName: "Lubrex Eye Drops", filename: "Lubrex Eye Drops.jpeg", status: "confirmed" },
  { medicineName: "Meftal Spas", filename: "Meftal Spas.webp", status: "confirmed" },
  { medicineName: "Metacin", filename: "Metacin.avif", status: "confirmed" },
  { medicineName: "Milflox Eye Drops", filename: "Milflox Eye Drops.jpeg", status: "confirmed" },
  { medicineName: "Montair-LC", filename: "Montair-LC.jpeg", status: "confirmed" },
  { medicineName: "Moov Pain Relief Spray", filename: "Moov Pain Relief Spray.webp", status: "confirmed" },
  { medicineName: "Moxicip Eye Drops", filename: "Moxicip Eye Drops.webp", status: "confirmed" },
  { medicineName: "Neurobion Forte", filename: "Neurobion Forte.jpeg", status: "confirmed" },
  { medicineName: "Norflox-TZ", filename: "Norflox-TZ.jpg", status: "confirmed" },
  { medicineName: "Panderm Plus Cream", filename: "Panderm Plus Cream.webp", status: "confirmed" },
  { medicineName: "Paracip 650", filename: "Paracip 650.webp", status: "confirmed" },
  { medicineName: "Polybion Syrup", filename: "Polybion Syrup.jpeg", status: "confirmed" },
  { medicineName: "Practin Syrup", filename: "Practin Syrup.jpeg", status: "confirmed" },
  { medicineName: "Pudin Hara", filename: "Pudin Hara.jpeg", status: "confirmed" },
  { medicineName: "Pyrigesic", filename: "Pyrigesic.avif", status: "confirmed" },
  { medicineName: "Quadriderm RF Cream", filename: "Quadriderm RF Cream.webp", status: "confirmed" },
  { medicineName: "Refresh Tears Eye Drops", filename: "Refresh Tears Eye Drops.webp", status: "confirmed" },
  { medicineName: "Revital H", filename: "Revital H.webp", status: "confirmed" },
  { medicineName: "Rosuvas", filename: "Rosuvas.jpeg", status: "confirmed" },
  { medicineName: "Saridon", filename: "Saridon.avif", status: "confirmed" },
  { medicineName: "Savlon Antiseptic Liquid", filename: "Savlon Antiseptic Liquid.jpeg", status: "confirmed" },
  { medicineName: "Shelcal 500", filename: "Shelcal 500.jpg", status: "confirmed" },
  { medicineName: "Sinarest", filename: "Sinarest.jpeg", status: "confirmed" },
  { medicineName: "Soframycin Skin Cream", filename: "Soframycin Skin Cream.webp", status: "confirmed" },
  { medicineName: "Storvas", filename: "Storvas.avif", status: "confirmed" },
  { medicineName: "Supradyn", filename: "Supradyn.jpeg", status: "confirmed" },
  { medicineName: "Susten 200", filename: "Susten 200.webp", status: "confirmed" },
  { medicineName: "T-Bact Ointment", filename: "T-Bact Ointment.jpg", status: "confirmed" },
  { medicineName: "Taxim-O", filename: "Taxim-O.webp", status: "confirmed" },
  { medicineName: "Teczine", filename: "Teczine.jpeg", status: "confirmed" },
  { medicineName: "Tobrex Eye Drops", filename: "Tobrex Eye Drops.jpeg", status: "confirmed" },
  { medicineName: "Unwanted 72", filename: "Unwanted 72.jpeg", status: "confirmed" },
  { medicineName: "Ventolin Inhaler", filename: "Ventolin Inhaler.webp", status: "confirmed" },
  { medicineName: "Vicks Action 500", filename: "Vicks Action 500.jpg", status: "confirmed" },
  { medicineName: "Volini Gel", filename: "Volini Gel.webp", status: "confirmed" },
  { medicineName: "Voveran", filename: " Voveran,.jpeg", status: "confirmed" },
  { medicineName: "Zerodol-P", filename: "Zerodol-P.jpeg", status: "confirmed" },
  { medicineName: "Zincovit Kid Syrup", filename: "Zincovit Kid Syrup.jpg", status: "confirmed" },
  { medicineName: "Zincovit", filename: "Zincovit.jpeg", status: "confirmed" },
  { medicineName: "ENO", filename: "eno.webp", status: "confirmed" },
  { medicineName: "Glycomet 500", filename: "glycomet-500mg-strip-of-10-tablets-box-front-1-1756904771-non-watermarked.webp", status: "confirmed" },
  { medicineName: "Zifi 200", filename: " Zifi 200 .jpeg", status: "confirmed" },
];
