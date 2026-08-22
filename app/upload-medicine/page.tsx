import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MedicineUploader } from "@/components/upload/medicine-uploader";
import { getCategories } from "@/lib/queries/categories";

export const metadata = {
  title: "Upload Medicine — Medyze",
  description:
    "Upload a photo of your medicine pack to identify it and compare prices across pharmacies.",
};

export default async function UploadMedicinePage() {
  const categories = await getCategories();

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-[1196px] flex-1 flex-col gap-8 px-4 py-12 sm:px-6 lg:px-0">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold tracking-tight text-brand-gray-900">
            Upload Medicine
          </h1>
          <p className="max-w-2xl text-brand-gray-500">
            Take or choose a photo of the medicine pack. The text is read on your
            device — the image is never uploaded — and matched against the Medyze
            catalogue so you can compare prices.
          </p>
        </div>
        <MedicineUploader />
      </main>
      <Footer categories={categories} />
    </div>
  );
}
