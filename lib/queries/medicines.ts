import { createClient } from "@/lib/supabase";
import type { Medicine, MedicineWithPrice } from "@/types/database";

type LowestPriceInfo = { price: number; mrp: number | null };

const UNDEFINED_COLUMN = "42703";

/**
 * Attaches the lowest available price (and that offer's mrp, if the column
 * exists once added) across all pharmacies for each medicine. Done in JS
 * because PostgREST doesn't support a MIN()-per-group embedded select
 * without adding a DB view/RPC, which is out of scope (schema is frozen).
 */
async function attachLowestPrices(medicines: Medicine[]): Promise<MedicineWithPrice[]> {
  if (medicines.length === 0) return [];

  const supabase = createClient();
  const ids = medicines.map((medicine) => medicine.id);

  let prices: { medicine_id: number | null; price: number | null; mrp?: number | null }[] | null;
  const withMrp = await supabase
    .from("medicine_prices")
    .select("medicine_id, price, mrp")
    .in("medicine_id", ids);

  if (withMrp.error?.code === UNDEFINED_COLUMN) {
    // medicine_prices.mrp doesn't exist yet in the live schema — fall back
    // to the columns that are guaranteed present. Once mrp is added, the
    // query above starts succeeding again with no code change needed.
    const withoutMrp = await supabase
      .from("medicine_prices")
      .select("medicine_id, price")
      .in("medicine_id", ids);
    if (withoutMrp.error) throw withoutMrp.error;
    prices = withoutMrp.data;
  } else if (withMrp.error) {
    throw withMrp.error;
  } else {
    prices = withMrp.data;
  }

  const lowestByMedicine = new Map<number, LowestPriceInfo>();
  for (const row of prices ?? []) {
    if (row.medicine_id == null || row.price == null) continue;
    const current = lowestByMedicine.get(row.medicine_id);
    if (!current || row.price < current.price) {
      lowestByMedicine.set(row.medicine_id, {
        price: row.price,
        mrp: row.mrp ?? null,
      });
    }
  }

  return medicines.map((medicine) => {
    const lowest = lowestByMedicine.get(medicine.id);
    return {
      ...medicine,
      lowest_price: lowest?.price ?? null,
      lowest_price_mrp: lowest?.mrp ?? null,
    };
  });
}

export async function getDailyEssentials(limit = 10): Promise<MedicineWithPrice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return attachLowestPrices(data ?? []);
}

export async function getMedicinesByCategory(
  categoryId: number
): Promise<MedicineWithPrice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachLowestPrices(data ?? []);
}

export async function getMedicineById(id: number): Promise<MedicineWithPrice | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [withPrice] = await attachLowestPrices([data]);
  return withPrice;
}

export async function searchMedicines(
  query: string,
  limit = 8
): Promise<MedicineWithPrice[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .ilike("name", `%${trimmed}%`)
    .limit(limit);

  if (error) throw error;
  return attachLowestPrices(data ?? []);
}
