import { redirect } from "next/navigation";

/**
 * The entry point was renamed to "Upload Medicine" because that is what it
 * actually does — it identifies a pack from a photo, it does not accept a
 * doctor's prescription. Kept as a redirect so any existing link or bookmark
 * still lands somewhere useful.
 */
export default function UploadPrescriptionPage() {
  redirect("/upload-medicine");
}
