import Image from "next/image";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriceDisplay } from "@/components/common/price-display";
import type { PharmacyOffer } from "@/types/database";

export function PharmacyPriceRow({
  offer,
  selected,
  onSelect,
}: {
  offer: PharmacyOffer;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 rounded-lg border px-6 py-4 transition-colors",
        selected ? "border-brand-primary bg-brand-tint-icon" : "border-brand-border-card bg-white"
      )}
    >
      <div className="flex items-center gap-4">
        <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-border-card bg-white">
          {offer.pharmacy.logo ? (
            <Image
              src={offer.pharmacy.logo}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <Store className="size-6 text-brand-gray-400" aria-hidden />
          )}
        </span>
        <span className="text-base font-bold text-brand-gray-900">
          {offer.pharmacy.name ?? "Pharmacy"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <PriceDisplay price={offer.price} mrp={offer.mrp} />
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={cn(
            "w-[125px] rounded-lg px-4 py-2.5 text-center font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy",
            selected
              ? "bg-brand-navy text-white"
              : "bg-brand-primary text-white hover:bg-brand-primary/90"
          )}
        >
          {selected ? "Added" : "ADD"}
        </button>
      </div>
    </div>
  );
}
