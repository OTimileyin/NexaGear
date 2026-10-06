import type { InventoryStatus } from "@/lib/types";

/** Money display — single source for how prices render (unit-tested). */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "\u20a60.00";
  return `\u20a6${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Status label always pairs text with color (never color alone). */
export function inventoryLabel(status: InventoryStatus): {
  text: string;
  dotClass: string;
} {
  switch (status) {
    case "in_stock":
      return { text: "In stock", dotClass: "bg-stock" };
    case "low_stock":
      return { text: "Low stock", dotClass: "bg-signal" };
    case "out_of_stock":
      return { text: "Out of stock", dotClass: "bg-steel" };
  }
}
