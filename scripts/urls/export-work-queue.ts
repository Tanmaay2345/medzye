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
  };
}

async function main() {
  const { ids, limit } = parseArgs();

  const select = "id,name,manufacturer,description,is_otc,medicine_details(composition)";
  const filter = ids ? `&id=in.(${ids.join(",")})` : `&limit=${limit}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/medicines?select=${select}&order=id${filter}`, {
    headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) {
    console.error(`Supabase read failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const rows = (await res.json()) as MedicineRow[];

  // Preserve the order the ids were given in, so the queue is reproducible.
  const ordered = ids
    ? ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is MedicineRow => Boolean(r))
    : rows;

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
    console.log(`  ${item.medicine_id}  ${item.brand_name} (${item.manufacturer ?? "?"})  composition=${item.composition ? "yes" : "NO"}`);
  }
  console.log(`\nWritten to ${out}`);
}

main();
