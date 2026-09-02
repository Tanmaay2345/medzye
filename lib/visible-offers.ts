import type { PharmacyOffer } from "@/types/database";

/**
 * The Figma comparison sheet shows exactly 4 pharmacy options.
 */
export const VISIBLE_OFFER_COUNT = 4;

/**
 * Which offers the comparison sheet renders: the cheapest
 * `VISIBLE_OFFER_COUNT`, plus any offer whose pharmacy has a verified product
 * URL for this medicine.
 *
 * The cap exists for the sheet's layout, but it was quietly deciding something
 * it was never meant to decide — whether a user can reach a pharmacy at all.
 * 51 of the 214 verified URLs sat on offers priced just outside the cheapest
 * four, so the sheet was hiding the very destinations it exists to compare.
 *
 * Verified offers are added to the set, never hoisted up it. The result is
 * returned in the order it arrived, so the cheapest option is still first and
 * a verified offer appears at its true price position. Being verified buys an
 * offer a place in the list, not a better one.
 *
 * `offers` must already be price-ordered — getOffersForMedicine orders by
 * price then id. This preserves that order rather than re-sorting, so the two
 * cannot drift apart.
 *
 * Lives here rather than inside the modal so the rule can be verified directly
 * against live data (scripts/urls/verify-offer-visibility.ts) instead of only
 * through the UI.
 */
export function visibleOffers(
  offers: PharmacyOffer[],
  verifiedPharmacyIds: Set<number>
): PharmacyOffer[] {
  const cheapest = new Set(offers.slice(0, VISIBLE_OFFER_COUNT).map((offer) => offer.id));

  return offers.filter(
    (offer) =>
      cheapest.has(offer.id) ||
      // pharmacy_id is nullable on medicine_prices. A row without one cannot be
      // matched to a verified URL, so it appears only if it earned a slot on
      // price — it is never promoted on a null lookup.
      (offer.pharmacy_id != null && verifiedPharmacyIds.has(offer.pharmacy_id))
  );
}
