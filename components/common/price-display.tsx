import { cn } from "@/lib/utils";
import { computeDiscount } from "@/utils/compute-discount";
import { formatCurrency } from "@/utils/format-currency";
import { DiscountBadge } from "./discount-badge";

export function PriceDisplay({
  price,
  mrp,
  size = "md",
  className,
}: {
  price: number | null;
  mrp?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (price == null) {
    return <span className="text-sm text-brand-gray-500">Price unavailable</span>;
  }

  const discount = computeDiscount(price, mrp);
  // `sm` is the medicine-card variant and matches Figma node 2923:6265
  // exactly: Albert Sans Medium 16.38px / -0.3276px / #0b254e. The other
  // sizes are untouched (detail page uses `lg`, pharmacy rows use `md`).
  const priceTextClass =
    size === "lg"
      ? "text-xl font-semibold text-brand-gray-900"
      : size === "sm"
        ? "text-[16.38px] font-medium leading-normal tracking-[-0.3276px] text-brand-navy"
        : "text-base font-semibold text-brand-gray-900";

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className={priceTextClass}>
        {formatCurrency(price)}
      </span>
      {discount && (
        <>
          <span className="text-sm text-brand-gray-400 line-through">
            {formatCurrency(discount.mrp)}
          </span>
          <DiscountBadge percentOff={discount.percentOff} />
        </>
      )}
    </span>
  );
}
