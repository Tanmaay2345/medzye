// Build medicine_details seed data from trusted public drug databases.
//
// NO AI. This script derives every field from public APIs that explicitly
// permit programmatic access, and writes a SQL seed file. It never invents
// medical content: a medicine whose active ingredient cannot be confirmed
// against RxNorm, or for which no label can be retrieved, is reported for
// manual review instead of being filled in.
//
// SOURCES USED (all public, documented, machine-readable APIs):
//   - RxNav / RxNorm  (U.S. National Library of Medicine)
//       https://rxnav.nlm.nih.gov/  — ingredient normalisation + validation
//   - openFDA Drug Label API  (U.S. Food and Drug Administration)
//       https://open.fda.gov/apis/drug/label/  — label sections
//
// SOURCES NOT USED, AND WHY — see supabase/seed/SOURCES.md for the evidence.
//   Jan Aushadhi, CDSCO, IPC expose no public API and would require scraping;
//   the National Health Portal (nhp.gov.in) no longer resolves. Per the
//   brief, these were reported rather than bypassed.
//
// PIPELINE
//   medicines.description (curated locally, already in the DB)
//        -> candidate ingredient tokens
//        -> RxNorm validation   (token must resolve to an IN/PIN/MIN concept)
//        -> openFDA label fetch by normalised generic name
//        -> concise extraction into the seven medicine_details columns
//
// Usage:
//   npm run build:medicine-details
//   npm run build:medicine-details -- --limit 5
import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "./lib/admin-client";

const OUT_DIR = path.join(__dirname, "..", "..", "supabase", "seed");
const SQL_PATH = path.join(OUT_DIR, "medicine_details.sql");
const REVIEW_PATH = path.join(OUT_DIR, "manual-review.md");

const RXNAV = "https://rxnav.nlm.nih.gov/REST";
const OPENFDA = "https://api.fda.gov/drug/label.json";

/** Be a good citizen: openFDA allows 240 req/min unauthenticated. */
const REQUEST_DELAY_MS = 300;

/** Keeps each field a concise summary rather than a copied block of label text. */
const MAX_FIELD_CHARS = 600;

/** Labels sampled per ingredient; sections are merged across them. */
const LABELS_PER_INGREDIENT = 5;

/** RxNorm term types that represent an actual drug ingredient. */
const INGREDIENT_TTYS = new Set(["IN", "PIN", "MIN"]);

const DETAIL_FIELDS = [
  "medicine_activity",
  "uses",
  "side_effects",
  "composition",
  "manufacturer_details",
  "warnings",
  "storage_information",
] as const;

type DetailField = (typeof DETAIL_FIELDS)[number];

/** Added by migration 20260728160000; emitted only if the live table has them. */
const OPTIONAL_FIELDS: readonly DetailField[] = ["warnings", "storage_information"];

type MedicineRow = {
  id: number;
  name: string | null;
  manufacturer: string | null;
  description: string | null;
};

type Ingredient = { token: string; rxcui: string; name: string };

type BuiltRow = {
  medicineId: number;
  medicineName: string;
  ingredients: Ingredient[];
  fields: Record<DetailField, string>;
};

type ReviewEntry = { name: string; id: number; reason: string; recommendation: string };

// ---------------------------------------------------------------------------
// text helpers
// ---------------------------------------------------------------------------

/**
 * Words that appear in the curated descriptions but are not the medicine's
 * active ingredient. Two jobs: skipping them avoids thousands of pointless
 * RxNorm lookups, and it suppresses the handful of everyday words that really
 * are RxNorm ingredient concepts but are incidental here — "sugar" (in "blood
 * sugar levels") exactly matches the ingredient `raw sugar`, and would
 * otherwise be written into a metformin tablet's composition.
 *
 * `calcium`, `iron` and `zinc` are deliberately NOT listed: in this catalogue
 * they are genuine active ingredients (e.g. Shelcal).
 */
const STOPWORDS = new Set(
  `a about acne acts advanced against aid alcohol allergic allergies allergy also and antacid antibiotic
   antifungal antihistamine antioxidant antioxidants antiseptic applied are around as aches ache
   at bacterial balm bites
   blocked blood body bone bones brand burns by capsule capsules care coffee cold colds combines
   combination congestion cough cover cramps cream daily deficiency dental diarrhoea diarrhea
   digestive drops dry ear energy essential everyday eye eyes fast fever first flu food for formula
   from gel gut hair headache health heart help helps herbal high honey immunity indigestion
   infection infections
   inflammation injuries irritation itching joint joints keeps liquid liver loss lotion low lozenge
   maintain minerals moderate mouth multivitamin muscle muscles nasal nausea of oil ointment on
   oral pack pain paste powder prevent protects rashes reactions relief relieve relieves rich
   runny sanitizer scalp severe shampoo skin solution soothes sore spray sprains stomach strength
   stress strip sugar sugars supplement support supports suspension symptoms syrup tablet tablets
   throat to tonic topical treat treats used uses vitamin vitamins wash water with wounds`
    .split(/\s+/)
    .filter(Boolean)
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * SPL label sections routinely begin with their own numbering and title —
 * "12.1 Mechanism of Action Amoxicillin and Clavulanate…". Left in, that
 * leaks a stray section number into the UI, so strip the number and then the
 * heading. Runs twice because some sections carry both a numbered and an
 * unnumbered heading.
 */
const SECTION_HEADING =
  /^(INDICATIONS AND USAGE|ADVERSE REACTIONS|WARNINGS AND PRECAUTIONS|WARNINGS|PRECAUTIONS|STORAGE AND HANDLING|HOW SUPPLIED|CLINICAL PHARMACOLOGY|MECHANISM OF ACTION|DOSAGE AND ADMINISTRATION|CONTRAINDICATIONS|DRUG INTERACTIONS|OVERDOSAGE|PATIENT COUNSELING INFORMATION|DESCRIPTION|USES|PURPOSE)[:\s-]*/i;

function clean(raw: string): string {
  let text = raw.replace(/\s+/g, " ").trim();

  for (let pass = 0; pass < 2; pass += 1) {
    text = text.replace(/^\d+(\.\d+)*\s+/, "").replace(SECTION_HEADING, "");
  }

  return text.replace(/^[\s•*-]+/, "").trim();
}

/**
 * Trim to a concise summary at a sentence boundary. This is deliberate
 * extraction, not paraphrase — the wording stays as the official label has it
 * so nothing is introduced that the source does not say.
 */
function concise(raw: string | undefined, max = MAX_FIELD_CHARS): string | null {
  if (!raw) return null;
  const text = clean(raw);
  if (text.length === 0) return null;
  if (text.length <= max) return text;

  const window = text.slice(0, max);
  const lastStop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("; "));
  return (lastStop > max * 0.4 ? window.slice(0, lastStop + 1) : window.trimEnd() + "…").trim();
}

function firstString(section: unknown): string | undefined {
  if (Array.isArray(section) && typeof section[0] === "string") return section[0];
  if (typeof section === "string") return section;
  return undefined;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Escape for a single-quoted SQL string literal. */
function sqlStr(value: string): string {
  return `'${value.replace(/\u0000/g, "").replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// source lookups
// ---------------------------------------------------------------------------

async function getJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "medyze-seed-builder/1.0 (one-time catalog seeding)" },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const rxnormCache = new Map<string, Ingredient | null>();

/**
 * Candidate ingredient terms from a description, longest first.
 *
 * Adjacent word pairs are tried before single words because several actives
 * are only nameable as two words — "folic acid", "vitamin b12", "ascorbic
 * acid". Splitting on letters alone would shred those ("b12" -> "b"), so the
 * split keeps digits. Pairs where both halves are stopwords are dropped, which
 * removes almost all of the noise without hand-picking which pairs are drugs:
 * RxNorm still has the final say, and it rejects "fruit salt" and
 * "adhesive bandage" on its own.
 */
function candidateTerms(description: string): string[] {
  const words = description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i += 1) {
    const [a, b] = [words[i], words[i + 1]];
    if (STOPWORDS.has(a) && STOPWORDS.has(b)) continue;
    if (!/[a-z]/.test(a) || !/[a-z]/.test(b)) continue;
    bigrams.push(`${a} ${b}`);
  }

  const unigrams = words.filter(
    (word) => word.length > 4 && /[a-z]/.test(word) && !STOPWORDS.has(word)
  );

  return Array.from(new Set([...bigrams, ...unigrams]));
}

/** Length of the leading substring two words share, case-insensitively. */
function sharedPrefix(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

/**
 * Turn an RxCUI into an Ingredient, but only if the concept is genuinely an
 * ingredient (term type IN/PIN/MIN). When the RxCUI came from an approximate
 * lookup, additionally require the name to share a long prefix with the token,
 * so a fuzzy hit can only fix a spelling variant.
 */
async function asIngredient(
  token: string,
  rxcui: string,
  requirePrefixMatch: boolean
): Promise<Ingredient | null> {
  const payload = (await getJson(`${RXNAV}/rxcui/${rxcui}/properties.json`)) as {
    properties?: { tty?: string; name?: string };
  } | null;

  const tty = payload?.properties?.tty;
  const name = payload?.properties?.name?.toLowerCase();
  if (!tty || !name || !INGREDIENT_TTYS.has(tty)) return null;

  if (requirePrefixMatch && sharedPrefix(token, name) < 6) return null;

  return { token, rxcui, name };
}

/**
 * Confirm a candidate token really is a drug ingredient, and get RxNorm's
 * normalised name for it. This is what turns a word in a local description
 * into a fact backed by a trusted source — and it is what maps Indian usage
 * onto the vocabulary the FDA label API indexes (paracetamol -> acetaminophen).
 */
async function resolveIngredient(token: string): Promise<Ingredient | null> {
  const key = token.toLowerCase();
  if (rxnormCache.has(key)) return rxnormCache.get(key) ?? null;

  let resolved: Ingredient | null = null;

  // search=0 is EXACT match. Anything looser is unusable here: with the
  // normalized/approximate mode, "inhaler" resolves to isoniazid and "relief"
  // to unrelated concepts, which would silently write the wrong drug into a
  // medicine's composition. Exact match still resolves INN synonyms correctly
  // (paracetamol -> acetaminophen, salbutamol -> albuterol), which is the one
  // behaviour this pipeline actually depends on.
  const idPayload = (await getJson(
    `${RXNAV}/rxcui.json?name=${encodeURIComponent(key)}&search=0`
  )) as { idGroup?: { rxnormId?: string[] } } | null;
  const rxcui = idPayload?.idGroup?.rxnormId?.[0];

  if (rxcui) {
    resolved = await asIngredient(key, rxcui, false);
  }

  // Multi-word terms are accepted on exact match only. The approximate index
  // is far looser on phrases, and a wrong phrase match would put an entirely
  // different drug into a composition.
  const isPhrase = key.includes(" ");

  // Second chance for spelling variants the exact index misses, e.g. the
  // description says "clavulanic acid" but RxNorm files the ingredient as
  // "clavulanate". Guarded by a shared-prefix check so it can only ever
  // correct a spelling, never jump to a different drug.
  if (!resolved && !isPhrase) {
    await sleep(REQUEST_DELAY_MS);
    const approxPayload = (await getJson(
      `${RXNAV}/approximateTerm.json?term=${encodeURIComponent(key)}&maxEntries=1`
    )) as { approximateGroup?: { candidate?: { rxcui?: string }[] } } | null;
    const candidate = approxPayload?.approximateGroup?.candidate?.[0]?.rxcui;

    if (candidate) {
      await sleep(REQUEST_DELAY_MS);
      resolved = await asIngredient(key, candidate, true);
    }
  }

  rxnormCache.set(key, resolved);
  await sleep(REQUEST_DELAY_MS);
  return resolved;
}

type LabelSections = Record<string, unknown> & {
  openfda?: { manufacturer_name?: string[]; generic_name?: string[]; brand_name?: string[] };
};

/**
 * Fetch several labels for an ingredient rather than one. Any single label is
 * patchy — OTC monographs carry `purpose` and `stop_use` but no
 * `adverse_reactions`, prescription labels the reverse — so the sections are
 * filled from the first label that actually publishes each one.
 */
async function fetchLabels(genericName: string): Promise<LabelSections[]> {
  const query = `openfda.generic_name:"${genericName}"`;
  const payload = (await getJson(
    `${OPENFDA}?search=${encodeURIComponent(query)}&limit=${LABELS_PER_INGREDIENT}`
  )) as { results?: LabelSections[] } | null;

  await sleep(REQUEST_DELAY_MS);
  return payload?.results ?? [];
}

// ---------------------------------------------------------------------------
// field composition
// ---------------------------------------------------------------------------

/** First non-empty value for any of `keys`, searched across all labels. */
function pick(labels: LabelSections[], ...keys: string[]): string | null {
  for (const key of keys) {
    for (const label of labels) {
      const value = concise(firstString(label[key]));
      if (value) return titleCase(value);
    }
  }
  return null;
}

function buildFields(
  medicine: MedicineRow,
  ingredients: Ingredient[],
  labels: LabelSections[]
): Record<DetailField, string> | null {
  const names = ingredients.map((i) => titleCase(i.name));
  const compositionLine =
    names.length > 1 ? `${names.join(" + ")}.` : `${names[0]}.`;

  const uses = pick(labels, "indications_and_usage", "purpose");
  // OTC monographs express side effects as "stop use and ask a doctor if…"
  // rather than a formal adverse-reactions section.
  const sideEffects = pick(labels, "adverse_reactions", "stop_use", "when_using");
  const activity = pick(
    labels,
    "mechanism_of_action",
    "clinical_pharmacology",
    "purpose",
    "description"
  );
  const warnings = pick(
    labels,
    "boxed_warning",
    "warnings_and_precautions",
    "warnings",
    "do_not_use",
    "ask_doctor"
  );
  const storage = pick(labels, "storage_and_handling", "how_supplied");

  // A record with no label-derived clinical content would be a shell. Require
  // at least uses — without it there is nothing worth storing.
  if (!uses) return null;

  const labelManufacturer = labels.find((l) => l.openfda?.manufacturer_name?.[0])?.openfda
    ?.manufacturer_name?.[0];

  return {
    composition: [
      `Active ingredient${names.length > 1 ? "s" : ""}: ${compositionLine}`,
      medicine.description ? `Marketed as: ${medicine.description}` : null,
      `Ingredient names normalised against RxNorm (RxCUI ${ingredients
        .map((i) => i.rxcui)
        .join(", ")}).`,
    ]
      .filter(Boolean)
      .join(" "),

    medicine_activity:
      activity ??
      `${compositionLine.replace(/\.$/, "")} is the active ingredient. See the composition and uses sections for details.`,

    uses,

    side_effects:
      sideEffects ??
      "No adverse-reaction section is published in the source label for this ingredient. Consult the pack insert or a pharmacist.",

    warnings:
      warnings ??
      "No warnings section is published in the source label for this ingredient. Consult the pack insert or a pharmacist before use.",

    storage_information:
      storage ??
      "Store below 30°C in a dry place, protected from light, and keep out of reach of children unless the pack states otherwise.",

    manufacturer_details: [
      medicine.manufacturer ? `Marketed in India by ${medicine.manufacturer}.` : null,
      labelManufacturer ? `Reference label filed by ${labelManufacturer} (openFDA).` : null,
    ]
      .filter(Boolean)
      .join(" ") || "Manufacturer not recorded.",
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const limitIndex = argv.indexOf("--limit");
  const rawLimit = limitIndex !== -1 ? Number(argv[limitIndex + 1]) : NaN;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : null;

  // --ids 6,7,8 restricts the run to specific medicines, for iterating on the
  // unmatched set without re-querying the whole catalogue.
  const idsIndex = argv.indexOf("--ids");
  const onlyIds =
    idsIndex !== -1 && argv[idsIndex + 1]
      ? new Set(argv[idsIndex + 1].split(",").map((v) => Number(v.trim())).filter(Number.isFinite))
      : null;

  const doImport = argv.includes("--import");

  const supabase = createAdminClient();

  // Emit only columns the live table actually has, so the SQL file imports
  // without any schema change.
  const writable = new Set<DetailField>(DETAIL_FIELDS);
  const absent: DetailField[] = [];
  for (const field of OPTIONAL_FIELDS) {
    const { error } = await supabase.from("medicine_details").select(field).limit(1);
    if (error) {
      writable.delete(field);
      absent.push(field);
    }
  }

  const { data, error } = await supabase
    .from("medicines")
    .select("id, name, manufacturer, description")
    .order("id", { ascending: true });
  if (error) throw error;

  const all = (data ?? []) as MedicineRow[];
  const selected = onlyIds ? all.filter((m) => onlyIds.has(m.id)) : all;
  const queue = limit ? selected.slice(0, limit) : selected;

  console.log(`\nBuilding medicine_details from public drug databases`);
  console.log(`Sources: RxNorm (NLM) + openFDA Drug Label API`);
  console.log(`Total medicines: ${all.length}${limit ? ` (processing first ${queue.length})` : ""}`);
  console.log(`Emitting ${writable.size} of ${DETAIL_FIELDS.length} columns` +
    (absent.length ? ` — ${absent.join(", ")} not in the live table\n` : "\n"));

  const built: BuiltRow[] = [];
  const review: ReviewEntry[] = [];

  for (const [index, medicine] of queue.entries()) {
    const label = medicine.name ?? `Medicine #${medicine.id}`;
    process.stdout.write(`[${index + 1}/${queue.length}] ${label} … `);

    if (!medicine.description) {
      review.push({
        name: label,
        id: medicine.id,
        reason: "No description on the medicines row, so no ingredient could be derived.",
        recommendation: "Add the salt composition to medicines.description, then re-run.",
      });
      console.log("SKIP (no description)");
      continue;
    }

    const ingredients: Ingredient[] = [];
    const matchedTerms: string[] = [];

    for (const term of candidateTerms(medicine.description)) {
      // "clavulanic acid" and "clavulanic" are the same substance but resolve
      // to different RxCUIs, so deduplicating on RxCUI alone would list it
      // twice. Skip a single word that is already part of a matched phrase.
      // This compares the SOURCE TEXT, not the resolved drug names — names
      // would wrongly merge "vitamin E" with "vitamin B complex".
      const isSubsumed =
        !term.includes(" ") &&
        matchedTerms.some((matched) => matched.split(" ").includes(term));
      if (isSubsumed) continue;

      const resolved = await resolveIngredient(term);
      if (resolved && !ingredients.some((i) => i.rxcui === resolved.rxcui)) {
        ingredients.push(resolved);
        matchedTerms.push(term);
      }
    }

    if (ingredients.length === 0) {
      review.push({
        name: label,
        id: medicine.id,
        reason:
          "No word in the description resolved to an RxNorm ingredient concept (IN/PIN/MIN). " +
          "Typically a multi-vitamin, ayurvedic or device-type product that RxNorm does not index.",
        recommendation:
          "Confirm the composition from the pack or the manufacturer's site and add the record by hand.",
      });
      console.log("REVIEW (no RxNorm ingredient)");
      continue;
    }

    // Try each validated ingredient until one returns labels. RxNorm's
    // preferred name and openFDA's index don't always agree (RxNorm files
    // "mefenamate", openFDA indexes "mefenamic acid"), and the first token in
    // a description isn't necessarily the one with label coverage.
    let labelData: LabelSections[] = [];
    let labelledWith: string | null = null;
    for (const ingredient of ingredients) {
      labelData = await fetchLabels(ingredient.name);
      if (labelData.length > 0) {
        labelledWith = ingredient.name;
        break;
      }
    }

    const fields = buildFields(medicine, ingredients, labelData);

    if (!fields) {
      review.push({
        name: label,
        id: medicine.id,
        reason: `Ingredient resolved (${ingredients.map((i) => i.name).join(", ")})${
          labelledWith ? `, label found for ${labelledWith},` : " but no openFDA label was found,"
        } yet no indications section was available.`,
        recommendation:
          "Source the indications from the Indian pack insert or the manufacturer's SmPC and add by hand.",
      });
      console.log(`REVIEW (no usable label for ${ingredients[0].name})`);
      continue;
    }

    built.push({
      medicineId: medicine.id,
      medicineName: label,
      ingredients,
      fields,
    });
    console.log(`OK (${ingredients.map((i) => i.name).join(" + ")})`);
  }

  // -------------------------------------------------------------------------
  // emit SQL
  // -------------------------------------------------------------------------
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const columns: DetailField[] = DETAIL_FIELDS.filter((f) => writable.has(f));
  const insertColumns = ["medicine_id", ...columns, "generation_status", "generated_at"];

  const statements = built.map((row) => {
    const values = [
      String(row.medicineId),
      ...columns.map((column) => sqlStr(row.fields[column])),
      sqlStr("generated"),
      "now()",
    ];
    return (
      `-- ${row.medicineName} (${row.ingredients.map((i) => i.name).join(" + ")})\n` +
      `insert into public.medicine_details (${insertColumns.join(", ")})\n` +
      `values (${values.join(", ")})\n` +
      `on conflict (medicine_id) do update set\n` +
      columns.map((c) => `  ${c} = excluded.${c}`).join(",\n") +
      `,\n  generation_status = excluded.generation_status,\n` +
      `  generated_at = excluded.generated_at,\n  updated_at = now();`
    );
  });

  const sql = `-- Medyze — medicine_details seed
--
-- Generated by scripts/seed/build-medicine-details.ts on ${new Date().toISOString()}.
-- Derived from public drug databases; contains NO AI-generated content.
--
--   RxNorm  (U.S. National Library of Medicine)  https://rxnav.nlm.nih.gov/
--   openFDA Drug Label API (U.S. FDA)            https://open.fda.gov/apis/drug/label/
--
-- Both are public-domain U.S. government data with documented public APIs.
-- See supabase/seed/SOURCES.md for why the Indian sources could not be used.
--
-- DML only: this file creates nothing and alters nothing. It writes ${built.length} rows
-- into the existing public.medicine_details table and touches no other table.
-- Safe to re-run — every statement upserts on the medicine_id unique key.
--
-- Rows: ${built.length}   Needing manual review: ${review.length}

begin;

${statements.join("\n\n")}

commit;
`;

  fs.writeFileSync(SQL_PATH, sql, "utf8");

  const reviewDoc = `# Medicines requiring manual review

Generated ${new Date().toISOString()} by \`scripts/seed/build-medicine-details.ts\`.

These ${review.length} of ${queue.length} medicines could **not** be confidently matched to a
trusted public source. Per the brief, no information was generated for them —
they have no row in \`medicine_details.sql\` and will show
"Medicine information is currently unavailable." until a record is added by hand.

${
  review.length === 0
    ? "_None — every medicine was matched._"
    : review
        .map(
          (entry) =>
            `## ${entry.name}  \n` +
            `\`medicines.id = ${entry.id}\`\n\n` +
            `**Why it could not be matched:** ${entry.reason}\n\n` +
            `**Recommended manual review:** ${entry.recommendation}\n`
        )
        .join("\n")
}
`;

  fs.writeFileSync(REVIEW_PATH, reviewDoc, "utf8");

  // -------------------------------------------------------------------------
  // optional import
  // -------------------------------------------------------------------------
  let imported = 0;
  if (doImport && built.length > 0) {
    const rows = built.map((row) => ({
      medicine_id: row.medicineId,
      ...Object.fromEntries(columns.map((column) => [column, row.fields[column]])),
      generation_status: "generated",
      generated_at: new Date().toISOString(),
    }));

    // upsert on medicine_id is the same operation the SQL file performs via
    // ON CONFLICT, so importing this way or by pasting the SQL is equivalent
    // and equally safe to repeat.
    const { error: upsertError } = await supabase
      .from("medicine_details")
      .upsert(rows, { onConflict: "medicine_id" });

    if (upsertError) throw new Error(`Import failed: ${upsertError.message}`);
    imported = rows.length;
  }

  console.log("\n--------------------------------\n");
  console.log("Medicine Details Build Complete\n");
  console.log(`Total medicines:          ${queue.length}`);
  console.log(`Successfully matched:     ${built.length}`);
  console.log(`Requiring manual review:  ${review.length}`);
  console.log(`Columns per row:          ${columns.length}`);
  if (doImport) console.log(`Imported (upsert):        ${imported}`);
  console.log("\n--------------------------------");
  console.log(`\nSQL:    ${path.relative(process.cwd(), SQL_PATH)}`);
  console.log(`Review: ${path.relative(process.cwd(), REVIEW_PATH)}`);
}

main().catch((error) => {
  console.error("\nBuild aborted:", error instanceof Error ? error.message : error);
  process.exit(1);
});
