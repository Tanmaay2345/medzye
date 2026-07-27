// End-to-end verification using the REAL, unmodified app query layer
// (lib/queries/*.ts) via the app's normal anon/publishable client — proving
// RLS SELECT policies and the existing frontend data path work unchanged
// with the newly seeded data.
import { getCategories } from "../../lib/queries/categories";
import { getDailyEssentials, getMedicinesByCategory, getMedicineById } from "../../lib/queries/medicines";
import { getOffersForMedicine } from "../../lib/queries/pharmacies";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  OK  ${message}`);
  } else {
    console.error(`FAIL  ${message}`);
    failures++;
  }
}

async function fetchStatus(url: string): Promise<{ ok: boolean; status: number; contentType: string | null }> {
  const res = await fetch(url);
  return { ok: res.ok, status: res.status, contentType: res.headers.get("content-type") };
}

async function main() {
  console.log("1. Categories");
  const categories = await getCategories();
  check(categories.length === 15, `getCategories() returns 15 categories (got ${categories.length})`);

  console.log("\n2. Medicines per category + images/prices");
  let totalMedicines = 0;
  let medicinesWithImage = 0;
  let medicinesWithPrice = 0;
  for (const category of categories) {
    const medicines = await getMedicinesByCategory(category.id);
    totalMedicines += medicines.length;
    for (const medicine of medicines) {
      if (medicine.image) medicinesWithImage++;
      if (medicine.lowest_price != null) medicinesWithPrice++;
    }
  }
  check(totalMedicines === 100, `Total medicines across categories is 100 (got ${totalMedicines})`);
  check(medicinesWithImage === totalMedicines, `All medicines have a non-null image (${medicinesWithImage}/${totalMedicines})`);
  check(medicinesWithPrice === totalMedicines, `All medicines have a lowest_price (${medicinesWithPrice}/${totalMedicines})`);

  console.log("\n3. Daily essentials");
  const essentials = await getDailyEssentials(10);
  check(essentials.length === 10, `getDailyEssentials() returns 10 items (got ${essentials.length})`);

  console.log("\n4. Medicine detail + pharmacy offers (sample)");
  const sampleIds = [1, 25, 50, 75, 100];
  for (const id of sampleIds) {
    const medicine = await getMedicineById(id);
    check(medicine !== null, `getMedicineById(${id}) resolves`);
    if (!medicine) continue;
    const offers = await getOffersForMedicine(id);
    check(offers.length >= 1, `getOffersForMedicine(${id}) returns >=1 offer (got ${offers.length}) for "${medicine.name}"`);
  }

  console.log("\n5. Live image URL checks (sample)");
  const allMedicines = await Promise.all(sampleIds.map((id) => getMedicineById(id)));
  for (const medicine of allMedicines) {
    if (!medicine?.image) continue;
    const { ok, status, contentType } = await fetchStatus(medicine.image);
    check(ok && !!contentType?.startsWith("image/"), `${medicine.name}: image URL returns ${status} ${contentType} (${medicine.image})`);
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
