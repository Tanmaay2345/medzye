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

export type MedicineWithPrice = Medicine & {
  lowest_price: number | null;
  lowest_price_mrp: number | null;
};

export type PharmacyOffer = MedicinePrice & {
  pharmacy: Pharmacy;
};
