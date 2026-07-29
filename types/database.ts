export type Category = {
  id: number;
  created_at: string;
  name: string | null;
  icon: string | null;
};

export type Medicine = {
  id: number;
  created_at: string;
  name: string | null;
  manufacturer: string | null;
  description: string | null;
  image: string | null;
  is_otc: boolean | null;
  category_id: number | null;
};

export type Pharmacy = {
  id: number;
  created_at: string;
  name: string | null;
  logo: string | null;
  location: string | null;
};

/**
 * `mrp` is not yet a column in medicine_prices — the UI reads it optionally
 * and hides discount pricing entirely when it's absent. Add it as a nullable
 * numeric column later to enable strikethrough/discount pricing with no code
 * changes required.
 */
export type MedicinePrice = {
  id: number;
  created_at: string;
  medicine_id: number | null;
  pharmacy_id: number | null;
  price: number | null;
  mrp?: number | null;
  last_updated: string | null;
};

/**
 * One row per medicine, populated offline by
 * scripts/seed/generate-medicine-details.ts and read-only at runtime. A row
 * existing means generation succeeded and was validated — partial records are
 * never stored — so every text field is non-empty.
 *
 * `warnings` and `storage_information` are typed nullable because they were
 * added after the table (migration 20260728160000) and are nullable in the
 * schema, even though the completeness constraint requires them on any row
 * marked 'generated'.
 */
export type MedicineDetails = {
  id: number;
  medicine_id: number;
  medicine_activity: string;
  uses: string;
  side_effects: string;
  composition: string;
  manufacturer_details: string;
  warnings: string | null;
  storage_information: string | null;
  generation_status: "pending" | "generated" | "failed";
  generated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MedicineWithPrice = Medicine & {
  lowest_price: number | null;
  lowest_price_mrp: number | null;
};

export type PharmacyOffer = MedicinePrice & {
  pharmacy: Pharmacy;
};
