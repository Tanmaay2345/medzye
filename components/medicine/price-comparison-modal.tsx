"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, FlaskConical, MapPin, Truck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OtcBadge } from "@/components/common/otc-badge";
import { EmptyState } from "@/components/common/empty-state";
import { BookingFlowOverlay } from "@/components/common/booking-flow-overlay";
import { PharmacyPriceRow } from "@/components/cards/pharmacy-price-row";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useBookingFlow } from "@/hooks/use-booking-flow";
import { getOffersForMedicine } from "@/lib/queries/pharmacies";
import type { MedicineWithPrice, PharmacyOffer } from "@/types/database";

const TRUST_BADGES = [
  { label: "Same composition", icon: FlaskConical },
  { label: "Fast Delivery", icon: Truck },
  { label: "Nearby store", icon: MapPin },
];

export function PriceComparisonModal({
  medicine,
  open,
  onOpenChange,
}: {
  medicine: MedicineWithPrice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [offers, setOffers] = useState<PharmacyOffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const { state: bookingState, start: startBooking, reset: resetBooking } = useBookingFlow();

  useEffect(() => {
    if (!open) return;
    setSelectedOfferId(null);
    setIsLoading(true);
    getOffersForMedicine(medicine.id)
      .then(setOffers)
      .finally(() => setIsLoading(false));
  }, [open, medicine.id]);

  const handleContinue = () => {
    onOpenChange(false);
    startBooking();
  };

  const body = (
    <>
      <div className="flex items-start gap-4">
        <span className="relative size-[104px] shrink-0 overflow-hidden rounded-lg border border-brand-border-image bg-white sm:size-[167px]">
          {medicine.is_otc && <OtcBadge className="absolute left-0 top-0 z-10" />}
          {medicine.image && (
            <Image src={medicine.image} alt={medicine.name ?? ""} fill sizes="167px" className="object-contain" />
          )}
        </span>
        <div className="flex flex-1 flex-col gap-2">
          <h3 className="text-xl font-bold text-brand-navy">{medicine.name}</h3>
          {medicine.description && (
            <div>
              <p className="text-sm font-medium text-brand-gray-900">Salt Composition</p>
              <p className="line-clamp-2 text-[13px] text-brand-gray-500">
                {medicine.description}
              </p>
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-4">
            {TRUST_BADGES.map(({ label, icon: Icon }) => (
              <div key={label} className="flex w-28 flex-col items-center gap-1.5 text-center">
                <Icon className="size-10 text-brand-primary" aria-hidden />
                <span className="text-xs text-brand-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 py-2">
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
          offers.map((offer) => (
            <PharmacyPriceRow
              key={offer.id}
              offer={offer}
              selected={selectedOfferId === offer.id}
              onSelect={() => setSelectedOfferId(offer.id)}
            />
          ))}
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          disabled={selectedOfferId == null}
          onClick={handleContinue}
          className="flex w-full max-w-[171px] items-center justify-center gap-2 rounded-lg border-l-4 border-t-4 border-b border-brand-gray-100 bg-brand-success-solid py-3 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          Continued
          <ArrowRight className="size-5" aria-hidden />
        </button>
      </div>
    </>
  );

  return (
    <>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-[764px] gap-6 rounded-[24px] p-8">
            <DialogHeader className="border-b border-dashed border-brand-gray-100 pb-6">
              <DialogTitle className="text-2xl font-semibold text-brand-gray-600">
                Choose Your Medicine From Different Brands
              </DialogTitle>
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-[24px] p-6">
            <SheetHeader className="border-b border-dashed border-brand-gray-100 p-0 pb-6">
              <SheetTitle className="text-xl font-semibold text-brand-gray-600">
                Choose Your Medicine From Different Brands
              </SheetTitle>
            </SheetHeader>
            {body}
          </SheetContent>
        </Sheet>
      )}
      <BookingFlowOverlay state={bookingState} onDone={resetBooking} />
    </>
  );
}
