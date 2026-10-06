// Renders the compositor frame by frame and encodes the film.
//
//   node render.mjs                     full film -> output/medyze-product-film.mp4
//   node render.mjs --stills 1.4,7.3    single frames -> output/stills/
//   node render.mjs --type-only         typography only (no captures needed)
//
// Every frame is window.render(i / fps) followed by a screenshot, so the
// result is identical on every run and exactly duration * fps frames long.
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

const here = (p) => new URL(p, import.meta.url).pathname;
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : null);

const timeline = JSON.parse(readFileSync(here("./timeline.json"), "utf8"));
const typeOnly = flag("--type-only");
const manifestPath = here("./captures/manifest.json");
if (!typeOnly && !existsSync(manifestPath)) {
  console.error("captures/manifest.json missing — run capture.mjs first (or pass --type-only).");
  process.exit(1);
}
const manifest = typeOnly ? null : JSON.parse(readFileSync(manifestPath, "utf8"));
const { fps, duration, width, height } = timeline;
const total = Math.round(fps * duration);

const browser = await chromium.launch({
  args: [
    "--allow-file-access-from-files",
    "--font-render-hinting=none",
    ...(process.env.HTTPS_PROXY ? [`--proxy-server=https=${new URL(process.env.HTTPS_PROXY).host}`] : []),
  ],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.addInitScript(
  ([tl, m]) => {
    window.__TIMELINE = tl;
    window.__MANIFEST = m;
  },
  [timeline, manifest]
);
await page.goto("file://" + here("./compositor/index.html"));
await page.evaluate(() => window.ready);

const stills = opt("--stills");
if (stills) {
  const dir = here("./output/stills/");
  mkdirSync(dir, { recursive: true });
  for (const t of stills.split(",").map(Number)) {
    await page.evaluate((x) => window.render(x), t);
    const path = `${dir}t${t.toFixed(2)}.png`;
    await page.screenshot({ path });
    console.log(path);
  }
  await browser.close();
  process.exit(0);
}

const from = Number(opt("--from") ?? 0);
const to = Number(opt("--to") ?? (typeOnly ? 2.4 : duration));
const framesDir = here("./frames/");
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });
const first = Math.round(from * fps);
const last = Math.min(total, Math.round(to * fps));
for (let i = first; i < last; i++) {
  await page.evaluate((x) => window.render(x), i / fps);
  await page.screenshot({ path: `${framesDir}${String(i - first).padStart(4, "0")}.png` });
  if (i % 60 === 0) console.log(`frame ${i}/${last}`);
}
await browser.close();

mkdirSync(here("./output/"), { recursive: true });
const out = here(typeOnly ? "./output/type-preview.mp4" : "./output/medyze-product-film.mp4");
const audio = here("./output/audio.wav");
const withAudio = !typeOnly && existsSync(audio) && first === 0 && last === total;
const ff = [
  "-y", "-framerate", String(fps), "-i", `${framesDir}%04d.png`,
  ...(withAudio ? ["-i", audio] : []),
  "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p",
  "-profile:v", "high", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
  ...(withAudio ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : ["-an"]),
  "-movflags", "+faststart", out,
];
execFileSync("ffmpeg", ff, { stdio: ["ignore", "ignore", "inherit"] });
console.log("wrote", out);
