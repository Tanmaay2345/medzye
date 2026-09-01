/**
 * Phase 1 of the URL pipeline: export the medicines that need URL discovery.
 *
 * This script does NOT call the finder skills — it cannot. The finders are
 * model-invoked Claude Skills with no HTTP endpoint and no function binding, so
 * a headless Node process has no way to reach them. This script's job is to
 * produce the work queue that a Claude session (or, later, an n8n run) reads
 * before invoking the skills, and that is the whole reason the pipeline is
 * split into export -> invoke -> import rather than one script.
 *
 * It only ever READS. Nothing here writes to Supabase.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/urls/export-work-queue.ts --ids 2,1,13,14,20
 *   npx tsx --env-file=.env.local scripts/urls/export-work-queue.ts --limit 5
 *   npx tsx --env-file=.env.local scripts/urls/export-work-queue.ts --rank 10
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

/**
 * The four pharmacies that have a finder skill, mapped to their pharmacy_id in
 * the live `pharmacies` table. The other five rows (MedPlus, Wellness Forever,
 * Care Pharmacy, Local Pharmacy, Truemeds) have no finder skill — and Care
 * Pharmacy / Local Pharmacy are fictional seeded names with no website at all —
 * so they are deliberately absent rather than queued and always failing.
 */
const SUPPORTED_PHARMACIES = [
  { pharmacy_id: 1, name: "Apollo Pharmacy", skill: "apollo-product-url-finder",   host: "www.apollopharmacy.in" },
  { pharmacy_id: 3, name: "Tata 1mg",        skill: "tata-1mg-product-url-finder", host: "www.1mg.com" },
  { pharmacy_id: 4, name: "Netmeds",         skill: "netmeds-product-url-finder",  host: "www.netmeds.com" },
  { pharmacy_id: 5, name: "PharmEasy",       skill: "pharmeasy-product-url-finder", host: "pharmeasy.in" },
] as const;

/**
 * Canonical pharmaceutical dose values used in Indian solid and liquid dosage
 * forms. A number inside a brand name counts as a STRENGTH only if it lands on
 * this ladder.
 *
 * This exists because "contains a digit" is not a safe strength test. Two brands
 * in the catalogue carry numbers that are not doses at all: "Liv 52" (Himalaya's
 * brand number) and "Unwanted 72" (a 72-HOUR window, not a milligram figure).
 * Both would otherwise be promoted as if their variant were pinned down.
 */
const CANONICAL_DOSES = new Set([
  "2.5", "5", "10", "12.5", "15", "20", "25", "30", "40", "50", "60", "62.5",
  "75", "80", "100", "120", "125", "150", "160", "180", "200", "250", "300",
  "325", "400", "450", "500", "600", "625", "650", "750", "800", "850", "1000",
]);

const DOSAGE_FORM_RE =
  /\b(tablet|capsule|syrup|suspension|drops?|inhaler|cream|ointment|gel|spray|respules?|solution|powder|husk|liquid|sachet|lotion)\b/i;

/**
 * Medicines known to be un-pinnable from the catalogue alone, from the Batch 3
 * post-mortem. Either the brand ships several strengths and our record carries
 * none (Januvia, Concor, Ventolin, Budecort, Diamicron, Duphaston, Levocet,
 * Teczine, Taxim-O, Deriphyllin Retard), or it is a bulk commodity where pack
 * size is identity-bearing (Savlon, Dettol).
 *
 * This is an evidence-derived list, not a general rule: it was built from
 * medicines already classified by hand. A new brand with the same problem would
 * NOT be caught automatically and must be added here deliberately.
 *
 * Batch 4 demonstrated exactly that gap. Betadine Ointment, Voveran and Digene
 * are un-pinnable for the same reasons as the Batch 3 medicines, but were not on
 * this list, so the score gave them +1 and selected them anyway. All three
 * returned zero URLs and account for 12 of that batch's 16 rejections. They are
 * added below -- deliberately, from observed evidence, exactly as the comment
 * above requires.
 *
 * Being on this list is a SELECTION decision only. It does not delete the
 * medicine, does not mark it invalid, and changes nothing in the medicines
 * table. These rows become eligible again once the catalogue carries the
 * variant-defining field each one needs.
 */
const DEPRIORITIZED_IDS = new Set([
  // Brand ships several strengths and our record carries none.
  34, 58, 59, 72, 74, 80, 85, 87, 89, 94,
  15, // Betadine Ointment -- 5% and 10% w/w listed side by side; no unqualified base listing
  16, // Voveran -- 50 / 50 GE / DT 50 / SR 75 / SR 100 / SR 150
  // Bulk commodity where pack size is identity-bearing.
  30, 45,
  // Dosage form itself is unresolvable from the catalogue.
  22, // Digene -- gel AND chewable tablet, different compositions; our own description says "gel and tablet"
]);

/**
 * How likely we are to be able to identify this medicine's exact product on a
 * pharmacy site, using only what the catalogue holds.
 *
 * Deliberately NOT scored: whether the composition text mentions a strength, and
 * whether the composition is multi-ingredient. Both were in the earlier
 * uncommitted heuristic and both are inverted signals -- they rewarded exactly
 * the dose-titrated brands (Rosuvas, Storvas, Galvus Met, Istamet) that went on
 * to return zero URLs, because detailed dose prose correlates with shipping many
 * strengths rather than with our record pinning one.
 */
function selectionScore(row: MedicineRow): number {
  const name = row.name ?? "";
  const details = Array.isArray(row.medicine_details) ? row.medicine_details[0] : row.medicine_details;
  const blob = `${name} ${row.description ?? ""} ${details?.composition ?? ""}`;

  let score = 0;
  const numbers = name.match(/\d+(?:\.\d+)?/g) ?? [];
  if (numbers.some((n) => CANONICAL_DOSES.has(n))) score += 3;
  if (DOSAGE_FORM_RE.test(blob)) score += 1;
  if (DEPRIORITIZED_IDS.has(row.id)) score -= 6;
  return score;
}

type MedicineRow = {
  id: number;
  name: string | null;
  manufacturer: string | null;
  description: string | null;
  is_otc: boolean | null;
  medicine_details: { composition: string | null }[] | { composition: string | null } | null;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i === -1 ? null : args[i + 1] ?? null;
  };
  const idsRaw = get("--ids");
  return {
    ids: idsRaw ? idsRaw.split(",").map((s) => Number(s.trim())).filter(Number.isInteger) : null,
    limit: Number(get("--limit") ?? 5),
    // --rank N ranks every not-yet-attempted medicine by selectionScore and
    // takes the top N with a non-negative score. --ids and --limit are unchanged.
    rank: get("--rank") ? Number(get("--rank")) : null,
  };
}

async function main() {
  const { ids, limit, rank } = parseArgs();

  const select = "id,name,manufacturer,description,is_otc,medicine_details(composition)";
  // --rank needs the whole catalogue in memory to score it; --ids and --limit
  // keep their original narrow fetch.
  const filter = ids ? `&id=in.(${ids.join(",")})` : rank ? "" : `&limit=${limit}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/medicines?select=${select}&order=id${filter}`, {
    headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) {
    console.error(`Supabase read failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const rows = (await res.json()) as MedicineRow[];

  // Preserve the order the ids were given in, so the queue is reproducible.
  let ordered: MedicineRow[];
  if (ids) {
    ordered = ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is MedicineRow => Boolean(r));
  } else if (rank) {
    // Medicines that already have at least one URL are done; skip them rather
    // than re-ranking work we have already completed.
    const urlsRes = await fetch(`${SUPABASE_URL}/rest/v1/medicine_product_urls?select=medicine_id`, {
      headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    if (!urlsRes.ok) {
      console.error(`Could not read medicine_product_urls: ${urlsRes.status}`);
      process.exit(1);
    }
    const attempted = new Set(
      ((await urlsRes.json()) as { medicine_id: number }[]).map((r) => r.medicine_id)
    );
    const candidates = rows.filter((r) => !attempted.has(r.id));
    ordered = candidates
      .map((row) => ({ row, score: selectionScore(row) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score || a.row.id - b.row.id)
      .slice(0, rank)
      .map((entry) => entry.row);

    const skipped = candidates
      .filter((r) => selectionScore(r) < 0)
      .map((r) => `${r.id} ${r.name}`);
    console.log(`Ranking ${candidates.length} unattempted medicines; taking top ${rank}.`);
    console.log(`Deprioritised (negative score, excluded): ${skipped.length}`);
    for (const s of skipped) console.log(`  - ${s}`);
    console.log("");
  } else {
    ordered = rows;
  }

  const queue = ordered.map((row) => {
    const details = Array.isArray(row.medicine_details) ? row.medicine_details[0] : row.medicine_details;
    return {
      medicine_id: row.id,
      // Exactly the fields that exist in our schema. generic_name, strength,
      // dosage_form and pack_size are NOT columns in `medicines`, so they are
      // reported as unavailable rather than derived — the finder skills are
      // instructed to return NO_MATCH or a LOW confidence instead of guessing.
      brand_name: row.name,
      manufacturer: row.manufacturer,
      description: row.description,
      composition: details?.composition ?? null,
      is_otc: row.is_otc,
      unavailable_fields: ["generic_name", "strength", "dosage_form", "pack_size"],
      targets: SUPPORTED_PHARMACIES.map((p) => ({ ...p })),
    };
  });

  const payload = {
    run_id: `pilot-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    generated_at: new Date().toISOString(),
    medicine_count: queue.length,
    invocation_count: queue.length * SUPPORTED_PHARMACIES.length,
    queue,
  };

  const dir = join(process.cwd(), "scripts/urls/results");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "work-queue.json");
  writeFileSync(out, JSON.stringify(payload, null, 2));

  console.log(`Work queue: ${payload.medicine_count} medicines x ${SUPPORTED_PHARMACIES.length} pharmacies = ${payload.invocation_count} finder invocations`);
  for (const item of queue) {
    const row = ordered.find((r) => r.id === item.medicine_id)!;
    console.log(
      `  ${item.medicine_id}  ${item.brand_name} (${item.manufacturer ?? "?"})  ` +
        `composition=${item.composition ? "yes" : "NO"}  score=${selectionScore(row)}`
    );
  }
  console.log(`\nWritten to ${out}`);
}

main();
