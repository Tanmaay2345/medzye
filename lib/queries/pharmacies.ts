import { createClient } from "@/lib/supabase";
import type { Pharmacy, PharmacyOffer } from "@/types/database";

export async function getOffersForMedicine(medicineId: number): Promise<PharmacyOffer[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("medicine_prices")
    .select("*, pharmacy:pharmacies(*)")
    .eq("medicine_id", medicineId)
    .order("price", { ascending: true });

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
