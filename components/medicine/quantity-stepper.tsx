"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  quantity,
  onChange,
  min = 1,
  max = 20,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-brand-gray-100 bg-white p-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
        className="flex size-7 items-center justify-center rounded-full bg-brand-gray-50 text-brand-gray-900 transition-colors hover:bg-brand-gray-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <Minus className="size-3" aria-hidden />
      </button>
      <span
        className="w-9 text-center text-base text-brand-gray-900"
        aria-live="polite"
        aria-atomic="true"
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        aria-label="Increase quantity"
        className="flex size-7 items-center justify-center rounded-full bg-brand-gray-50 text-brand-gray-900 transition-colors hover:bg-brand-gray-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <Plus className="size-3" aria-hidden />
      </button>
    </div>
  );
}
