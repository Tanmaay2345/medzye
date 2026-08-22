/**
 * Deterministic matching of OCR text against the medicine catalogue.
 *
 * This never invents a medicine. A row is only ever proposed because its own
 * stored name appears in the text read off the packaging — there is no
 * inference, no synonym expansion and no external lookup. Everything here is a
 * pure function of (ocrText, catalogue), which is what makes the confidence
 * threshold below meaningful rather than decorative.
 */

export type MedicineNameEntry = { id: number; name: string };

export type MedicineMatch = {
  id: number;
  name: string;
  /** 0-1. Share of the medicine's own name words found in the OCR text. */
  score: number;
};

/**
 * Below this we refuse to claim a match and fall back to manual search. OCR on
 * a phone photo is noisy, and a wrong medicine is far worse than "couldn't
 * identify" — so this errs toward saying nothing.
 */
export const MATCH_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Dosage-form and packaging words. These appear in catalogue names ("Asthalin
 * Inhaler", "Crocin Pediatric Drops") but carry no identifying power — every
 * inhaler says "inhaler". They are excluded from scoring so a name is judged
 * on its distinctive part only.
 *
 * This tightens rather than loosens matching: "Asthalin Inhaler" now has to
 * clear the bar on "asthalin" alone, instead of being able to score 0.5 by
 * matching the word "inhaler" off any inhaler packaging.
 */
const GENERIC_FORM_WORDS = new Set([
  "tablet", "tablets", "capsule", "capsules", "syrup", "drops", "drop",
  "inhaler", "cream", "gel", "ointment", "spray", "lotion", "powder",
  "liquid", "solution", "suspension", "injection", "sachet", "strip",
  "oral", "eye", "skin", "forte", "plus", "total", "advance", "duo",
]);

/** Lowercase, strip punctuation/accents, collapse whitespace. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchMedicines(
  ocrText: string,
  catalogue: MedicineNameEntry[],
  limit = 5
): MedicineMatch[] {
  const text = normalize(ocrText);
  if (!text) return [];

  const textWords = new Set(text.split(" "));
  const textSquashed = text.replace(/ /g, "");

  const matches: MedicineMatch[] = [];

  for (const entry of catalogue) {
    if (!entry.name) continue;
    const name = normalize(entry.name);
    if (!name) continue;

    // Whole name present (allowing for OCR dropping the spaces): unambiguous.
    if (textSquashed.includes(name.replace(/ /g, ""))) {
      matches.push({ id: entry.id, name: entry.name, score: 1 });
      continue;
    }

    const allWords = name.split(" ").filter((w) => w.length >= 2);
    // Score on the distinctive words; fall back to all of them if a name is
    // nothing but generic terms.
    const distinctive = allWords.filter((w) => !GENERIC_FORM_WORDS.has(w));
    const words = distinctive.length > 0 ? distinctive : allWords;
    if (words.length === 0) continue;

    const hits = words.filter((w) => textWords.has(w) || textSquashed.includes(w));

    // Require a real word, not just a strength number: without this, "650"
    // alone would match "Dolo 650" off any packaging that mentions 650mg.
    const hasSubstantiveHit = hits.some((w) => w.length >= 4 && !/^\d+$/.test(w));
    if (!hasSubstantiveHit) continue;

    const score = hits.length / words.length;
    if (score >= MATCH_CONFIDENCE_THRESHOLD) {
      matches.push({ id: entry.id, name: entry.name, score });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}
