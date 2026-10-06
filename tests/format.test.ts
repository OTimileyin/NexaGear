import { describe, expect, it } from "vitest";

import { formatMoney, inventoryLabel } from "@/lib/format";

describe("formatMoney", () => {
  it("renders two decimals in Nigerian naira", () => {
    expect(formatMoney(89)).toBe("\u20a689.00");
    expect(formatMoney(45.5)).toBe("\u20a645.50");
    expect(formatMoney(0)).toBe("\u20a60.00");
    expect(formatMoney(1234.567)).toBe("\u20a61,234.57");
  });

  it("never renders NaN/Infinity into the UI", () => {
    expect(formatMoney(Number.NaN)).toBe("\u20a60.00");
    expect(formatMoney(Infinity)).toBe("\u20a60.00");
  });
});

describe("inventoryLabel", () => {
  it("always pairs text with a color class (never color alone)", () => {
    for (const status of ["in_stock", "low_stock", "out_of_stock"] as const) {
      const label = inventoryLabel(status);
      expect(label.text.length).toBeGreaterThan(0);
      expect(label.dotClass.startsWith("bg-")).toBe(true);
    }
  });

  it("maps statuses to the palette", () => {
    expect(inventoryLabel("in_stock").text).toBe("In stock");
    expect(inventoryLabel("out_of_stock").text).toBe("Out of stock");
  });
});
