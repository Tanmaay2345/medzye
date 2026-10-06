// Captures the REAL Medyze interaction from a running instance of the app.
//
// Nothing here renders UI of its own. Playwright drives the production build
// (search -> card -> comparison modal -> ADD -> Continue -> Buy) exactly as a
// user would, and saves a screenshot of every state the film shows, plus the
// on-screen geometry and text read back from the DOM. The compositor only
// ever displays these screenshots and positions a camera over them.
//
// CSS transitions/animations (hover ribbon, dialog open, "Added" state,
// Continue footer, redirect bars) are captured frame by frame: animations are
// slowed via CDP so none finish before they are paused, then each is seeked
// to t = i/60s and screenshotted. That keeps the real motion while making the
// capture deterministic regardless of machine speed.
//
// Usage (app must already be running, e.g. `npm run build && npm start`):
//   MEDYZE_URL=http://localhost:3000 node capture.mjs
import { chromium } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const BASE = process.env.MEDYZE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const QUERY = "Dolo 650";
const MEDICINE_NAME = "Dolo 650";
const VIEWPORT = { width: 1440, height: 810 };
const DPR = 2;
const FPS = 60;
const OUT = new URL("./captures/", import.meta.url).pathname;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (same values the app uses).");
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const manifest = {
  capturedAt: new Date().toISOString(),
  base: BASE,
  viewport: VIEWPORT,
  dpr: DPR,
  fps: FPS,
  states: {},
  sequences: {},
  data: {},
};

/** Read-only REST call with the same publishable key + RLS the app runs under. */
async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function box(locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error(`no bounding box for ${locator}`);
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}

async function shot(page, name, extra = {}, opts = {}) {
  const file = `${name}.png`;
  await page.screenshot({ path: OUT + file, caret: opts.caret ?? "hide" });
  manifest.states[name] = { file, ...extra };
  console.log("  shot", name);
}

/**
 * Pause every running animation/transition, then step them in 1/60s
 * increments, screenshotting each. `frames` frames are written; infinite
 * animations are seeked the same way (their timing is periodic).
 */
async function captureAnimations(page, name, frames, opts = {}) {
  const count = await page.evaluate(() => {
    window.__cap = document.getAnimations();
    window.__cap.forEach((a) => a.pause());
    return window.__cap.length;
  });
  const files = [];
  for (let i = 0; i < frames; i++) {
    const t = (i * 1000) / FPS + (opts.offsetMs ?? 0);
    await page.evaluate((ms) => {
      for (const a of window.__cap) {
        const timing = a.effect?.getComputedTiming();
        const end = timing && Number.isFinite(timing.endTime) ? timing.endTime : Infinity;
        a.currentTime = Math.min(ms, end);
      }
    }, t);
    const file = `${name}-${String(i).padStart(3, "0")}.png`;
    await page.screenshot({ path: OUT + file, caret: "hide" });
    files.push(file);
  }
  await page.evaluate(() => {
    for (const a of window.__cap) {
      const timing = a.effect?.getComputedTiming();
      if (timing && Number.isFinite(timing.endTime)) a.finish();
      else a.play();
    }
  });
  manifest.sequences[name] = { files, animations: count };
  console.log(`  seq  ${name} (${frames} frames, ${count} animations)`);
}

async function slowAnimations(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.02 });
  return cdp;
}

const browser = await chromium.launch({
  // Proxy only https (Supabase, fonts) when an egress proxy is configured;
  // the local app on http://localhost is always reached directly.
  args: process.env.HTTPS_PROXY ? [`--proxy-server=https=${new URL(process.env.HTTPS_PROXY).host}`] : [],
});

// ── Data the UI is about to show, read through the same RLS-scoped key ──────
const [medicine] = await rest(`medicines?select=id,name,category_id&name=eq.${encodeURIComponent(MEDICINE_NAME)}`);
if (!medicine) throw new Error(`${MEDICINE_NAME} not found`);
const offers = await rest(
  `medicine_prices?select=id,price,pharmacy_id,pharmacy:pharmacies(id,name)&medicine_id=eq.${medicine.id}&order=price.asc,id.asc`
);
const verified = new Set(
  (await rest(`medicine_product_urls?select=pharmacy_id&medicine_id=eq.${medicine.id}`)).map((r) => r.pharmacy_id)
);
manifest.data = { medicine, offers, verifiedPharmacyIds: [...verified] };
console.log(`${medicine.name} (#${medicine.id}): ${offers.length} offers, verified pharmacies ${[...verified].join(",")}`);

// ── 1. Search (home page header) ────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR });
  // Fake timers only for this page, so the 300 ms search debounce cannot fire
  // between keystrokes while screenshots are being taken.
  await context.clock.install();
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const input = page.getByRole("combobox");
  // input -> div.relative -> the search bar's rounded container
  const bar = input.locator("xpath=../..");

  await shot(page, "search-idle", { bar: await box(bar), input: await box(input) });
  // Pause relative to the page's own (fake) clock, not Node's.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 500);
  await input.click();
  await shot(page, "search-focus", { bar: await box(bar) }, { caret: "initial" });

  for (let i = 1; i <= QUERY.length; i++) {
    await page.keyboard.type(QUERY[i - 1]);
    await shot(page, `search-type-${i}`, { bar: await box(bar), value: QUERY.slice(0, i) }, { caret: "initial" });
  }

  // Let the real debounce elapse; the request itself is real network.
  await page.clock.runFor(310);
  const listbox = page.locator("#search-results-listbox");
  await listbox.waitFor();
  if (await page.getByText("Searching…").isVisible().catch(() => false)) {
    await shot(page, "search-loading", { bar: await box(bar), listbox: await box(listbox) }, { caret: "initial" });
  }
  const option = page.getByRole("option").filter({ hasText: MEDICINE_NAME }).first();
  await option.waitFor();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
  const optionText = await option.innerText();
  await shot(page, "search-results", {
    bar: await box(bar),
    listbox: await box(listbox),
    option: await box(option),
    optionText,
  }, { caret: "initial" });
  await option.hover();
  await page.clock.runFor(200);
  await shot(page, "search-hover", { bar: await box(bar), listbox: await box(listbox), option: await box(option) }, { caret: "initial" });
  await context.close();
}

// ── 2-4. Card -> comparison modal -> ADD -> Continue -> detail -> Buy ───────
{
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR });
  // Outbound pharmacy navigation is never loaded: the film shows Medyze's own
  // handoff, not a recreation of the pharmacy site.
  await context.route(
    (url) => !url.href.startsWith(BASE) && !url.href.startsWith(SUPABASE_URL),
    (route) => route.abort()
  );
  context.on("page", (p) => {
    manifest.data.popupOpened = true;
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/category/${medicine.category_id}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await slowAnimations(context, page);

  const card = page
    .locator("div[role=button]")
    .filter({ has: page.getByText(MEDICINE_NAME, { exact: true }) })
    .first();
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
  await page.mouse.move(VIEWPORT.width - 10, 10);
  await shot(page, "card-idle", { card: await box(card) });

  const c = await box(card);
  await page.mouse.move(c.x + c.w / 2, c.y + c.h * 0.45);
  await page.waitForTimeout(40);
  await captureAnimations(page, "card-hover", 14);
  await shot(page, "card-hovered", { card: await box(card) });

  // Click opens the real modal; it fetches offers + verified ids on open.
  await page.mouse.click(c.x + c.w / 2, c.y + c.h * 0.45);
  await page.waitForTimeout(20);
  await captureAnimations(page, "modal-open", 8);
  const dialog = page.getByRole("dialog");
  const addButtons = dialog.locator("[aria-pressed]");
  await addButtons.first().waitFor();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
  await page.mouse.move(8, VIEWPORT.height - 8);

  // Which offer to pick: the cheapest one, among those the sheet shows, whose
  // pharmacy has a verified product URL — so the flow ends in a real redirect
  // rather than the simulated booking. Decided from data, never hard-coded.
  // button -> price/button group -> PharmacyPriceRow root
  const rowLoc = addButtons.locator("xpath=../..");
  const readRows = async () => {
    const n = await rowLoc.count();
    const rows = [];
    for (let i = 0; i < n; i++) {
      const r = rowLoc.nth(i);
      const name = (await r.locator("span.font-bold").first().innerText()).trim();
      rows.push({ index: i, name, text: (await r.innerText()).replace(/\s+/g, " ").trim(), box: await box(r), add: await box(addButtons.nth(i)) });
    }
    return rows;
  };
  let rows = await readRows();
  const nameToPharmacy = new Map(offers.map((o) => [o.pharmacy?.name, o.pharmacy_id]));
  const chosenIndex = rows.findIndex((r) => verified.has(nameToPharmacy.get(r.name)));
  if (chosenIndex < 0) throw new Error("no visible offer has a verified URL");
  manifest.data.chosen = { index: chosenIndex, name: rows[chosenIndex].name, isCheapestShown: chosenIndex === 0 };
  console.log(`  chosen offer: ${rows[chosenIndex].text} (row ${chosenIndex})`);

  // Bring the chosen row into the list's own scroll view if needed (real scroll).
  await rowLoc.nth(chosenIndex).evaluate((el) => el.scrollIntoView({ block: "nearest" }));
  rows = await readRows();
  // The offer list scrolls inside the modal; rows outside this box are clipped.
  const listArea = dialog.locator(".overflow-y-auto").first();
  await shot(page, "modal-loaded", {
    listArea: await box(listArea),
    dialog: await box(dialog.locator("[data-slot=dialog-content]").or(dialog).first()),
    rows,
    chosen: chosenIndex,
  });

  // ADD -> "Added" + Continue footer (real transitions, frame by frame).
  const add = addButtons.nth(chosenIndex);
  await add.hover();
  await page.waitForTimeout(400); // hover colour transition, slowed
  await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  await shot(page, "modal-add-hover", { rows });
  await add.click();
  await page.waitForTimeout(40);
  await captureAnimations(page, "modal-added", 13);
  await page.mouse.move(8, VIEWPORT.height - 8);
  const cont = dialog.getByRole("button", { name: /Continue/ });
  await cont.waitFor();
  rows = await readRows();
  await shot(page, "modal-added", { rows, chosen: chosenIndex, continue: await box(cont), listArea: await box(listArea) });

  // Continue -> real router.push to /medicine/:id?offer=:offerId
  await cont.click();
  await page.waitForURL(/\/medicine\/\d+\?offer=\d+/);
  manifest.data.detailUrl = page.url().replace(BASE, "");
  const buy = page.getByRole("link", { name: /^Buy at/ });
  await buy.waitFor();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
  const h1 = page.locator("main h1");
  await h1.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 150));
  await page.mouse.move(8, VIEWPORT.height - 8);
  const selectedFrom = page.getByText(/^Selected from/);
  manifest.data.buy = {
    href: await buy.getAttribute("href"),
    label: (await buy.innerText()).trim(),
    price: (await h1.locator("xpath=following-sibling::*[1]").innerText()).replace(/\s+/g, " ").trim(),
    selectedFrom: (await selectedFrom.innerText()).trim(),
  };
  console.log("  buy:", manifest.data.buy);
  await shot(page, "detail", {
    h1: await box(h1),
    selectedFrom: await box(selectedFrom),
    buy: await box(buy),
    image: await box(page.locator("main img").first()),
  });
  await buy.hover();
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  await shot(page, "detail-buy-hover", { buy: await box(buy) });

  // Buy -> real "Redirecting to the brand website" overlay. The new tab's
  // request is aborted above; the overlay is this page's own state.
  //
  // The overlay clears itself after a 4 s safety timeout, far shorter than a
  // frame-by-frame capture takes, so page timers are frozen first. Only time
  // stands still; the overlay is exactly what the click produces.
  await context.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 200);
  await buy.click();
  const status = page.getByRole("status");
  await status.waitFor();
  manifest.data.redirectLabel = (await status.innerText()).trim();
  const statusBox = await box(status);
  await page.waitForTimeout(20);
  await captureAnimations(page, "redirect", 40);
  await shot(page, "redirect", { status: statusBox });
  await context.close();
}

await browser.close();
writeFileSync(OUT + "manifest.json", JSON.stringify(manifest, null, 2));
console.log("wrote", OUT + "manifest.json");
