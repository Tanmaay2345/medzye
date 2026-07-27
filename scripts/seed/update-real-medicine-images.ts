// Updates medicines.image (ONLY that column) to the real product photo URL
// for every "confirmed" match. Flagged and missing medicines are left
// untouched — they keep their current illustration image until reviewed.
import { createAdminClient } from "./lib/admin-client";
import { buildMedicineRows } from "./data/medicines";
import { REAL_IMAGE_MATCHES } from "./data/real-image-matches";
import fs from "node:fs";
import path from "node:path";

const MANIFEST_PATH = path.join(__dirname, "assets", "real-images-manifest.json");

async function main() {
  const manifest: Record<string, { publicUrl?: string }> = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const rows = buildMedicineRows();
  const byName = new Map(rows.map((r) => [r.name, r]));
  const supabase = createAdminClient();

  const { data: current, error: fetchErr } = await supabase.from("medicines").select("id, image");
  if (fetchErr) throw fetchErr;
  const currentImageById = new Map((current ?? []).map((m) => [m.id, m.image]));

  let updated = 0;
  let alreadyCorrect = 0;
  let skipped = 0;
  for (const match of REAL_IMAGE_MATCHES) {
    if (match.status !== "confirmed") {
      skipped++;
      continue;
    }
    const row = byName.get(match.medicineName);
    if (!row) {
      console.warn(`No DB row found for "${match.medicineName}" — skipping.`);
      continue;
    }
    const publicUrl = manifest[match.medicineName]?.publicUrl;
    if (!publicUrl) {
      console.warn(`No uploaded URL found for "${match.medicineName}" — skipping.`);
      continue;
    }

    if (currentImageById.get(row.id) === publicUrl) {
      alreadyCorrect++;
      continue; // incremental: DB already reflects this exact image, nothing to write
    }

    const { error } = await supabase.from("medicines").update({ image: publicUrl }).eq("id", row.id);
    if (error) {
      console.error(`Failed to update id ${row.id} (${match.medicineName}):`, error.message);
      continue;
    }
    updated++;
    console.log(`Updated ${match.medicineName} (id ${row.id})`);
  }

  console.log(`\nUpdated ${updated} medicine row(s), ${alreadyCorrect} already correct, ${skipped} left untouched (flagged/missing — still on illustration).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
