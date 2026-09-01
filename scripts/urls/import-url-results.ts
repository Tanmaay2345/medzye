/**
 * Phase 3 of the URL pipeline: validate normalised skill results and upsert
 * the accepted ones into medicine_product_urls.
 *
 * This is the ONLY place that writes URLs to Supabase, and it re-applies every
 * acceptance rule itself rather than trusting the JSON it is handed. The file
 * is produced by a Claude session (or later n8n) transcribing skill output, so
 * it is treated as untrusted input: a hand-edited `accept: true` cannot get a
 * URL in on its own.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/urls/import-url-results.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/urls/import-url-results.ts --import
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

/** Host allow-list per pharmacy. A verified URL must live on its pharmacy's own
 *  domain — this is what stops a finder result for one pharmacy being stored
 *  against another, and blocks any off-site URL entirely. */
const PHARMACY_HOSTS: Record<number, string[]> = {
  1: ["www.apollopharmacy.in", "apollopharmacy.in"],
  3: ["www.1mg.com", "1mg.com"],
  4: ["www.netmeds.com", "netmeds.com"],
  5: ["pharmeasy.in", "www.pharmeasy.in"],
};

const CONFIDENCE_FLOOR = 0.70; // MEDIUM. LOW (0.40) is never accepted.
const ACCEPTABLE = new Set(["VERIFIED", "REDIRECT_VERIFIED"]);

type Result = {
  medicine_id: number; pharmacy_id: number; pharmacy_name: string;
  url_type: "DIRECT_PRODUCT" | "SEARCH";
  finder: { source_skill: string; status: string; product_url: string | null };
  verifier: { status: string; final_url: string | null; product_page: string; match_confidence: string; redirect: string; evidence: string; notes?: string };
  resolved: { verification_status: string; match_confidence: number; final_url: string | null; accept: boolean };
};

function hostOf(url: string): string | null {
  try { return new URL(url).host; } catch { return null; }
}

/** Re-derive acceptance from the evidence. Never trusts `resolved.accept`. */
function validate(r: Result): string[] {
  const errs: string[] = [];
  const url = r.finder.product_url;

  if (r.finder.status !== "FOUND" || !url) { errs.push("finder did not return a URL"); return errs; }
  if (!url.startsWith("https://")) errs.push("url is not https");
  if (!ACCEPTABLE.has(r.resolved.verification_status)) errs.push(`status ${r.resolved.verification_status} is not servable`);
  if (r.verifier.product_page !== "YES") errs.push("verifier did not confirm a product page");
  if (r.resolved.match_confidence < CONFIDENCE_FLOOR) errs.push(`confidence ${r.resolved.match_confidence} below floor`);

  // A SEARCH url may never be verified — mirrors the DB check constraint.
  if (r.url_type === "SEARCH" && ACCEPTABLE.has(r.resolved.verification_status)) {
    errs.push("SEARCH url may not be VERIFIED");
  }
  // REDIRECT_VERIFIED must carry where it landed.
  if (r.resolved.verification_status === "REDIRECT_VERIFIED" && !r.resolved.final_url) {
    errs.push("REDIRECT_VERIFIED without final_url");
  }
  // The URL the user is sent to must be on the intended pharmacy's domain.
  const allowed = PHARMACY_HOSTS[r.pharmacy_id];
  const effective = r.resolved.final_url ?? url;
  const host = hostOf(effective);
  if (!allowed) errs.push(`pharmacy_id ${r.pharmacy_id} has no host allow-list`);
  else if (!host || !allowed.includes(host)) errs.push(`host ${host} not allowed for ${r.pharmacy_name}`);

  return errs;
}

async function main() {
  const args = process.argv.slice(2);
  const doImport = args.includes("--import");
  const fileFlag = args.indexOf("--file");
  const file = fileFlag !== -1 && args[fileFlag + 1]
    ? join(process.cwd(), args[fileFlag + 1])
    : join(process.cwd(), "scripts/urls/results/pilot-results.json");
  const payload = JSON.parse(readFileSync(file, "utf8")) as { results: Result[] };

  const accepted: Record<string, unknown>[] = [];
  let rejected = 0;

  for (const r of payload.results) {
    const errs = validate(r);
    const key = `m${r.medicine_id}/p${r.pharmacy_id}/${r.url_type}`;
    if (errs.length) {
      rejected++;
      console.log(`  REJECT ${key}: ${errs.join("; ")}`);
      continue;
    }
    accepted.push({
      medicine_id: r.medicine_id,
      pharmacy_id: r.pharmacy_id,
      url_type: r.url_type,
      url: r.finder.product_url,
      final_url: r.resolved.final_url,
      verification_status: r.resolved.verification_status,
      match_confidence: r.resolved.match_confidence,
      last_verified_at: new Date().toISOString(),
      source_skill: r.finder.source_skill,
      verification_notes: [r.verifier.evidence, r.verifier.notes].filter(Boolean).join(" | ").slice(0, 900),
    });
  }

  console.log(`\n${accepted.length} accepted, ${rejected} rejected of ${payload.results.length}.`);

  if (!doImport) {
    console.log("\nDRY RUN — nothing written. Re-run with --import to upsert.");
    for (const a of accepted) console.log(`  + m${a.medicine_id}/p${a.pharmacy_id} ${a.verification_status} ${a.url}`);
    return;
  }

  // resolution=merge-duplicates makes this an UPSERT on the unique constraint
  // (medicine_id, pharmacy_id, url_type). Re-running updates the existing row
  // rather than inserting a duplicate. created_at is never in the payload, so
  // the original insert timestamp survives; updated_at moves via the trigger.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/medicine_product_urls?on_conflict=medicine_id,pharmacy_id,url_type`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(accepted),
  });

  if (!res.ok) {
    console.error(`Upsert failed: ${res.status}\n${await res.text()}`);
    process.exit(1);
  }
  const rows = (await res.json()) as { id: number }[];
  console.log(`Upserted ${rows.length} rows.`);
}

main();
