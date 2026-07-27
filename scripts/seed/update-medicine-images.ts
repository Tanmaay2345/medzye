// Assigns each medicine's `image` column from the uploaded dosage-form
// image (via the manifest built by upload-images.ts). This is the ONLY
// script that writes medicines.image — adding a new image later is just:
// drop a new asset, update the manifest/sourcing, re-run this one script.
import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "./lib/admin-client";
import { buildMedicineRows } from "./data/medicines";

const MANIFEST_PATH = path.join(__dirname, "assets", "manifest.json");

async function main() {
  const manifest: { forms: Record<string, { publicUrl?: string }> } = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf8")
  );

  const rows = buildMedicineRows();
  const supabase = createAdminClient();

  let updated = 0;
  for (const row of rows) {
    const publicUrl = manifest.forms[row.form]?.publicUrl;
    if (!publicUrl) {
      console.warn(`No uploaded image found for form "${row.form}" (medicine id ${row.id}) — skipping.`);
      continue;
    }

    const { error } = await supabase.from("medicines").update({ image: publicUrl }).eq("id", row.id);
    if (error) {
      console.error(`Failed to update image for medicine id ${row.id}:`, error.message);
      continue;
    }
    updated++;
  }

  console.log(`Updated image for ${updated}/${rows.length} medicines.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
