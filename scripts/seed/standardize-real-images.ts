// Standardizes every confirmed real product photo from "Medicine Image/"
// into a consistent 600x600 pure-white-background WebP:
//   - border flood-fill removes non-white studio backdrops (a handful of
//     source photos were shot on black) WITHOUT touching interior black
//     text/logos, since only pixels reachable from the image border through
//     a contiguous run of near-background-color pixels are cleared
//   - product is contain-fit to ~80% of the canvas (480/600px), centered,
//     never stretched
//   - exported as WebP q92
//
// Output goes to scripts/seed/assets/real/<kebab-case-name>.webp, plus a
// manifest recording the source filename for every image (traceability).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { REAL_IMAGE_MATCHES } from "./data/real-image-matches";

const SRC_DIR = path.join(__dirname, "..", "..", "Medicine Image ");
const OUT_DIR = path.join(__dirname, "assets", "real");
const MANIFEST_PATH = path.join(__dirname, "assets", "real-images-manifest.json");

const CANVAS = 600;
const PRODUCT_SIZE = Math.round(CANVAS * 0.8); // 480 — product occupies ~80% of canvas
const BG_MATCH_THRESHOLD = 60; // euclidean RGB distance for flood-fill

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function sampleCornerColor(fp: string): Promise<[number, number, number]> {
  const meta = await sharp(fp).metadata();
  const w = meta.width!, h = meta.height!;
  const corners = [
    { left: 0, top: 0 },
    { left: w - 2, top: 0 },
    { left: 0, top: h - 2 },
    { left: w - 2, top: h - 2 },
  ];
  let r = 0, g = 0, b = 0;
  for (const c of corners) {
    const { data } = await sharp(fp)
      .extract({ left: Math.max(0, c.left), top: Math.max(0, c.top), width: 2, height: 2 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    r += data[0] / 4;
    g += data[1] / 4;
    b += data[2] / 4;
  }
  return [r, g, b];
}

/** Border flood-fill: clears (sets alpha=0) any background-colored region reachable from the image edge. Leaves interior content untouched even if it matches the background color, since it isn't border-connected. */
function floodFillBackground(
  data: Buffer,
  width: number,
  height: number,
  bg: [number, number, number]
): void {
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const idx = (x: number, y: number) => y * width + x;
  const colorDist = (px: number) => {
    const o = px * 4;
    const dr = data[o] - bg[0], dg = data[o + 1] - bg[1], db = data[o + 2] - bg[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  for (let x = 0; x < width; x++) {
    queue.push(idx(x, 0), idx(x, height - 1));
  }
  for (let y = 0; y < height; y++) {
    queue.push(idx(0, y), idx(width - 1, y));
  }

  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    if (visited[p]) continue;
    visited[p] = 1;
    if (colorDist(p) > BG_MATCH_THRESHOLD) continue;

    data[p * 4 + 3] = 0; // clear alpha
    const x = p % width, y = Math.floor(p / width);
    if (x > 0) queue.push(idx(x - 1, y));
    if (x < width - 1) queue.push(idx(x + 1, y));
    if (y > 0) queue.push(idx(x, y - 1));
    if (y < height - 1) queue.push(idx(x, y + 1));
  }
}

async function processImage(sourceFile: string, needsBgRemoval: boolean, bg: [number, number, number]): Promise<Buffer> {
  const fp = path.join(SRC_DIR, sourceFile);
  let workingImage = sharp(fp).ensureAlpha();

  if (needsBgRemoval) {
    const { data, info } = await workingImage.raw().toBuffer({ resolveWithObject: true });
    floodFillBackground(data, info.width, info.height, bg);
    workingImage = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }

  const productBuffer = await workingImage
    .resize(PRODUCT_SIZE, PRODUCT_SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png() // explicit encoding: a raw-pixel source (post flood-fill) otherwise defaults toBuffer() to raw output, which composite() can't format-sniff
    .toBuffer();

  const offset = Math.round((CANVAS - PRODUCT_SIZE) / 2);

  return sharp({ create: { width: CANVAS, height: CANVAS, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([{ input: productBuffer, left: offset, top: offset }])
    .webp({ quality: 92 })
    .toBuffer();
}

type ManifestEntry = { sourceFile: string; outputFile: string; kebabName: string; storagePath?: string; publicUrl?: string };

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const confirmed = REAL_IMAGE_MATCHES.filter((m) => m.status === "confirmed");
  const manifest: Record<string, ManifestEntry> = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"))
    : {};

  let processed = 0;
  let skipped = 0;
  for (const match of confirmed) {
    const sourceFile = match.filename!;
    const kebabName = toKebabCase(match.medicineName);
    const outputFile = `${kebabName}.webp`;

    const existing = manifest[match.medicineName];
    if (existing && existing.sourceFile === sourceFile && fs.existsSync(path.join(OUT_DIR, outputFile))) {
      skipped++;
      continue; // already standardized from this exact source file — incremental, don't redo unchanged work
    }

    const cornerColor = await sampleCornerColor(path.join(SRC_DIR, sourceFile));
    const isWhiteish = cornerColor.every((c) => c > 235);

    const buffer = await processImage(sourceFile, !isWhiteish, cornerColor);
    fs.writeFileSync(path.join(OUT_DIR, outputFile), buffer);

    // sourceFile changed (or new): clear any stale storage info so upload-real-images.ts re-uploads it
    manifest[match.medicineName] = { sourceFile, outputFile, kebabName };
    processed++;
    console.log(`${isWhiteish ? "  " : "* "}${match.medicineName} -> ${outputFile}`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nStandardized ${processed} new/changed image(s), skipped ${skipped} already up to date. (* = background flood-filled)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
