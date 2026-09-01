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

/**
 * A managed outbound URL to a pharmacy's page for a medicine.
 *
 * Written offline by scripts/urls/*, never by the app. RLS restricts public
 * SELECT to VERIFIED / REDIRECT_VERIFIED rows, so any row the browser can read
 * is already safe to serve — but `verification_status` is still typed with the
 * full set because the offline scripts run with the service-role key and do
 * see the rest.
 *
 * `match_confidence` comes from the VERIFIER, not the finder: the finder's own
 * confidence is provenance only and never decides acceptance.
 */
export type MedicineProductUrl = {
  id: number;
  medicine_id: number;
  pharmacy_id: number;
  url_type: "DIRECT_PRODUCT" | "SEARCH";
  url: string;
  final_url: string | null;
  verification_status:
    | "PENDING"
    | "VERIFIED"
    | "REDIRECT_VERIFIED"
    | "INVALID"
    | "UNREACHABLE"
    | "NOT_FOUND"
    | "AMBIGUOUS"
    | "TEMPLATE_UNVERIFIED";
  match_confidence: number | null;
  last_verified_at: string | null;
  source_skill: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
};

/** A verified URL joined to the pharmacy it points at, for the detail page. */
export type ResolvedProductUrl = {
  url: string;
  url_type: MedicineProductUrl["url_type"];
  verification_status: MedicineProductUrl["verification_status"];
  pharmacy: Pharmacy;
};
