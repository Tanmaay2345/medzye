import { Check } from "lucide-react";

/**
 * Screen 5, Component 11 (Figma node 2886:3746 / 3005:5356).
 *
 * Five bars, each 75px tall, laid out in a flex row with an 8px gap inside
 * 17px/19px padding. Widths and alpha are per-bar and come straight from the
 * design; together they add up to the 241x113 box Figma gives the component
 * (175px of bars + 4x8px gaps + 2x17px padding = 241).
 *
 * Note the bars are #00c037 while the "Processing" label below is #009029 —
 * Screen 5 genuinely uses two different greens.
 */
const BARS = [
  { width: 26, opacity: 0.9 },
  { width: 17, opacity: 0.8 },
  { width: 31, opacity: 0.6 },
  { width: 65, opacity: 0.8 },
  { width: 36, opacity: 0.6 },
];

/** One full cycle of the width sequence; see globals.css for the keyframes. */
const CYCLE_MS = 1500;

// Component 11's own 17px/19px padding is deliberately not reproduced. Adding
// it would push the gap between the bars and the "Processing" label to 35px;
// Figma's is 19px and this screen's existing layout gives 16px, so leaving the
// surrounding spacing alone lands closer to the design than copying it would.
function ScanBars() {
  return (
    <div className="flex h-[75px] items-center gap-[8px]" aria-hidden>
      {BARS.map((bar, index) => (
        <span
          key={index}
          className="medyze-processing-bar h-[75px] shrink-0 bg-brand-processing-bar"
          style={{
            width: bar.width,
            opacity: bar.opacity,
            // Negative delay offsets each bar one step into the shared
            // sequence, so frame 0 shows 26/17/31/65/36 — the exact Figma
            // composition — and the pattern then travels along the row.
            animationDelay: `-${(index * CYCLE_MS) / BARS.length}ms`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * `label` overrides the text under the bars without touching the visual. It
 * exists so another flow can reuse this exact treatment — same bars, same
 * greens, same type — rather than growing a second processing screen. When it
 * is omitted the booking wording is unchanged.
 */
export function BookingStatus({
  state,
  label,
}: {
  state: "processing" | "confirmed";
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <ScanBars />
      <p
        role="status"
        aria-live="polite"
        // max-w/text-center matter only for a longer caller-supplied label:
        // the booking strings are short and already centred by the flex
        // parent, so this changes nothing for them, but it stops a longer one
        // running off the edge on a narrow phone.
        className="max-w-[min(90vw,32rem)] text-center text-[32px] font-bold text-brand-processing"
        style={{ fontFamily: "var(--font-lexend-deca)" }}
      >
        {label ?? (state === "processing" ? "Processing" : "Booking Confirmed")}
      </p>
      {state === "confirmed" && (
        <span className="flex size-[54px] items-center justify-center rounded-full bg-brand-success-solid">
          <Check className="size-6 text-white" strokeWidth={3} aria-hidden />
        </span>
      )}
    </div>
  );
}
