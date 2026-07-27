import { cn } from "@/lib/utils";

export function DiscountBadge({
  percentOff,
  className,
}: {
  percentOff: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded bg-brand-discount-bg px-1.5 py-0.5 text-xs font-medium text-brand-gray-900",
        className
      )}
    >
      {percentOff}% off
    </span>
  );
}
