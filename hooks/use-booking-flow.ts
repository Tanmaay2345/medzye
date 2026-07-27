"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type BookingFlowState = "idle" | "processing" | "confirmed";

/**
 * Drives the Processing -> Booking Confirmed transition shown after "ADD" +
 * "Continued" (comparison modal) or "Proceed" (detail page). There is no
 * orders/bookings table in the schema, so this is a client-side-only
 * simulated transition — nothing is persisted.
 */
export function useBookingFlow() {
  const [state, setState] = useState<BookingFlowState>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const start = useCallback(() => {
    setState("processing");
    timeoutRef.current = setTimeout(() => setState("confirmed"), 1500);
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState("idle");
  }, []);

  return { state, start, reset };
}
