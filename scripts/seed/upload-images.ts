// Creates the `medicine-images` Storage bucket (if missing) and uploads one
// optimized raster image per dosage form (from the sourcing manifest),
// caching each public URL back into assets/manifest.json.
//
// Rasterized to WebP rather than uploaded as raw SVG: Next.js's <Image>
// component refuses to render SVG sources unless
// `images.dangerouslyAllowSVG` is enabled in next.config.ts (a deliberate
// XSS guard) — and this project's constraints rule out touching
// next.config.ts. WebP keeps the existing `remotePatterns` wildcard working
// with zero app-side changes.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createAdminClient } from "./lib/admin-client";
import type { FormSourcing } from "./source-images";

const BUCKET = "medicine-images";
const ASSETS_DIR = path.join(__dirname, "assets");
const MANIFEST_PATH = path.join(ASSETS_DIR, "manifest.json");

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" already exists.`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "2MB",
    allowedMimeTypes: ["image/webp", "image/png"],
  });
  if (createError) throw createError;
  console.log(`Created public bucket "${BUCKET}".`);
}

async function rasterizeSvg(svgPath: string): Promise<Buffer> {
  return sharp(svgPath, { density: 300 })
    .resize(800, 800, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer();
}

async function main() {
  const supabase = createAdminClient();
  await ensureBucket(supabase);

  const manifest: { forms: Record<string, FormSourcing & { publicUrl?: string; storagePath?: string }> } = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf8")
  );

  for (const [form, sourcing] of Object.entries(manifest.forms)) {
    const svgPath = path.join(__dirname, sourcing.assetPath);
    const buffer = await rasterizeSvg(svgPath);
    const storagePath = `${form}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: "image/webp", upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    manifest.forms[form] = { ...sourcing, storagePath, publicUrl: publicUrlData.publicUrl };
    console.log(`Uploaded ${form} -> ${publicUrlData.publicUrl}`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Updated manifest with public URLs for ${Object.keys(manifest.forms).length} forms.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
