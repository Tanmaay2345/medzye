import { createClient } from "@/lib/supabase";
import type { MedicineProductUrl, ResolvedProductUrl } from "@/types/database";

/** PostgREST code for "relation does not exist". */
const UNDEFINED_TABLE = "42P01";

/**
 * Prefer a real product page over a search fallback. Within a type the row is
 * already unique per (medicine, pharmacy), so this only ever breaks the tie
 * between a DIRECT_PRODUCT and a SEARCH row for the same pharmacy.
 */
const TYPE_RANK: Record<MedicineProductUrl["url_type"], number> = {
  DIRECT_PRODUCT: 0,
  SEARCH: 1,
};

/**
 * The URL the user should actually be sent to.
 *
 * For a REDIRECT_VERIFIED row the stored `url` is known to redirect, and
 * `final_url` is where it verifiably landed — so we send the user straight to
 * the destination rather than through a hop that could later break
 * independently of the product still existing.
 */
function effectiveUrl(row: Pick<MedicineProductUrl, "url" | "final_url" | "verification_status">): string {
  return row.verification_status === "REDIRECT_VERIFIED" && row.final_url ? row.final_url : row.url;
}

/**
 * Managed URL for one medicine at one pharmacy, or null.
 *
 * There is deliberately no status filter here: RLS on medicine_product_urls
 * already restricts public SELECT to VERIFIED / REDIRECT_VERIFIED, so an
 * unverified row is invisible to the publishable key and cannot be returned.
 * Filtering again in the client would just duplicate a rule the database
 * already enforces — and the database is the copy that can't be bypassed.
 *
 * Returns null rather than throwing when the table doesn't exist yet, so the
 * page keeps rendering on a deployment where the migration hasn't been applied.
 */
export async function getProductUrl(
  medicineId: number,
  pharmacyId: number
): Promise<ResolvedProductUrl | null> {
  if (!Number.isInteger(medicineId) || !Number.isInteger(pharmacyId)) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("medicine_product_urls")
    .select("url, final_url, url_type, verification_status, pharmacy:pharmacies(*)")
    .eq("medicine_id", medicineId)
    .eq("pharmacy_id", pharmacyId);

  if (error) {
    if (error.code !== UNDEFINED_TABLE) {
      console.error("[product-urls] lookup failed", { medicineId, pharmacyId, code: error.code });
    }
    return null;
  }

  const rows = (data ?? []) as unknown as (MedicineProductUrl & { pharmacy: ResolvedProductUrl["pharmacy"] })[];
  const best = rows
    .filter((row) => row.pharmacy != null)
    .sort((a, b) => TYPE_RANK[a.url_type] - TYPE_RANK[b.url_type])[0];

  if (!best) return null;

  return {
    url: effectiveUrl(best),
    url_type: best.url_type,
    verification_status: best.verification_status,
    pharmacy: best.pharmacy,
  };
}
