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
import { getMedicineDetails } from "@/lib/queries/medicine-details";
import { getMedicineById } from "@/lib/queries/medicines";
import { getOfferById } from "@/lib/queries/pharmacies";
import { IMAGE_BLUR_DATA_URL } from "@/utils/image-placeholder";

export default async function MedicineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ medicineId: string }>;
  /** `?offer=` carries the pharmacy offer picked in the comparison modal. */
  searchParams: Promise<{ offer?: string }>;
}) {
  const [{ medicineId }, { offer: offerParam }] = await Promise.all([params, searchParams]);
  const id = Number(medicineId);
  if (!Number.isFinite(id)) notFound();

  // Anything non-numeric becomes NaN, which getOfferById rejects — so a
  // hand-edited ?offer=abc falls back rather than throwing.
  const offerId = offerParam == null ? null : Number(offerParam);

  // Details are read in the same round as the medicine itself, so the tabs
  // render complete on the first byte. A null result means the bulk
  // generation script hasn't covered this medicine yet.
  const [categories, medicine, details, selectedOffer] = await Promise.all([
    getCategories(),
    getMedicineById(id),
    getMedicineDetails(id),
    // Returns null unless the offer exists AND belongs to this medicine, so a
    // mismatched id can never surface another medicine's pharmacy or price.
    offerId == null ? Promise.resolve(null) : getOfferById(offerId, id),
  ]);

  if (!medicine) notFound();

  // With a valid selection the page reflects the offer the user actually
  // chose; without one it keeps the previous behaviour (lowest price across
  // pharmacies).
  //
  // Note this is a ternary, not `selectedOffer?.price ?? lowest_price`:
  // `medicine_prices.price` is nullable, so `??` would quietly fall through to
  // a different pharmacy's price while the label still said "Selected from
  // <this pharmacy>". Once an offer is selected its price is authoritative
  // even when absent — PriceDisplay renders "Price unavailable", which is
  // honest, rather than attributing someone else's number to this pharmacy.
  const displayPrice = selectedOffer ? selectedOffer.price : medicine.lowest_price;
  const displayMrp = selectedOffer ? selectedOffer.mrp ?? null : medicine.lowest_price_mrp;

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
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_DATA_URL}
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
              <PriceDisplay price={displayPrice} mrp={displayMrp} size="lg" />
              {selectedOffer && (
                <p className="text-sm text-brand-gray-500">
                  Selected from{" "}
                  <span className="font-medium text-brand-gray-900">
                    {selectedOffer.pharmacy.name ?? "this pharmacy"}
                  </span>
                </p>
              )}
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

            <PurchasePanel disabled={displayPrice == null} />
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full lg:max-w-[559px]">
            <MedicineTabs medicine={medicine} details={details} />
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
