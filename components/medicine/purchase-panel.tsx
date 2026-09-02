"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { BookingFlowOverlay } from "@/components/common/booking-flow-overlay";
import { useBookingFlow } from "@/hooks/use-booking-flow";
import { QuantityStepper } from "./quantity-stepper";

/** Shown while the browser hands off to the pharmacy's own site. */
const REDIRECT_LABEL = "Redirecting to the brand website";

/**
 * How long the redirect state waits before clearing itself if nothing else
 * clears it first.
 *
 * Normally the tab going hidden (the new tab taking focus) or pagehide ends
 * this. Neither fires if the popup was blocked or the navigation never
 * started, and an overlay with no dismiss control that outlives its reason is
 * worse than no overlay at all — so this is the floor, not the mechanism.
 */
const REDIRECT_SAFETY_MS = 4000;

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
  const [isRedirecting, setIsRedirecting] = useState(false);

  // The Buy link opens in a new tab, so this document is never torn down and
  // nothing would take the overlay away on its own. Clearing it when the tab
  // goes hidden means the handoff has happened and the user is looking at the
  // pharmacy; they come back to a clean page rather than a frozen one.
  useEffect(() => {
    if (!isRedirecting) return;

    const clear = () => setIsRedirecting(false);
    const onVisibilityChange = () => {
      if (document.hidden) clear();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", clear);
    const safety = setTimeout(clear, REDIRECT_SAFETY_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", clear);
      clearTimeout(safety);
    };
  }, [isRedirecting]);

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
            // Deliberately no preventDefault: the browser performs the exact
            // same navigation it always did, to the same database-resolved
            // URL. This only turns the overlay on alongside it.
            //
            // A modified or non-primary click opens a background tab and
            // leaves the user sitting right here, so covering their screen
            // would be noise — those are left alone.
            onClick={(event) => {
              if (event.defaultPrevented || event.button !== 0) return;
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              setIsRedirecting(true);
            }}
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
      {/* One overlay, two callers. The Buy link and the Proceed button are
          mutually exclusive branches above, so these states can never both be
          live — and the redirect reuses the booking visual rather than
          introducing a second processing screen. */}
      <BookingFlowOverlay
        state={isRedirecting ? "processing" : state}
        label={isRedirecting ? REDIRECT_LABEL : undefined}
      />
    </>
  );
}
