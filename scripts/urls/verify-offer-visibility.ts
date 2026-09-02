/**
 * Checks the comparison sheet's offer-visibility rule against live data.
 *
 * The rule (lib/visible-offers.ts) decides which pharmacies a user can reach,
 * so it is verified the same way the URL pipeline is: by asserting invariants
 * over every row, not by clicking through one example. Read-only — it opens no
 * write path and touches no table.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/urls/verify-offer-visibility.ts
 */
import { visibleOffers, VISIBLE_OFFER_COUNT } from "../../lib/visible-offers";
import type { PharmacyOffer } from "../../types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as T;
}

type PriceRow = { id: number; medicine_id: number; pharmacy_id: number | null; price: number | null };
type UrlRow = { medicine_id: number; pharmacy_id: number };

async function main() {
  const [prices, urls] = await Promise.all([
    rest<PriceRow[]>("medicine_prices?select=id,medicine_id,pharmacy_id,price"),
    rest<UrlRow[]>("medicine_product_urls?select=medicine_id,pharmacy_id"),
  ]);

  const verifiedByMedicine = new Map<number, Set<number>>();
  for (const u of urls) {
    if (!verifiedByMedicine.has(u.medicine_id)) verifiedByMedicine.set(u.medicine_id, new Set());
    verifiedByMedicine.get(u.medicine_id)!.add(u.pharmacy_id);
  }

  const byMedicine = new Map<number, PriceRow[]>();
  for (const p of prices) {
    if (!byMedicine.has(p.medicine_id)) byMedicine.set(p.medicine_id, []);
    byMedicine.get(p.medicine_id)!.push(p);
  }

  const failures: string[] = [];
  let hiddenVerified = 0;
  let widened = 0;
  let maxRows = 0;

  for (const [medicineId, rows] of byMedicine) {
    // Same order the query produces: price ascending, id breaking ties.
    rows.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || a.id - b.id);
    const verified = verifiedByMedicine.get(medicineId) ?? new Set<number>();
    const shown = visibleOffers(rows as unknown as PharmacyOffer[], verified) as unknown as PriceRow[];
    maxRows = Math.max(maxRows, shown.length);
    if (shown.length > VISIBLE_OFFER_COUNT) widened += 1;

    // 1. Every offer whose pharmacy has a verified URL is reachable.
    for (const r of rows) {
      if (r.pharmacy_id != null && verified.has(r.pharmacy_id) && !shown.includes(r)) {
        hiddenVerified += 1;
        failures.push(`m${medicineId}: verified offer ${r.id} (pharmacy ${r.pharmacy_id}) is hidden`);
      }
    }

    // 2. Price order is preserved — verified offers are not hoisted.
    const shownPrices = shown.map((r) => r.price ?? Infinity);
    if (shownPrices.some((p, i) => i > 0 && p < shownPrices[i - 1])) {
      failures.push(`m${medicineId}: visible list is not price-ascending`);
    }

    // 3. The cheapest VISIBLE_OFFER_COUNT are always still present.
    for (const r of rows.slice(0, VISIBLE_OFFER_COUNT)) {
      if (!shown.includes(r)) failures.push(`m${medicineId}: cheapest offer ${r.id} was dropped`);
    }

    // 4. Nothing is invented or duplicated.
    if (new Set(shown.map((r) => r.id)).size !== shown.length) {
      failures.push(`m${medicineId}: duplicate offer in visible list`);
    }
    if (shown.some((r) => !rows.includes(r))) {
      failures.push(`m${medicineId}: visible list contains an offer that is not this medicine's`);
    }
  }

  console.log(`medicines checked            : ${byMedicine.size}`);
  console.log(`verified offers still hidden : ${hiddenVerified}`);
  console.log(`medicines showing > ${VISIBLE_OFFER_COUNT} rows      : ${widened}`);
  console.log(`max rows rendered            : ${maxRows}`);
  console.log(`invariant failures           : ${failures.length}`);
  for (const f of failures.slice(0, 20)) console.log(`  ${f}`);

  process.exit(failures.length === 0 ? 0 : 1);
}

main();
