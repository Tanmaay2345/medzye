// Populates medicine_prices with 4-8 pharmacy offers per medicine at
// realistic INR prices. Medicine and pharmacy ids are read live from the DB
// (never hardcoded) to avoid orphaned foreign keys. Existing
// (medicine_id, pharmacy_id) pairs are skipped so the script is safe to
// re-run without creating duplicates.
import { createAdminClient } from "./lib/admin-client";
import { basePriceForCategory, priceForPharmacy, seededRandom } from "./data/pharmacies-pricing";

function pickPharmacyIds(allPharmacyIds: number[], medicineId: number): number[] {
  const count = 4 + Math.floor(seededRandom(medicineId * 1.9) * 5); // 4..8
  // Deterministic shuffle keyed by medicineId so re-runs are stable.
  const shuffled = allPharmacyIds
    .map((id, index) => ({ id, sortKey: seededRandom(medicineId * 5.3 + id * 2.2 + index) }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((entry) => entry.id);
  return shuffled.slice(0, Math.min(count, allPharmacyIds.length));
}

async function main() {
  const supabase = createAdminClient();

  const [{ data: medicines, error: medErr }, { data: pharmacies, error: pharmErr }, { data: existingPrices, error: priceErr }] =
    await Promise.all([
      supabase.from("medicines").select("id, category_id"),
      supabase.from("pharmacies").select("id"),
      supabase.from("medicine_prices").select("medicine_id, pharmacy_id"),
    ]);

  if (medErr) throw medErr;
  if (pharmErr) throw pharmErr;
  if (priceErr) throw priceErr;

  const pharmacyIds = (pharmacies ?? []).map((p) => p.id);
  if (pharmacyIds.length === 0) throw new Error("No pharmacies found — cannot seed prices.");

  const existingPairs = new Set((existingPrices ?? []).map((p) => `${p.medicine_id}-${p.pharmacy_id}`));

  const rowsToInsert: { medicine_id: number; pharmacy_id: number; price: number; last_updated: string }[] = [];
  const now = new Date().toISOString();

  for (const medicine of medicines ?? []) {
    if (medicine.category_id == null) continue;
    const basePrice = basePriceForCategory(medicine.category_id, medicine.id);
    const chosenPharmacies = pickPharmacyIds(pharmacyIds, medicine.id);

    for (const pharmacyId of chosenPharmacies) {
      const key = `${medicine.id}-${pharmacyId}`;
      if (existingPairs.has(key)) continue;
      rowsToInsert.push({
        medicine_id: medicine.id,
        pharmacy_id: pharmacyId,
        price: priceForPharmacy(basePrice, medicine.id, pharmacyId),
        last_updated: now,
      });
    }
  }

  console.log(`Prepared ${rowsToInsert.length} new price rows (skipping ${existingPairs.size} already present).`);

  const BATCH_SIZE = 200;
  let inserted = 0;
  for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
    const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("medicine_prices").insert(batch);
    if (error) throw error;
    inserted += batch.length;
  }

  console.log(`Inserted ${inserted} medicine_prices rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
