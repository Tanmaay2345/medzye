"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type BookingFlowState = "idle" | "processing" | "confirmed";

/**
 * How long "Processing" shows before it flips to "Booking Confirmed".
 *
 * At 1.5s this read as a flicker — the screen was gone before the user had
 * registered that anything was being processed. 3s is long enough to land as
 * a deliberate step in the flow without feeling stalled.
 */
const PROCESSING_MS = 3000;

/**
 * How long "Booking Confirmed" stays on screen before the redirect. The user
 * has to actually see the confirmation, so the redirect waits rather than
 * firing the moment the state flips.
 */
const CONFIRMED_MS = 1500;

/**
 * Drives the Processing -> Booking Confirmed transition shown after "Proceed"
 * on the detail page. There is no orders/bookings table in the schema, so this
 * is a client-side-only simulated transition — nothing is persisted.
 *
 * The flow ends by navigating Home. It deliberately does not return to the
 * medicine page underneath: the purchase is finished, and dropping the user
 * back on the product they just bought reads as if it failed.
 */
export function useBookingFlow() {
  const router = useRouter();
  const [state, setState] = useState<BookingFlowState>("idle");
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Both steps are tracked so an unmount mid-flow (back button, navigation)
  // cannot leave a timer running that redirects out from under the user.
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const start = useCallback(() => {
    setState("processing");

    timeoutsRef.current.push(
      setTimeout(() => {
        setState("confirmed");
        timeoutsRef.current.push(setTimeout(() => router.push("/"), CONFIRMED_MS));
      }, PROCESSING_MS)
    );
  }, [router]);

  return { state, start };
}
