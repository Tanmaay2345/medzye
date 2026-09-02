import { createClient } from "@/lib/supabase";
import type { Pharmacy, PharmacyOffer } from "@/types/database";

export async function getOffersForMedicine(medicineId: number): Promise<PharmacyOffer[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("medicine_prices")
    .select("*, pharmacy:pharmacies(*)")
    .eq("medicine_id", medicineId)
    // id breaks price ties. Without it two offers at the same price can come
    // back in either order, so which one lands inside a capped list — and
    // therefore which pharmacy the user is offered — could differ between two
    // renders of the same medicine. Ordering is part of the selection contract
    // here, not just presentation.
    .order("price", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  return (data ?? []).filter(
    (row): row is PharmacyOffer => row.pharmacy != null
  ) as unknown as PharmacyOffer[];
}

export async function getPharmacyById(id: number): Promise<Pharmacy | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Resolve a single offer by its `medicine_prices.id`, for the `?offer=` param
 * the comparison modal appends when the user picks a pharmacy.
 *
 * `expectedMedicineId` is required rather than optional on purpose: the id
 * arrives from a URL the user can edit, so it is untrusted. An offer that
 * belongs to a different medicine resolves to null instead of surfacing
 * another medicine's pharmacy and price on this page.
 *
 * A miss is an ordinary outcome (stale link, hand-edited URL), so this returns
 * null and lets the caller fall back rather than throwing.
 */
export async function getOfferById(
  offerId: number,
  expectedMedicineId: number
): Promise<PharmacyOffer | null> {
  if (!Number.isInteger(offerId) || offerId <= 0) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("medicine_prices")
    .select("*, pharmacy:pharmacies(*)")
    .eq("id", offerId)
    .maybeSingle();

  if (error) {
    console.error("[pharmacies] offer lookup failed", { offerId, code: error.code });
    return null;
  }
  if (!data || data.medicine_id !== expectedMedicineId || data.pharmacy == null) {
    return null;
  }

  return data as unknown as PharmacyOffer;
}
