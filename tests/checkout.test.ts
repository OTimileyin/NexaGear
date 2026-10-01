import { describe, expect, it } from "vitest";

import {
  buildOrderItemsPayload,
  hasFieldErrors,
  isSendablePayload,
  isUuid,
  validateCheckoutFields,
} from "@/lib/checkout";

const valid = {
  customerName: "Ada Lovelace",
  phone: "+234 801 234 5678",
  shippingAddress: "12 Analytical Lane, Yaba, Lagos",
};

describe("validateCheckoutFields", () => {
  it("passes a complete form", () => {
    expect(hasFieldErrors(validateCheckoutFields(valid))).toBe(false);
  });

  it("requires every field", () => {
    const errors = validateCheckoutFields({
      customerName: "  ",
      phone: "",
      shippingAddress: "",
    });
    expect(errors.customerName).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(errors.shippingAddress).toBeTruthy();
  });

  it("enforces the same length caps as the database", () => {
    const errors = validateCheckoutFields({
      customerName: "n".repeat(121),
      phone: "1".repeat(33),
      shippingAddress: "a".repeat(401),
    });
    expect(errors.customerName).toContain("120");
    expect(errors.phone).toContain("32");
    expect(errors.shippingAddress).toContain("400");
  });
});

describe("buildOrderItemsPayload", () => {
  it("sends ONLY product ids and quantities — never prices or totals (PRD §13)", () => {
    const payload = buildOrderItemsPayload([
      { productId: "11111111-1111-4111-8111-111111111111", quantity: 2 },
      { productId: "22222222-2222-4222-8222-222222222222", quantity: 1 },
    ]);

    expect(payload).toEqual([
      { product_id: "11111111-1111-4111-8111-111111111111", quantity: 2 },
      { product_id: "22222222-2222-4222-8222-222222222222", quantity: 1 },
    ]);

    for (const item of payload) {
      expect(Object.keys(item).sort()).toEqual(["product_id", "quantity"]);
      expect(JSON.stringify(item)).not.toMatch(/price|total|subtotal/i);
    }
  });
});

describe("isSendablePayload / isUuid", () => {
  const goodRef = "33333333-3333-4333-8333-333333333333";

  it("accepts valid uuids and bounded integer quantities", () => {
    expect(isUuid(goodRef)).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(
      isSendablePayload(
        [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 99 }],
        goodRef,
      ),
    ).toBe(true);
  });

  it("rejects bad refs, bad uuids, and out-of-range quantities", () => {
    expect(isSendablePayload([], goodRef)).toBe(false);
    expect(
      isSendablePayload(
        [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
        "bad-ref",
      ),
    ).toBe(false);
    expect(
      isSendablePayload([{ product_id: "nope", quantity: 1 }], goodRef),
    ).toBe(false);
    expect(
      isSendablePayload(
        [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 0 }],
        goodRef,
      ),
    ).toBe(false);
    expect(
      isSendablePayload(
        [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 1.5 }],
        goodRef,
      ),
    ).toBe(false);
    expect(
      isSendablePayload(
        [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 100 }],
        goodRef,
      ),
    ).toBe(false);
  });
});
