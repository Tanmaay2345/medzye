"use client";

import Image from "next/image";
import { useState } from "react";
import { Pill } from "lucide-react";
import { OtcBadge } from "@/components/common/otc-badge";
import { PriceDisplay } from "@/components/common/price-display";
import { PriceComparisonModal } from "@/components/medicine/price-comparison-modal";
import { IMAGE_BLUR_DATA_URL } from "@/utils/image-placeholder";
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
  const hasOffers = medicine.lowest_price != null;

  return (
    // The modal is a SIBLING of the card, not a child. Base UI portals the
    // sheet to document.body, but React synthetic events propagate along the
    // React tree rather than the DOM tree — so while the modal lived inside
    // this div, every click inside it (including the close arrow) bubbled into
    // the card's onClick and re-opened the sheet in the same batch. The close
    // button looked dead because it closed and reopened instantly.
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsComparing(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsComparing(true);
          }
        }}
        className="group relative flex w-full cursor-pointer flex-col rounded-[12.493px] border border-brand-border-card bg-white p-[8.19px] shadow-[0_1.638px_4.095px_rgba(0,0,0,0.08)] transition-shadow duration-200 ease-out hover:shadow-md hover:outline hover:outline-[3px] hover:outline-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
      >
        {/* "Available in different prices" hover ribbon — matches the Figma
            hover variant (node 2923:6031): 48px tall, pulled 4px/3px outside
            the card, rounded only on top. */}
        {hasOffers && (
          <span className="pointer-events-none absolute -left-1 -top-[3px] z-20 flex h-12 w-[calc(100%+8px)] origin-top scale-y-0 items-center justify-center rounded-t-2xl bg-brand-primary text-sm font-bold tracking-[-0.32px] text-white opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:scale-y-100 group-hover:opacity-100">
            Available in different prices
            {/* Perforated edge. In Figma each strip is absolutely positioned
                against the ribbon at top:46px of its 48px height, so the dots
                straddle the ribbon's lower edge. The ribbon is this span, and
                it is the positioning context — so the strips travel with the
                card and can never drift to the page or a sibling.
                Figma's x anchors are left:6px and left:160px (right edge
                215.47 of a 223px ribbon = 7.53px inset). Anchoring the second
                strip to `right` instead of a fixed x keeps both pinned to the
                ribbon's own edges at any card width. */}
            <span
              aria-hidden
              className="absolute left-[6px] top-[46px] h-[6.4px] w-[55.47px] bg-contain bg-no-repeat"
              style={{ backgroundImage: "url('/images/hover-ribbon-dots.svg')" }}
            />
            <span
              aria-hidden
              className="absolute right-[7.53px] top-[46px] h-[6.4px] w-[55.47px] bg-contain bg-no-repeat"
              style={{ backgroundImage: "url('/images/hover-ribbon-dots.svg')" }}
            />
          </span>
        )}

        {/* No border/background: the Figma card (node 2923:6265) renders the
            product image bare on the card surface. Figma sizes it 164px in a
            221.47px card = 74.05% of the OUTER width; 80.6% here because the
            percentage resolves against the content box, which the 8.19px
            padding and 1px card border shrink. */}
        <span className="relative mx-auto aspect-square w-[80.6%] overflow-hidden">
          {medicine.is_otc && (
            <OtcBadge className="absolute left-2 top-2 z-10 transition-[top,bottom] duration-200 ease-out group-hover:top-auto group-hover:bottom-2" />
          )}
          {medicine.image ? (
            <Image
              src={medicine.image}
              alt={medicine.name ?? ""}
              fill
              sizes="(min-width: 1024px) 17vw, 38vw"
              className="object-contain"
              priority={priority}
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
            />
          ) : (
            <span className="flex size-full items-center justify-center">
              <Pill className="size-10 text-brand-gray-300" aria-hidden />
            </span>
          )}
        </span>
        {/* Figma: image -> name 18.305px, name -> price 4.914px, then the
            price block carries 6.273px of its own bottom padding before the
            4.914px gap to the button (11.19px total). */}
        <span className="mt-[18.305px] line-clamp-2 text-[18px] font-semibold leading-normal tracking-[-0.36px] text-brand-navy">
          {medicine.name}
        </span>

        <div className="mt-[4.914px]">
          <PriceDisplay price={medicine.lowest_price} mrp={medicine.lowest_price_mrp} size="sm" />
        </div>

        <span className="mt-[11.19px] flex h-[48.32px] w-full items-center justify-center rounded-[9.828px] bg-brand-primary text-center text-[19.655px] font-medium leading-normal text-white transition-colors group-hover:bg-brand-primary/90">
          ADD
        </span>
      </div>

      {isComparing && (
        <PriceComparisonModal
          medicine={medicine}
          open={isComparing}
          onOpenChange={setIsComparing}
        />
      )}
    </>
  );
}
