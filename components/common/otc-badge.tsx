import { cn } from "@/lib/utils";

export function OtcBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-tl-xl rounded-br-md bg-brand-success-bg px-2.5 py-1 text-xs font-semibold text-brand-success-fg",
        className
      )}
    >
      OTC Verified
    </span>
  );
}
