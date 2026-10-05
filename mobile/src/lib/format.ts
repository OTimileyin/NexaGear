/**
 * Two functions copied from the web's `lib/format.ts` on purpose.
 *
 * The phone and the browser have to print the same price for the same row, and
 * the video shows both at once — so a phone that formatted `$89` where the web
 * said `$89.00` would look like the two carts disagree. Kept deliberately tiny
 * and identical; if the web's format ever changes, this must change with it.
 */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
}

/** Status label always pairs text with colour (never colour alone, WCAG AA). */
export function inventoryLabel(status: string): {
  text: string;
  token: "stock" | "signal" | "steel";
} {
  switch (status) {
    case "in_stock":
      return { text: "In stock", token: "stock" };
    case "low_stock":
      return { text: "Low stock", token: "signal" };
    default:
      return { text: "Out of stock", token: "steel" };
  }
}
