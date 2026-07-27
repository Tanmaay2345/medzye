// Realistic INR base-price ranges per category, used to generate
// medicine_prices rows. Individual pharmacy prices are derived from a
// per-medicine base price with a small randomized variance so prices differ
// across pharmacies without being absurd.

export const categoryPriceRangeINR: Record<number, [number, number]> = {
  1: [20, 120], // Pain Relief
  2: [15, 60], // Fever
  3: [40, 150], // Cold & Cough
  4: [60, 220], // Diabetes
  5: [50, 200], // Heart Care
  6: [120, 450], // Vitamins & Supplements
  7: [30, 130], // Digestive Health
  8: [70, 220], // Skin Care
  9: [60, 180], // Eye Care
  10: [40, 250], // Women's Health
  11: [50, 160], // Children's Health
  12: [30, 110], // Allergy
  13: [60, 250], // Antibiotics
  14: [150, 400], // Respiratory Care
  15: [25, 100], // First Aid
};

/** Deterministic-ish pseudo-random in [min, max], seeded by a numeric key so re-runs are stable. */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function basePriceForCategory(categoryId: number, medicineId: number): number {
  const [min, max] = categoryPriceRangeINR[categoryId] ?? [20, 150];
  const r = seededRandom(medicineId * 7.13);
  const raw = min + r * (max - min);
  return Math.round(raw / 5) * 5; // round to nearest 5 rupees
}

/** Per-pharmacy variance: ±15% around the base price, rounded to nearest whole rupee. */
export function priceForPharmacy(basePrice: number, medicineId: number, pharmacyId: number): number {
  const r = seededRandom(medicineId * 31.7 + pharmacyId * 3.1);
  const variance = (r - 0.5) * 0.3; // -15% .. +15%
  const price = basePrice * (1 + variance);
  return Math.max(5, Math.round(price));
}
