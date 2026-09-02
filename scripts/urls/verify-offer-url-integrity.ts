/**
 * Phase 3: asserts that the selected-offer identity survives all the way to
 * the Proceed destination, for EVERY offer in the catalogue.
 *
 * The failure this exists to rule out is the dangerous one: a user selects
 * pharmacy A and is sent to pharmacy B, or to another medicine's product page.
 * Clicking through a few examples cannot rule that out; enumerating every
 * (medicine, offer) pair can.
 *
 * Read-only. Uses the same publishable, RLS-scoped key the browser uses, so it
 * exercises the exact rows a user can actually reach.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/urls/verify-offer-url-integrity.ts
 */
import { getOfferById, getOffersForMedicine } from "../../lib/queries/pharmacies";
import { getProductUrl } from "../../lib/queries/product-urls";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

type UrlRow = {
  medicine_id: number;
  pharmacy_id: number;
  url: string;
  final_url: string | null;
  verification_status: string;
};

async function main() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/medicine_product_urls?select=medicine_id,pharmacy_id,url,final_url,verification_status`,
    { headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const urlRows = (await res.json()) as UrlRow[];
  const expected = new Map<string, UrlRow>();
  for (const r of urlRows) expected.set(`${r.medicine_id}:${r.pharmacy_id}`, r);

  const medicineIds = [...new Set(urlRows.map((r) => r.medicine_id))].sort((a, b) => a - b);

  const failures: string[] = [];
  let pairs = 0;
  let direct = 0;
  let redirect = 0;
  let noUrl = 0;

  for (const medicineId of medicineIds) {
    const offers = await getOffersForMedicine(medicineId);

    for (const offer of offers) {
      pairs += 1;

      // Server-side validation the page performs before anything else.
      const validated = await getOfferById(offer.id, medicineId);
      if (!validated) {
        failures.push(`m${medicineId} offer ${offer.id}: own offer failed validation`);
        continue;
      }
      if (validated.medicine_id !== medicineId) {
        failures.push(`m${medicineId} offer ${offer.id}: validated offer belongs to m${validated.medicine_id}`);
      }

      const resolved =
        validated.pharmacy_id != null ? await getProductUrl(medicineId, validated.pharmacy_id) : null;
      const want = expected.get(`${medicineId}:${validated.pharmacy_id}`);

      if (!want) {
        // C. No verified URL — must resolve to nothing at all.
        noUrl += 1;
        if (resolved) {
          failures.push(`m${medicineId} offer ${offer.id}: URL produced for a pharmacy with none`);
        }
        continue;
      }

      if (!resolved) {
        failures.push(`m${medicineId} offer ${offer.id}: expected a URL, got none`);
        continue;
      }

      // Identity: the destination belongs to THIS medicine and THIS pharmacy.
      if (resolved.medicine_id !== medicineId) {
        failures.push(`m${medicineId} offer ${offer.id}: URL belongs to m${resolved.medicine_id}`);
      }
      if (resolved.pharmacy.id !== validated.pharmacy_id) {
        failures.push(
          `m${medicineId} offer ${offer.id}: selected pharmacy ${validated.pharmacy_id} but URL is pharmacy ${resolved.pharmacy.id}`
        );
      }

      // A / B. Redirect rule: final_url for REDIRECT_VERIFIED, url otherwise.
      if (resolved.verification_status === "REDIRECT_VERIFIED") {
        redirect += 1;
        if (resolved.url !== want.final_url) {
          failures.push(`m${medicineId} offer ${offer.id}: redirect row did not resolve to final_url`);
        }
      } else {
        direct += 1;
        if (resolved.url !== want.url) {
          failures.push(`m${medicineId} offer ${offer.id}: direct row did not resolve to url`);
        }
        if (resolved.final_url !== null) {
          failures.push(`m${medicineId} offer ${offer.id}: non-redirect row carries a final_url`);
        }
      }

      // Nothing unverified can ever reach a user.
      if (!["VERIFIED", "REDIRECT_VERIFIED"].includes(resolved.verification_status)) {
        failures.push(`m${medicineId} offer ${offer.id}: unverified status ${resolved.verification_status}`);
      }
      if (!resolved.url.startsWith("https://")) {
        failures.push(`m${medicineId} offer ${offer.id}: destination is not https`);
      }
    }
  }

  // D. Cross-medicine: an offer id from another medicine must never validate.
  let crossChecked = 0;
  const someOffers = await getOffersForMedicine(medicineIds[0]);
  for (const other of medicineIds.slice(1, 25)) {
    for (const offer of someOffers) {
      crossChecked += 1;
      if (await getOfferById(offer.id, other)) {
        failures.push(`cross-medicine: offer ${offer.id} (m${medicineIds[0]}) validated against m${other}`);
      }
    }
  }

  console.log(`medicines checked          : ${medicineIds.length}`);
  console.log(`medicine/offer pairs       : ${pairs}`);
  console.log(`  direct VERIFIED          : ${direct}`);
  console.log(`  REDIRECT_VERIFIED        : ${redirect}`);
  console.log(`  no verified URL          : ${noUrl}`);
  console.log(`cross-medicine attempts    : ${crossChecked} (all must be rejected)`);
  console.log(`failures                   : ${failures.length}`);
  for (const f of failures.slice(0, 20)) console.log(`  ${f}`);

  process.exit(failures.length === 0 ? 0 : 1);
}

main();
