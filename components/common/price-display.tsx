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
  const priceTextClass =
    size === "lg" ? "text-xl font-semibold" : size === "sm" ? "text-sm font-semibold" : "text-base font-semibold";

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className={cn(priceTextClass, "text-brand-gray-900")}>
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
