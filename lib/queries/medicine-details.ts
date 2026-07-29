import { createClient } from "@/lib/supabase";
import type { MedicineDetails } from "@/types/database";

/** Shown when a medicine has no medicine_details row. */
export const DETAILS_UNAVAILABLE_MESSAGE =
  "Medicine information is currently unavailable.";

/**
 * Plain database read, run on the server during the detail page render. This
 * is the only path to medicine details: there is no runtime generation and no
 * fallback that reaches outside the database.
 *
 * A missing row is a normal, expected outcome (the bulk script hasn't covered
 * this medicine yet), so it returns null rather than throwing. A genuine
 * transport or permissions failure is also treated as "no details": the page
 * then shows the unavailable message instead of 500ing, which is the safer
 * failure mode for one section of an otherwise healthy page.
 */
export async function getMedicineDetails(
  medicineId: number
): Promise<MedicineDetails | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("medicine_details")
    .select("*")
    .eq("medicine_id", medicineId)
    .maybeSingle();

  if (error) {
    console.error("[medicine-details] read failed", {
      medicineId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return (data as MedicineDetails | null) ?? null;
}
