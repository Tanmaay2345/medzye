import { Check } from "lucide-react";

const BAR_HEIGHTS = ["80%", "60%", "100%", "60%", "80%"];
const BAR_OPACITIES = [0.9, 0.8, 0.6, 0.8, 0.6];

function ScanBars() {
  return (
    <div className="flex h-[75px] items-end gap-1.5" aria-hidden>
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={index}
          className="w-3 rounded-sm bg-brand-processing"
          style={{ opacity: BAR_OPACITIES[index], height }}
        />
      ))}
    </div>
  );
}

export function BookingStatus({ state }: { state: "processing" | "confirmed" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <ScanBars />
      <p
        role="status"
        aria-live="polite"
        className="text-[32px] font-bold text-brand-processing"
        style={{ fontFamily: "var(--font-lexend-deca)" }}
      >
        {state === "processing" ? "Processing" : "Booking Confirmed"}
      </p>
      {state === "confirmed" && (
        <span className="flex size-[54px] items-center justify-center rounded-full bg-brand-success-solid">
          <Check className="size-6 text-white" strokeWidth={3} aria-hidden />
        </span>
      )}
    </div>
  );
}
