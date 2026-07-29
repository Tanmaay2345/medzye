"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { OtcBadge } from "@/components/common/otc-badge";
import { EmptyState } from "@/components/common/empty-state";
import { PharmacyPriceRow } from "@/components/cards/pharmacy-price-row";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getOffersForMedicine } from "@/lib/queries/pharmacies";
import { IMAGE_BLUR_DATA_URL } from "@/utils/image-placeholder";
import type { MedicineWithPrice, PharmacyOffer } from "@/types/database";

// The Figma sheet shows exactly 4 brand options. Extra offers stay in the
// data (getOffersForMedicine still returns everything) — this only limits
// what this sheet renders.
const VISIBLE_OFFER_COUNT = 4;

const TRUST_BADGES = [
  { label: "Same composition", icon: "/images/trust-badge-same-composition.svg" },
  { label: "Fast Delivery", icon: "/images/trust-badge-fast-delivery.svg" },
  { label: "Nearby store", icon: "/images/trust-badge-nearby-store.svg" },
];

// Offsets below were measured off a pixel render of the Figma frame (764px
// wide): header content starts at x=48 (px-12), summary + pharmacy cards at
// x=32 (px-8), header is 74px tall with a dashed rule under it, cards sit
// 24px apart (gap-6), and the footer CTA is ~171px wide and centered.
export function PriceComparisonModal({
  medicine,
  open,
  onOpenChange,
}: {
  medicine: MedicineWithPrice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [offers, setOffers] = useState<PharmacyOffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const hasSelection = selectedOfferId != null;

  useEffect(() => {
    if (!open) return;
    setSelectedOfferId(null);
    setIsLoading(true);
    getOffersForMedicine(medicine.id)
      .then(setOffers)
      .finally(() => setIsLoading(false));
  }, [open, medicine.id]);

  // Stage 3: picking a brand with ADD selects it, then the footer's
  // "Continue" CTA (the primary action in the Figma) closes the sheet and
  // navigates on to the medicine detail page.
  const handleContinue = () => {
    onOpenChange(false);
    router.push(`/medicine/${medicine.id}`);
  };

  const header = (
    <div className="flex h-[74px] w-full shrink-0 items-center gap-4 border-b border-dashed border-[#e6e6e6] px-12">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label="Close"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-gray-50 text-brand-gray-900 transition-colors hover:bg-brand-gray-100"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      {isDesktop ? (
        <DialogTitle className="flex-1 text-2xl font-semibold tracking-[-0.4px] text-[#6f6e6e]">
          Choose Your Medicine From Different Brands
        </DialogTitle>
      ) : (
        <SheetTitle className="flex-1 text-xl font-semibold tracking-[-0.4px] text-[#6f6e6e]">
          Choose Your Medicine From Different Brands
        </SheetTitle>
      )}
    </div>
  );

  const summary = (
    <div className="flex flex-col gap-4 border-b border-dashed border-[#e2e2e2] px-8 pb-4 pt-2 sm:flex-row sm:items-center">
      <span className="relative shrink-0 self-center rounded-lg border border-[#dcdcdc] bg-white p-2.5">
        <span className="relative block size-[104px] sm:size-[167px]">
          {medicine.is_otc && <OtcBadge className="absolute -left-px -top-px z-10" />}
          {medicine.image && (
            <Image
              src={medicine.image}
              alt={medicine.name ?? ""}
              fill
              sizes="(min-width: 640px) 167px, 104px"
              className="object-contain"
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
            />
          )}
        </span>
      </span>
      {/* Right content block: vertically centered as a unit against the
          image (via the row's items-center), with uniform gap-4 at every
          level so name / composition / icons read as evenly spaced. */}
      <div className="flex flex-1 flex-col justify-center gap-4">
        <h3 className="text-xl font-bold text-brand-navy">{medicine.name}</h3>
        {medicine.description && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-brand-gray-900">Salt Composition</p>
            <p className="line-clamp-2 text-[13px] text-brand-gray-500">
              {medicine.description}
            </p>
          </div>
        )}
        <div className="flex gap-4">
          {TRUST_BADGES.map(({ label, icon }) => (
            <div key={label} className="flex flex-col items-start gap-1">
              <Image src={icon} alt="" width={40} height={39} aria-hidden />
              <span className="text-xs text-brand-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // gap-3 (12px) rather than the Figma's literal 24px: tightening the list
  // is what funds the CTA's breathing room below, and at 4 rows it reclaims
  // ~36px without touching row height, typography, or touch targets.
  const list = (
    <div className="flex flex-col gap-3 px-8">
      {isLoading && (
        <p className="py-8 text-center text-sm text-brand-gray-500">Loading prices…</p>
      )}
      {!isLoading && offers.length === 0 && (
        <EmptyState
          title="No pharmacy prices yet"
          description="Once pharmacies add prices for this medicine in Supabase, they'll appear here."
        />
      )}
      {!isLoading &&
        offers.slice(0, VISIBLE_OFFER_COUNT).map((offer) => (
          <PharmacyPriceRow
            key={offer.id}
            offer={offer}
            selected={selectedOfferId === offer.id}
            onSelect={() => setSelectedOfferId(offer.id)}
          />
        ))}
    </div>
  );

  // Only rendered once a brand is picked — it fades/slides up rather than
  // popping in, and lives outside the offer list so it reads as the sheet's
  // fixed CTA instead of another row.
  const footer = hasSelection ? (
    <div className="flex animate-in justify-center px-8 pt-4 fade-in-0 slide-in-from-bottom-2 duration-200 ease-out">
      <button
        type="button"
        onClick={handleContinue}
        className="flex w-full max-w-[171px] items-center justify-center gap-2 rounded-lg bg-brand-success-solid py-3 font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
      >
        Continue
        <ArrowRight className="size-5" aria-hidden />
      </button>
    </div>
  ) : null;

  // Space reclaimed from the tighter offer list is spent here: pb-10 (40px)
  // below the CTA and gap-5 + the footer's pt-4 (36px) above it, so the
  // button floats between the last card and the sheet edge instead of
  // hugging the bottom.
  const content = (
    <div className="flex flex-col gap-5 pb-10 pt-8">
      <div className="flex flex-col gap-4">
        {header}
        {summary}
      </div>
      {list}
      {footer}
    </div>
  );

  return isDesktop ? (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-[764px] (not just max-w-) is required: DialogContent's own
          base classes include `sm:max-w-sm`, and tailwind-merge keeps both
          because the breakpoint modifiers differ — so an unprefixed
          max-w-[764px] loses to it at >=640px. */}
      <DialogContent showCloseButton={false} className="gap-0 rounded-[16px] p-0 sm:max-w-[764px]">
        {content}
      </DialogContent>
    </Dialog>
  ) : (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* pb-[env(safe-area-inset-bottom)] keeps the CTA clear of the home
          indicator / gesture bar on iOS rather than sitting under it. */}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[90vh] gap-0 overflow-y-auto rounded-t-[16px] p-0 pb-[env(safe-area-inset-bottom)]"
      >
        {content}
      </SheetContent>
    </Sheet>
  );
}
