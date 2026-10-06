/** Both clients display catalogue and checkout amounts in NGN. */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "\u20a60.00";
  return `\u20a6${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
