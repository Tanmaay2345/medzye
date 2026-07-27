// Curated, factually-checked Indian medicine catalog used to overwrite the
// placeholder name/manufacturer/description/is_otc values on the 100
// existing `medicines` rows. Category assignment (`category_id`) and row
// `id` are NEVER changed — they're reconstructed here only to know which
// existing row each entry updates.
//
// The live DB was originally seeded in "rounds": round 0 = ids 1-15 (one
// per category, category_id === id), round 1 = ids 16-30, etc., with
// categories 1-10 getting 7 rounds and categories 11-15 getting 6 rounds.
// That gives id = round * 15 + categoryId for row `round` (0-indexed)
// within a category's list below.

export type DosageForm =
  | "tablet-strip"
  | "capsule-bottle"
  | "syrup-bottle"
  | "oral-suspension"
  | "ointment-tube"
  | "eye-drop-bottle"
  | "inhaler"
  | "first-aid"
  | "supplement-jar"
  | "liquid-bottle";

export type MedicineSeed = {
  name: string;
  manufacturer: string;
  description: string;
  is_otc: boolean;
  form: DosageForm;
};

// Keyed by the existing `categories.id` — order within each array is the
// "round" (0-indexed) used to reconstruct the row id.
export const medicinesByCategory: Record<number, MedicineSeed[]> = {
  // 1 — Pain Relief
  1: [
    { name: "Combiflam", manufacturer: "Sanofi India", description: "Combines ibuprofen and paracetamol to relieve pain, inflammation, and fever.", is_otc: false, form: "tablet-strip" },
    { name: "Voveran", manufacturer: "Novartis India", description: "Diclofenac sodium tablet used for pain and inflammation from arthritis, sprains, and muscle injuries.", is_otc: false, form: "tablet-strip" },
    { name: "Volini Gel", manufacturer: "Sun Pharma Consumer Healthcare", description: "Topical diclofenac gel for fast relief from muscle and joint pain.", is_otc: true, form: "ointment-tube" },
    { name: "Saridon", manufacturer: "Piramal Consumer Products", description: "Fast-acting tablet for headache and body ache relief.", is_otc: true, form: "tablet-strip" },
    { name: "Zerodol-P", manufacturer: "Ipca Laboratories", description: "Aceclofenac and paracetamol combination for moderate to severe pain and inflammation.", is_otc: false, form: "tablet-strip" },
    { name: "Flexon", manufacturer: "Reckitt Benckiser", description: "Ibuprofen and paracetamol tablet for body pain, headache, and fever.", is_otc: false, form: "tablet-strip" },
    { name: "Moov Pain Relief Spray", manufacturer: "Reckitt Benckiser", description: "Fast-relief spray for backache, muscle pain, and sprains.", is_otc: true, form: "liquid-bottle" },
  ],
  // 2 — Fever
  2: [
    { name: "Dolo 650", manufacturer: "Micro Labs", description: "Paracetamol 650mg tablet for fast relief from fever and mild to moderate pain.", is_otc: true, form: "tablet-strip" },
    { name: "Crocin Advance", manufacturer: "GSK", description: "Fast-dissolving paracetamol tablet for fever and headache relief.", is_otc: true, form: "tablet-strip" },
    { name: "Calpol", manufacturer: "GSK", description: "Paracetamol tablet widely used for fever and pain relief in adults.", is_otc: true, form: "tablet-strip" },
    { name: "Metacin", manufacturer: "Ipca Laboratories", description: "Paracetamol tablet for fever, headache, and body ache.", is_otc: true, form: "tablet-strip" },
    { name: "Febrex Plus", manufacturer: "East West Pharma", description: "Paracetamol-based syrup and tablet combination for fever with cold symptoms.", is_otc: true, form: "tablet-strip" },
    { name: "Paracip 650", manufacturer: "Cipla", description: "Paracetamol 650mg tablet for effective fever and pain reduction.", is_otc: true, form: "tablet-strip" },
    { name: "Pyrigesic", manufacturer: "East India Pharmaceutical Works", description: "Paracetamol tablet for symptomatic relief of fever and mild pain.", is_otc: true, form: "tablet-strip" },
  ],
  // 3 — Cold & Cough
  3: [
    { name: "Vicks Action 500", manufacturer: "Procter & Gamble", description: "Paracetamol, phenylephrine, and caffeine tablet for cold, cough, and body ache relief.", is_otc: true, form: "tablet-strip" },
    { name: "Benadryl Cough Syrup", manufacturer: "Johnson & Johnson", description: "Antihistamine cough syrup for dry cough and cold-related throat irritation.", is_otc: true, form: "syrup-bottle" },
    { name: "Ascoril LS Syrup", manufacturer: "Glenmark Pharmaceuticals", description: "Expectorant syrup with ambroxol and levosalbutamol for productive cough with breathlessness.", is_otc: false, form: "syrup-bottle" },
    { name: "Grilinctus Syrup", manufacturer: "Franco-Indian Pharmaceuticals", description: "Cough syrup combining antihistamine and cough suppressant for dry cough relief.", is_otc: false, form: "syrup-bottle" },
    { name: "Sinarest", manufacturer: "Centaur Pharmaceuticals", description: "Decongestant and antihistamine tablet for common cold and nasal congestion.", is_otc: true, form: "tablet-strip" },
    { name: "D-Cold Total", manufacturer: "Piramal Consumer Products", description: "Multi-symptom cold relief tablet for congestion, headache, and body ache.", is_otc: true, form: "tablet-strip" },
    { name: "Honitus Cough Syrup", manufacturer: "Dabur India", description: "Ayurvedic cough syrup with honey and herbal ingredients for soothing throat relief.", is_otc: true, form: "syrup-bottle" },
  ],
  // 4 — Diabetes
  4: [
    { name: "Glycomet 500", manufacturer: "USV Private Limited", description: "Metformin tablet used to control blood sugar levels in type 2 diabetes.", is_otc: false, form: "tablet-strip" },
    { name: "Glucophage", manufacturer: "Merck Limited", description: "Metformin tablet that improves insulin sensitivity for type 2 diabetes management.", is_otc: false, form: "tablet-strip" },
    { name: "Januvia", manufacturer: "MSD Pharmaceuticals", description: "Sitagliptin tablet that helps regulate blood sugar in type 2 diabetes.", is_otc: false, form: "tablet-strip" },
    { name: "Amaryl", manufacturer: "Sanofi India", description: "Glimepiride tablet that stimulates insulin release to manage type 2 diabetes.", is_otc: false, form: "tablet-strip" },
    { name: "Galvus Met", manufacturer: "Novartis India", description: "Vildagliptin and metformin combination tablet for type 2 diabetes control.", is_otc: false, form: "tablet-strip" },
    { name: "Istamet", manufacturer: "MSD Pharmaceuticals", description: "Sitagliptin and metformin combination tablet for blood sugar management.", is_otc: false, form: "tablet-strip" },
    { name: "Diamicron", manufacturer: "Servier India", description: "Gliclazide tablet that helps the pancreas release insulin for diabetes control.", is_otc: false, form: "tablet-strip" },
  ],
  // 5 — Heart Care
  5: [
    { name: "Ecosprin 75", manufacturer: "USV Private Limited", description: "Low-dose aspirin tablet used to reduce the risk of heart attack and stroke.", is_otc: false, form: "tablet-strip" },
    { name: "Amlokind-AT", manufacturer: "Mankind Pharma", description: "Amlodipine and atenolol combination tablet for high blood pressure management.", is_otc: false, form: "tablet-strip" },
    { name: "Amlong 5", manufacturer: "Micro Labs", description: "Amlodipine tablet used to treat high blood pressure and angina.", is_otc: false, form: "tablet-strip" },
    { name: "Rosuvas", manufacturer: "Sun Pharmaceutical Industries", description: "Rosuvastatin tablet used to lower cholesterol and reduce cardiovascular risk.", is_otc: false, form: "tablet-strip" },
    { name: "Storvas", manufacturer: "Sun Pharmaceutical Industries", description: "Atorvastatin tablet that helps lower LDL cholesterol levels.", is_otc: false, form: "tablet-strip" },
    { name: "Concor", manufacturer: "Merck Limited", description: "Bisoprolol tablet used to manage high blood pressure and heart conditions.", is_otc: false, form: "tablet-strip" },
    { name: "Cardace", manufacturer: "Sanofi India", description: "Ramipril tablet used to treat high blood pressure and heart failure.", is_otc: false, form: "tablet-strip" },
  ],
  // 6 — Vitamins & Supplements
  6: [
    { name: "Revital H", manufacturer: "Sun Pharma Consumer Healthcare", description: "Multivitamin and multimineral capsule for daily energy and immunity support.", is_otc: true, form: "supplement-jar" },
    { name: "Becosules Capsules", manufacturer: "Pfizer Limited", description: "Vitamin B-complex with vitamin C capsule for nutritional supplementation.", is_otc: true, form: "capsule-bottle" },
    { name: "Zincovit", manufacturer: "Apex Laboratories", description: "Multivitamin, mineral, and antioxidant tablet for general wellness.", is_otc: true, form: "supplement-jar" },
    { name: "Shelcal 500", manufacturer: "Torrent Pharmaceuticals", description: "Calcium and vitamin D3 tablet to support bone health.", is_otc: true, form: "tablet-strip" },
    { name: "Neurobion Forte", manufacturer: "Procter & Gamble Health", description: "Vitamin B1, B6, and B12 tablet for nerve health support.", is_otc: true, form: "tablet-strip" },
    { name: "Evion 400", manufacturer: "Merck Limited", description: "Vitamin E capsule that supports skin health and acts as an antioxidant.", is_otc: true, form: "capsule-bottle" },
    { name: "Supradyn", manufacturer: "Bayer", description: "Multivitamin tablet formulated to support daily energy and metabolism.", is_otc: true, form: "supplement-jar" },
  ],
  // 7 — Digestive Health
  7: [
    { name: "ENO", manufacturer: "GSK Consumer Healthcare", description: "Fruit salt antacid that provides fast relief from acidity and indigestion.", is_otc: true, form: "liquid-bottle" },
    { name: "Digene", manufacturer: "Abbott", description: "Antacid gel and tablet for relief from acidity, gas, and heartburn.", is_otc: true, form: "tablet-strip" },
    { name: "Gelusil", manufacturer: "Pfizer Limited", description: "Antacid tablet that neutralizes stomach acid for heartburn relief.", is_otc: true, form: "tablet-strip" },
    { name: "Cyclopam", manufacturer: "Ipca Laboratories", description: "Dicyclomine and paracetamol combination for relief from abdominal cramps.", is_otc: false, form: "tablet-strip" },
    { name: "Pudin Hara", manufacturer: "Dabur India", description: "Mint-based digestive remedy for indigestion, gas, and stomach discomfort.", is_otc: true, form: "liquid-bottle" },
    { name: "Liv 52", manufacturer: "Himalaya Wellness Company", description: "Herbal formulation that supports liver function and digestion.", is_otc: true, form: "tablet-strip" },
    { name: "Isabgol", manufacturer: "Dabur India", description: "Psyllium husk fiber supplement that supports healthy digestion and regularity.", is_otc: true, form: "supplement-jar" },
  ],
  // 8 — Skin Care
  8: [
    { name: "Candid-B Cream", manufacturer: "Glenmark Pharmaceuticals", description: "Antifungal and steroid combination cream for fungal skin infections.", is_otc: false, form: "ointment-tube" },
    { name: "Betnovate-N Cream", manufacturer: "GSK", description: "Steroid and antibiotic cream for inflammatory skin conditions with infection.", is_otc: false, form: "ointment-tube" },
    { name: "Soframycin Skin Cream", manufacturer: "Sanofi India", description: "Antiseptic cream for minor cuts, burns, and skin infections.", is_otc: true, form: "ointment-tube" },
    { name: "Quadriderm RF Cream", manufacturer: "Zydus Healthcare", description: "Multi-action cream combining antifungal, antibacterial, and steroid ingredients.", is_otc: false, form: "ointment-tube" },
    { name: "Panderm Plus Cream", manufacturer: "Cipla", description: "Steroid-based cream for eczema and other inflammatory skin conditions.", is_otc: false, form: "ointment-tube" },
    { name: "T-Bact Ointment", manufacturer: "Glenmark Pharmaceuticals", description: "Mupirocin antibiotic ointment for bacterial skin infections.", is_otc: false, form: "ointment-tube" },
    { name: "Itchguard Cream", manufacturer: "Reckitt Benckiser", description: "Anti-itch cream for relief from fungal infections and skin irritation.", is_otc: true, form: "ointment-tube" },
  ],
  // 9 — Eye Care
  9: [
    { name: "Refresh Tears Eye Drops", manufacturer: "Abbott India", description: "Lubricating eye drops for relief from dryness and irritation.", is_otc: true, form: "eye-drop-bottle" },
    { name: "Moxicip Eye Drops", manufacturer: "Cipla", description: "Moxifloxacin antibiotic eye drops for bacterial eye infections.", is_otc: false, form: "eye-drop-bottle" },
    { name: "Genteal Eye Drops", manufacturer: "Alcon Laboratories (India)", description: "Lubricating eye drops that relieve dryness and eye strain.", is_otc: true, form: "eye-drop-bottle" },
    { name: "I-Kul Eye Drops", manufacturer: "FDC Limited", description: "Antihistamine eye drops for relief from allergic conjunctivitis.", is_otc: false, form: "eye-drop-bottle" },
    { name: "Lubrex Eye Drops", manufacturer: "Sunways India", description: "Lubricating eye drops for comfort against dryness and irritation.", is_otc: true, form: "eye-drop-bottle" },
    { name: "Tobrex Eye Drops", manufacturer: "Alcon Laboratories (India)", description: "Tobramycin antibiotic eye drops for bacterial eye infections.", is_otc: false, form: "eye-drop-bottle" },
    { name: "Milflox Eye Drops", manufacturer: "Micro Labs", description: "Moxifloxacin eye drops used to treat bacterial conjunctivitis.", is_otc: false, form: "eye-drop-bottle" },
  ],
  // 10 — Women's Health
  10: [
    { name: "Meftal Spas", manufacturer: "Blue Cross Laboratories", description: "Mefenamic acid and dicyclomine tablet for relief from menstrual cramps.", is_otc: false, form: "tablet-strip" },
    { name: "I-Pill", manufacturer: "Mankind Pharma", description: "Emergency contraceptive pill for use after unprotected intercourse.", is_otc: true, form: "tablet-strip" },
    { name: "Unwanted 72", manufacturer: "Mankind Pharma", description: "Emergency contraceptive pill effective within 72 hours.", is_otc: true, form: "tablet-strip" },
    { name: "Evecare Syrup", manufacturer: "Himalaya Wellness Company", description: "Herbal syrup that supports menstrual health and hormonal balance.", is_otc: true, form: "syrup-bottle" },
    { name: "Folvite", manufacturer: "Sanofi India", description: "Folic acid tablet commonly recommended for women's nutritional health.", is_otc: true, form: "tablet-strip" },
    { name: "Duphaston", manufacturer: "Abbott", description: "Dydrogesterone tablet prescribed for hormonal and menstrual disorders.", is_otc: false, form: "tablet-strip" },
    { name: "Susten 200", manufacturer: "Sun Pharmaceutical Industries", description: "Progesterone capsule used to support pregnancy and hormonal therapy.", is_otc: false, form: "capsule-bottle" },
  ],
  // 11 — Children's Health
  11: [
    { name: "Crocin Pediatric Drops", manufacturer: "GSK", description: "Paracetamol drops formulated for fever relief in infants and young children.", is_otc: true, form: "oral-suspension" },
    { name: "Calpol 250 Syrup", manufacturer: "GSK", description: "Paracetamol syrup for fever and pain relief in children.", is_otc: true, form: "syrup-bottle" },
    { name: "Practin Syrup", manufacturer: "Sun Pharmaceutical Industries", description: "Cyproheptadine syrup used as an appetite stimulant in children.", is_otc: false, form: "syrup-bottle" },
    { name: "Zincovit Kid Syrup", manufacturer: "Apex Laboratories", description: "Multivitamin syrup formulated for children's growth and immunity.", is_otc: true, form: "syrup-bottle" },
    { name: "Polybion Syrup", manufacturer: "Procter & Gamble Health", description: "Vitamin B-complex syrup that supports children's nutrition.", is_otc: true, form: "syrup-bottle" },
    { name: "Cremaffin Syrup", manufacturer: "Abbott India", description: "Mild laxative syrup for relief from occasional constipation in children and adults.", is_otc: true, form: "syrup-bottle" },
  ],
  // 12 — Allergy
  12: [
    { name: "Cetzine", manufacturer: "Glenmark Pharmaceuticals", description: "Cetirizine tablet for relief from allergy symptoms like sneezing and itching.", is_otc: true, form: "tablet-strip" },
    { name: "Allegra 120", manufacturer: "Sanofi India", description: "Fexofenadine tablet for non-drowsy relief from seasonal allergies.", is_otc: true, form: "tablet-strip" },
    { name: "Avil 25", manufacturer: "Sanofi India", description: "Pheniramine antihistamine tablet for allergic reactions and itching.", is_otc: true, form: "tablet-strip" },
    { name: "Montair-LC", manufacturer: "Cipla", description: "Montelukast and levocetirizine combination for allergic rhinitis relief.", is_otc: false, form: "tablet-strip" },
    { name: "Levocet", manufacturer: "FDC Limited", description: "Levocetirizine tablet for relief from allergic symptoms.", is_otc: true, form: "tablet-strip" },
    { name: "Teczine", manufacturer: "Torrent Pharmaceuticals", description: "Cetirizine tablet for relief from allergies and hives.", is_otc: true, form: "tablet-strip" },
  ],
  // 13 — Antibiotics
  13: [
    { name: "Augmentin 625 Duo", manufacturer: "GSK", description: "Amoxicillin and clavulanic acid antibiotic for bacterial infections.", is_otc: false, form: "tablet-strip" },
    { name: "Azithral 500", manufacturer: "Alkem Laboratories", description: "Azithromycin antibiotic used to treat a range of bacterial infections.", is_otc: false, form: "tablet-strip" },
    { name: "Ciplox 500", manufacturer: "Cipla", description: "Ciprofloxacin antibiotic tablet for bacterial infections.", is_otc: false, form: "tablet-strip" },
    { name: "Taxim-O", manufacturer: "Alkem Laboratories", description: "Cefixime antibiotic tablet for respiratory and urinary tract infections.", is_otc: false, form: "tablet-strip" },
    { name: "Norflox-TZ", manufacturer: "Cipla", description: "Norfloxacin and tinidazole combination antibiotic for gastrointestinal infections.", is_otc: false, form: "tablet-strip" },
    { name: "Zifi 200", manufacturer: "FDC Limited", description: "Cefixime antibiotic tablet for bacterial infections.", is_otc: false, form: "tablet-strip" },
  ],
  // 14 — Respiratory Care
  14: [
    { name: "Asthalin Inhaler", manufacturer: "Cipla", description: "Salbutamol inhaler that provides quick relief from asthma and bronchospasm.", is_otc: false, form: "inhaler" },
    { name: "Foracort Inhaler", manufacturer: "Cipla", description: "Formoterol and budesonide inhaler for long-term asthma management.", is_otc: false, form: "inhaler" },
    { name: "Duolin Respules", manufacturer: "Cipla", description: "Ipratropium and levosalbutamol solution for nebulization in respiratory conditions.", is_otc: false, form: "liquid-bottle" },
    { name: "Ventolin Inhaler", manufacturer: "GSK", description: "Salbutamol inhaler for fast relief from asthma symptoms.", is_otc: false, form: "inhaler" },
    { name: "Deriphyllin Retard", manufacturer: "Zuventus Healthcare", description: "Theophylline-based tablet for management of asthma and bronchitis.", is_otc: false, form: "tablet-strip" },
    { name: "Budecort Inhaler", manufacturer: "Cipla", description: "Budesonide inhaler used for long-term control of asthma inflammation.", is_otc: false, form: "inhaler" },
  ],
  // 15 — First Aid
  15: [
    { name: "Betadine Ointment", manufacturer: "Win-Medicare", description: "Povidone-iodine antiseptic ointment for wound care and infection prevention.", is_otc: true, form: "ointment-tube" },
    { name: "Savlon Antiseptic Liquid", manufacturer: "ITC Limited", description: "Antiseptic liquid used for cleaning wounds and preventing infection.", is_otc: true, form: "liquid-bottle" },
    { name: "Dettol Antiseptic Liquid", manufacturer: "Reckitt Benckiser", description: "Multipurpose antiseptic liquid for wound cleaning and disinfection.", is_otc: true, form: "liquid-bottle" },
    { name: "Band-Aid", manufacturer: "Johnson & Johnson", description: "Adhesive bandages for covering and protecting minor cuts and wounds.", is_otc: true, form: "first-aid" },
    { name: "Burnol Cream", manufacturer: "Dr. Morepen Laboratories", description: "Antiseptic cream formulated for the treatment of minor burns.", is_otc: true, form: "ointment-tube" },
    { name: "Hansaplast", manufacturer: "Beiersdorf India", description: "Adhesive plasters and bandages for minor wound protection.", is_otc: true, form: "first-aid" },
  ],
};

export type MedicineRow = MedicineSeed & { id: number; category_id: number };

/** Reconstructs {id, category_id, ...seed} for every entry, matching the DB's existing id/category_id layout exactly. */
export function buildMedicineRows(): MedicineRow[] {
  const rows: MedicineRow[] = [];
  for (const [categoryIdStr, seeds] of Object.entries(medicinesByCategory)) {
    const categoryId = Number(categoryIdStr);
    seeds.forEach((seed, round) => {
      rows.push({ id: round * 15 + categoryId, category_id: categoryId, ...seed });
    });
  }
  return rows.sort((a, b) => a.id - b.id);
}
