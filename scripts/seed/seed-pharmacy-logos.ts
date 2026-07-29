// Pharmacy logo pipeline — the same three-phase shape as the medicine image
// pipeline (standardize -> upload -> write URL back to the DB), reusing the
// same admin client, the same `medicine-images` bucket, and the same
// manifest-for-traceability convention.
//
// Logos go under a `brand-images/` prefix so they never mix with medicine
// artwork (which lives at the bucket root and under `real/`).
//
// The `pharmacies` table already exists and is referenced by
// medicine_prices.pharmacy_id, so this only fills in its `logo` column —
// no schema change, no new table, no FK churn.
//
// Adding a pharmacy later needs no frontend work: drop a logo in
// "Brand image/", insert a pharmacies row, re-run this script.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createAdminClient } from "./lib/admin-client";

const BUCKET = "medicine-images";
const STORAGE_PREFIX = "brand-images";
const SRC_DIR = path.join(__dirname, "..", "..", "Brand image ");
const OUT_DIR = path.join(__dirname, "assets", "brand");
const MANIFEST_PATH = path.join(__dirname, "assets", "pharmacy-logos-manifest.json");

// Logos render inside a 56px circle. 256px square keeps them crisp on 3x
// displays; alpha is preserved so the circle's white background shows
// through instead of a baked-in box.
const CANVAS = 256;

type ManifestEntry = {
  sourceFile: string;
  outputFile: string;
  storagePath: string;
  publicUrl: string;
  pharmacyId: number;
  pharmacyName: string;
};

/** Same normalization used to match medicine filenames: case- and punctuation-insensitive. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]/g, "");
}

function toKebabCase(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const supabase = createAdminClient();

  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  if (bucketErr) throw bucketErr;
  if (!buckets?.some((b) => b.name === BUCKET)) {
    throw new Error(`Bucket "${BUCKET}" does not exist — this script reuses the existing bucket and never creates one.`);
  }

  const { data: pharmacies, error: pharmErr } = await supabase
    .from("pharmacies")
    .select("id, name, logo")
    .order("id");
  if (pharmErr) throw pharmErr;

  const files = fs.readdirSync(SRC_DIR).filter((f) => !f.startsWith("."));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest: Record<string, ManifestEntry> = {};
  const unmatchedFiles: string[] = [];

  for (const sourceFile of files) {
    const match = (pharmacies ?? []).find(
      (p) => p.name && normalize(p.name) === normalize(sourceFile)
    );
    if (!match) {
      unmatchedFiles.push(sourceFile);
      continue;
    }

    const outputFile = `${toKebabCase(match.name!)}.webp`;
    const buffer = await sharp(path.join(SRC_DIR, sourceFile))
      .resize(CANVAS, CANVAS, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .webp({ quality: 92 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, outputFile), buffer);

    const storagePath = `${STORAGE_PREFIX}/${outputFile}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: "image/webp", upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    if (match.logo !== publicUrl) {
      const { error: updateError } = await supabase
        .from("pharmacies")
        .update({ logo: publicUrl })
        .eq("id", match.id);
      if (updateError) throw updateError;
    }

    manifest[match.name!] = {
      sourceFile,
      outputFile,
      storagePath,
      publicUrl,
      pharmacyId: match.id,
      pharmacyName: match.name!,
    };
    console.log(`${match.name} (id ${match.id}) -> ${storagePath}`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  const linked = Object.keys(manifest).length;
  console.log(`\nLinked ${linked}/${files.length} logo file(s) to pharmacies.`);

  if (unmatchedFiles.length > 0) {
    console.log(`\nLogo files with no matching pharmacies row (not uploaded):`);
    for (const f of unmatchedFiles) console.log(`  - ${f}`);
  }

  const withoutLogo = (pharmacies ?? []).filter((p) => !manifest[p.name ?? ""]);
  if (withoutLogo.length > 0) {
    console.log(`\nPharmacies still without a logo (card falls back to the Store icon):`);
    for (const p of withoutLogo) console.log(`  - ${p.name} (id ${p.id})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
