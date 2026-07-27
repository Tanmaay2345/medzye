// Tier-1/tier-2 image sourcing pass for the medicine image pipeline.
//
// This records a real, manual research attempt (via Wikimedia Commons) to
// find genuinely reusable, non-brand-specific images for each dosage form
// before falling back to the original placeholder illustrations in
// ./assets/*.svg. It's not a live scraper: verifying that a photo's
// license *and* subject matter are actually safe to reuse (not just
// technically CC0, but also not depicting an identifiable real branded
// product) requires human judgment, not blind automation — automating that
// judgment away is exactly the risk this project is avoiding.
//
// Findings for `tablet-strip` (the only form with real candidates found):
//   - https://commons.wikimedia.org/wiki/File:Pills_in_blister_pack.jpg
//     CC0 1.0 (via Pexels). REJECTED: depicts a real, legible branded
//     product ("Loseprazol (R)", PRO.MED.CS Praha a.s.) — reusing it as a
//     "generic" placeholder would misleadingly suggest that specific real
//     drug is stocked on Medyze.
//   - https://commons.wikimedia.org/wiki/File:Pill_3.jpg
//     CC0 1.0 (via Pexels, freestocks.org). License and genericness both
//     check out (no legible brand text), but SUPERSEDED: the same photo
//     would appear identically on all 53 tablet-strip medicines, which
//     reads as a broken/duplicated placeholder rather than an intentional
//     design system. The illustrated icon set is used everywhere instead
//     for visual consistency across the catalog.
//   - No verified, genuinely-generic reusable candidates were found for the
//     other 9 dosage forms in the time available.
//
// Result: every dosage form falls back to its original illustration.
// This file exists so the decision is versioned and reviewable, and so a
// future pass can add a verified photo for a given form without touching
// any other script — just update FORM_SOURCING below and re-run
// `npm run db:seed:upload-images`.
import fs from "node:fs";
import path from "node:path";
import type { DosageForm } from "./data/medicines";

export type ImageTier = "official" | "licensed" | "placeholder";

export type FormSourcing = {
  tier: ImageTier;
  assetPath: string; // relative to scripts/seed/
  source: string; // human-readable provenance
  license: string;
};

const ASSETS_DIR = path.join(__dirname, "assets");

export const FORM_SOURCING: Record<DosageForm, FormSourcing> = {
  "tablet-strip": {
    tier: "placeholder",
    assetPath: "assets/tablet-strip.svg",
    source: "Original illustration (Medyze). Verified-CC0 photo candidates evaluated and rejected — see file header.",
    license: "Original artwork — no external license required.",
  },
  "capsule-bottle": { tier: "placeholder", assetPath: "assets/capsule-bottle.svg", source: "Original illustration (Medyze).", license: "Original artwork — no external license required." },
  "syrup-bottle": { tier: "placeholder", assetPath: "assets/syrup-bottle.svg", source: "Original illustration (Medyze).", license: "Original artwork — no external license required." },
  "oral-suspension": { tier: "placeholder", assetPath: "assets/oral-suspension.svg", source: "Original illustration (Medyze).", license: "Original artwork — no external license required." },
  "ointment-tube": { tier: "placeholder", assetPath: "assets/ointment-tube.svg", source: "Original illustration (Medyze).", license: "Original artwork — no external license required." },
  "eye-drop-bottle": { tier: "placeholder", assetPath: "assets/eye-drop-bottle.svg", source: "Original illustration (Medyze).", license: "Original artwork — no external license required." },
  inhaler: { tier: "placeholder", assetPath: "assets/inhaler.svg", source: "Original illustration (Medyze).", license: "Original artwork — no external license required." },
  "first-aid": { tier: "placeholder", assetPath: "assets/first-aid.svg", source: "Original illustration (Medyze).", license: "Original artwork — no external license required." },
  "supplement-jar": { tier: "placeholder", assetPath: "assets/supplement-jar.svg", source: "Original illustration (Medyze).", license: "Original artwork — no external license required." },
  "liquid-bottle": { tier: "placeholder", assetPath: "assets/liquid-bottle.svg", source: "Original illustration (Medyze).", license: "Original artwork — no external license required." },
};

function main() {
  for (const [form, sourcing] of Object.entries(FORM_SOURCING)) {
    const fullPath = path.join(__dirname, sourcing.assetPath.replace(/^assets\//, "assets/"));
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing asset for form "${form}": ${fullPath}`);
    }
  }

  const manifestPath = path.join(ASSETS_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ forms: FORM_SOURCING }, null, 2) + "\n");
  console.log(`Wrote sourcing manifest for ${Object.keys(FORM_SOURCING).length} dosage forms to ${manifestPath}`);
}

main();
