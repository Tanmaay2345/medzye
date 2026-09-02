"use client";

import type { BookingFlowState } from "@/hooks/use-booking-flow";
import { BookingStatus } from "./booking-status";

/**
 * Full-screen cover for the booking flow. There is no dismiss control by
 * design — the flow completes on its own and useBookingFlow navigates Home,
 * so an extra confirmation click would only stand between the user and a
 * finished purchase.
 */
export function BookingFlowOverlay({
  state,
  label,
}: {
  state: BookingFlowState;
  /** Passed straight through to BookingStatus; see there for why. */
  label?: string;
}) {
  if (state === "idle") return null;

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-8 bg-white">
      <BookingStatus state={state} label={label} />
    </div>
  );
}
