"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Pill } from "lucide-react";
import { OtcBadge } from "@/components/common/otc-badge";
import { PriceDisplay } from "@/components/common/price-display";
import { PriceComparisonModal } from "@/components/medicine/price-comparison-modal";
import type { MedicineWithPrice } from "@/types/database";

export function MedicineCard({
  medicine,
  priority = false,
}: {
  medicine: MedicineWithPrice;
  /** Set for above-the-fold cards (e.g. the first grid row) to skip lazy-loading and improve LCP. */
  priority?: boolean;
}) {
  const [isComparing, setIsComparing] = useState(false);

  return (
    <div className="relative flex w-full flex-col rounded-[12px] border border-brand-border-card bg-white p-3 shadow-[0_1.6px_4.1px_rgba(0,0,0,0.08)]">
      {medicine.is_otc && (
        <OtcBadge className="absolute left-[21px] top-[3px] z-10" />
      )}

      <Link href={`/medicine/${medicine.id}`} className="flex flex-col">
        <span className="relative mx-auto aspect-square w-[84%] overflow-hidden rounded-lg border border-brand-border-image bg-white">
          {medicine.image ? (
            <Image
              src={medicine.image}
              alt={medicine.name ?? ""}
              fill
              sizes="(min-width: 1024px) 17vw, 38vw"
              className="object-contain"
              priority={priority}
              loading={priority ? undefined : "lazy"}
            />
          ) : (
            <span className="flex size-full items-center justify-center">
              <Pill className="size-10 text-brand-gray-300" aria-hidden />
            </span>
          )}
        </span>
        <span className="mt-[18px] line-clamp-2 text-base font-semibold text-brand-navy">
          {medicine.name}
        </span>
      </Link>

      <div className="mt-[5px]">
        <PriceDisplay price={medicine.lowest_price} mrp={medicine.lowest_price_mrp} size="sm" />
      </div>

      <button
        type="button"
        onClick={() => setIsComparing(true)}
        className="mt-[5px] h-12 w-full rounded-lg bg-brand-primary text-center font-medium text-white transition-colors hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
      >
        ADD
      </button>

      {isComparing && (
        <PriceComparisonModal
          medicine={medicine}
          open={isComparing}
          onOpenChange={setIsComparing}
        />
      )}
    </div>
  );
}
