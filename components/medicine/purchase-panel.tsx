"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { BookingFlowOverlay } from "@/components/common/booking-flow-overlay";
import { useBookingFlow } from "@/hooks/use-booking-flow";
import { QuantityStepper } from "./quantity-stepper";

/**
 * `purchase` is the managed URL resolved for the pharmacy the user selected in
 * the comparison modal, or null when there isn't one.
 *
 * The panel deliberately knows nothing about how the URL was found or verified
 * — no skill names, no confidence, no statuses. Everything unverified has
 * already been filtered out upstream (by RLS, then by the query), so a URL
 * arriving here is by construction safe to send a user to.
 */
export function PurchasePanel({
  disabled,
  purchase = null,
}: {
  disabled: boolean;
  purchase?: { url: string; pharmacyName: string | null } | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const { state, start } = useBookingFlow();

  return (
    <>
      <div className="flex w-full items-center gap-3 border-t border-brand-gray-100 pt-6">
        <QuantityStepper quantity={quantity} onChange={setQuantity} />

        {purchase && !disabled ? (
          // An outbound link, not a button: middle-click, cmd-click and "copy
          // link" all work, and the destination is visible on hover. rel
          // noopener/noreferrer so the pharmacy tab gets no handle on this one.
          <a
            href={purchase.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-primary py-3.5 text-center font-bold text-white transition-colors hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            {purchase.pharmacyName ? `Buy at ${purchase.pharmacyName}` : "Buy now"}
            <ArrowUpRight className="size-5 shrink-0" aria-hidden />
          </a>
        ) : (
          // No managed URL for this pharmacy yet — keep the existing simulated
          // booking flow rather than showing a dead control. Only 4 of the 9
          // pharmacies have a URL finder, and two of them are fictional seed
          // rows with no website at all, so this branch stays reachable.
          <button
            type="button"
            disabled={disabled}
            onClick={start}
            className="flex-1 rounded-xl bg-brand-primary py-3.5 text-center font-bold text-white transition-colors hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            Proceed
          </button>
        )}
      </div>
      <BookingFlowOverlay state={state} />
    </>
  );
}
