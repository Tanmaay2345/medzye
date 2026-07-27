// Overwrites name/manufacturer/description/is_otc on the 100 existing
// `medicines` rows with realistic data. Never touches id, created_at, or
// category_id — safe to re-run (idempotent UPDATE by id).
import { createAdminClient } from "./lib/admin-client";
import { buildMedicineRows } from "./data/medicines";

async function main() {
  const supabase = createAdminClient();
  const rows = buildMedicineRows();

  const { data: existing, error: fetchError } = await supabase
    .from("medicines")
    .select("id, category_id");
  if (fetchError) throw fetchError;

  const existingByCategory = new Map<number, number>();
  for (const row of existing ?? []) {
    if (row.category_id == null) continue;
    existingByCategory.set(row.category_id, (existingByCategory.get(row.category_id) ?? 0) + 1);
  }

  let updated = 0;
  let mismatched = 0;
  for (const row of rows) {
    const match = (existing ?? []).find((m) => m.id === row.id);
    if (!match) {
      console.warn(`Skipping id ${row.id} — no matching medicines row found.`);
      mismatched++;
      continue;
    }
    if (match.category_id !== row.category_id) {
      console.warn(
        `id ${row.id}: seed category_id (${row.category_id}) does not match live category_id (${match.category_id}) — skipping to avoid moving a medicine between categories.`
      );
      mismatched++;
      continue;
    }

    const { error } = await supabase
      .from("medicines")
      .update({
        name: row.name,
        manufacturer: row.manufacturer,
        description: row.description,
        is_otc: row.is_otc,
      })
      .eq("id", row.id);

    if (error) {
      console.error(`Failed to update medicine id ${row.id}:`, error.message);
      continue;
    }
    updated++;
  }

  console.log(`Updated ${updated}/${rows.length} medicines.`);
  if (mismatched > 0) console.log(`${mismatched} rows skipped due to id/category mismatch.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
