export type Discount = {
  mrp: number;
  price: number;
  percentOff: number;
};

/**
 * Returns null when there's nothing to show — either mrp is absent
 * (medicine_prices.mrp doesn't exist in the DB yet) or it isn't actually
 * a discount. Callers should render no strikethrough/badge in that case
 * rather than fabricate a discount.
 */
export function computeDiscount(
  price: number | null | undefined,
  mrp: number | null | undefined
): Discount | null {
  if (price == null || mrp == null || mrp <= price) return null;
  const percentOff = Math.round(((mrp - price) / mrp) * 100);
  if (percentOff <= 0) return null;
  return { mrp, price, percentOff };
}
