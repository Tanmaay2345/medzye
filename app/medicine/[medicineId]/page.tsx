import Image from "next/image";
import { notFound } from "next/navigation";
import { Pill } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { OtcBadge } from "@/components/common/otc-badge";
import { PriceDisplay } from "@/components/common/price-display";
import { DeliveryInfoCallout } from "@/components/medicine/delivery-info-callout";
import { PurchasePanel } from "@/components/medicine/purchase-panel";
import { MedicineTabs } from "@/components/medicine/medicine-tabs";
import { ConsultDoctorBanner } from "@/components/medicine/consult-doctor-banner";
import { getCategories } from "@/lib/queries/categories";
import { getMedicineById } from "@/lib/queries/medicines";

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ medicineId: string }>;
}) {
  const { medicineId } = await params;
  const id = Number(medicineId);
  if (!Number.isFinite(id)) notFound();

  const [categories, medicine] = await Promise.all([
    getCategories(),
    getMedicineById(id),
  ]);

  if (!medicine) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-[1196px] flex-1 flex-col gap-12 px-4 py-12 sm:px-6 lg:px-0">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border border-brand-border-image bg-white lg:w-[471px]">
            {medicine.is_otc && <OtcBadge className="absolute left-0 top-0 z-10" />}
            {medicine.image ? (
              <Image
                src={medicine.image}
                alt={medicine.name ?? ""}
                fill
                sizes="(min-width: 1024px) 471px, 100vw"
                className="object-contain"
                priority
              />
            ) : (
              <span className="flex size-full items-center justify-center">
                <Pill className="size-16 text-brand-gray-300" aria-hidden />
              </span>
            )}
          </div>

          <div className="flex w-full flex-col gap-5">
            <div className="flex flex-col gap-3 border-b border-brand-gray-100 pb-5">
              <h1 className="text-[28px] font-semibold tracking-tight text-brand-gray-900">
                {medicine.name}
              </h1>
              <PriceDisplay price={medicine.lowest_price} mrp={medicine.lowest_price_mrp} size="lg" />
            </div>

            {medicine.description && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-brand-gray-900">Salt Composition</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-brand-gray-500">
                  {medicine.description}
                </p>
              </div>
            )}

            <DeliveryInfoCallout />

            <PurchasePanel disabled={medicine.lowest_price == null} />
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full lg:max-w-[559px]">
            <MedicineTabs medicine={medicine} />
          </div>
          <div className="w-full lg:w-[462px] lg:shrink-0">
            <ConsultDoctorBanner />
          </div>
        </div>
      </main>

      <Footer categories={categories} />
    </div>
  );
}
