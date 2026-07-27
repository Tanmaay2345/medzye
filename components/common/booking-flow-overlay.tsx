"use client";

import type { BookingFlowState } from "@/hooks/use-booking-flow";
import { BookingStatus } from "./booking-status";

export function BookingFlowOverlay({
  state,
  onDone,
}: {
  state: BookingFlowState;
  onDone: () => void;
}) {
  if (state === "idle") return null;

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-8 bg-white">
      <BookingStatus state={state} />
      {state === "confirmed" && (
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg bg-brand-primary px-6 py-3 font-medium text-white transition-colors hover:bg-brand-primary/90"
        >
          Done
        </button>
      )}
    </div>
  );
}
