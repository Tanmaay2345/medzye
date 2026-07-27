// Uploads the standardized real product photos into the EXISTING
// medicine-images bucket (no new bucket created) under a `real/` prefix,
// so they don't collide with the illustration assets already stored there
// (still used for flagged/missing medicines). Caches public URLs back into
// the manifest.
import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "./lib/admin-client";

const BUCKET = "medicine-images";
const REAL_DIR = path.join(__dirname, "assets", "real");
const MANIFEST_PATH = path.join(__dirname, "assets", "real-images-manifest.json");

type ManifestEntry = { sourceFile: string; outputFile: string; kebabName: string; storagePath?: string; publicUrl?: string };

async function main() {
  const supabase = createAdminClient();
  const manifest: Record<string, ManifestEntry> = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  if (bucketErr) throw bucketErr;
  if (!buckets?.some((b) => b.name === BUCKET)) {
    throw new Error(`Bucket "${BUCKET}" does not exist. This script intentionally does not create one (existing storage architecture must be preserved).`);
  }

  let uploaded = 0;
  let skipped = 0;
  for (const [medicineName, entry] of Object.entries(manifest)) {
    const storagePath = `real/${entry.outputFile}`;
    if (entry.publicUrl && entry.storagePath === storagePath) {
      skipped++;
      continue; // already uploaded from this exact standardized file — incremental
    }

    const filePath = path.join(REAL_DIR, entry.outputFile);
    const buffer = fs.readFileSync(filePath);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: "image/webp", upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    manifest[medicineName] = { ...entry, storagePath, publicUrl: publicUrlData.publicUrl };
    uploaded++;
    console.log(`Uploaded ${medicineName} -> ${storagePath}`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nUploaded ${uploaded} new image(s), skipped ${skipped} already in bucket "${BUCKET}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
