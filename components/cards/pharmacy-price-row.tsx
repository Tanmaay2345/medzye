"use client";

import Image from "next/image";
import { useState } from "react";
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
  // The generic icon is a genuine last resort: it shows only when the row has
  // no logo URL at all, or when the URL is present but the asset fails to
  // load (404 / network / Storage outage). A logo that loads always wins.
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = offer.pharmacy.logo;
  const showLogo = Boolean(logoUrl) && !logoFailed;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 rounded-lg border px-6 py-4 transition-colors",
        selected ? "border-brand-primary bg-brand-tint-icon" : "border-[#e2e2e2] bg-white"
      )}
    >
      <div className="flex items-center gap-4">
        <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-border-card bg-white">
          {showLogo ? (
            <Image
              src={logoUrl!}
              alt=""
              fill
              sizes="56px"
              className="object-contain p-1"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <Store className="size-6 text-brand-gray-400" aria-hidden />
          )}
        </span>
        <span className="text-base font-bold text-black">
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
