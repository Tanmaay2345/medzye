"use client";

import { useState } from "react";
import { BookingFlowOverlay } from "@/components/common/booking-flow-overlay";
import { useBookingFlow } from "@/hooks/use-booking-flow";
import { QuantityStepper } from "./quantity-stepper";

export function PurchasePanel({ disabled }: { disabled: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const { state, start, reset } = useBookingFlow();

  return (
    <>
      <div className="flex w-full items-center gap-3 border-t border-brand-gray-100 pt-6">
        <QuantityStepper quantity={quantity} onChange={setQuantity} />
        <button
          type="button"
          disabled={disabled}
          onClick={start}
          className="flex-1 rounded-xl bg-brand-primary py-3.5 text-center font-bold text-white transition-colors hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          Proceed
        </button>
      </div>
      <BookingFlowOverlay state={state} onDone={reset} />
    </>
  );
}
