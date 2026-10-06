import { describe, expect, it } from "vitest";
import { isMobileReturnUrl, parseMobileOrder } from "@/lib/mobile-checkout";
const id = "11111111-1111-4111-8111-111111111111";
const order = { clientRef: id, fields: { customerName: "Ada", phone: "08012345678", shippingAddress: "12 Test Street" }, items: [{ productId: id, quantity: 2 }] };
describe("native checkout boundary", () => {
  it("accepts delivery details and strips untrusted identity and price fields", () => {
    expect(parseMobileOrder({ ...order, userId: "other-user", amount: 1, items: [{ ...order.items[0], price: 0 }] })).toEqual(order);
  });
  it.each([null, {}, { ...order, fields: {} }, { ...order, fields: { ...order.fields, phone: 123 } }, { ...order, items: [{ productId: id, quantity: 100 }] }, { ...order, items: [] }, { ...order, clientRef: "invalid" }, { ...order, items: [{ productId: "invalid", quantity: 1 }] }])("rejects malformed payload %j", value => {
    expect(parseMobileOrder(value)).toBeNull();
  });
  it("permits the built app callback", () => expect(isMobileReturnUrl("nexagear://checkout", false)).toBe(true));
  it("permits Expo Go only in development", () => {
    expect(isMobileReturnUrl("exp://192.168.1.2:8081/--/checkout", true)).toBe(true);
    expect(isMobileReturnUrl("exp://192.168.1.2:8081/--/checkout", false)).toBe(false);
  });
  it.each(["https://attacker.example/checkout", "javascript:alert(1)", "nexagear://settings", "nexagear://checkout?token=secret", "nexagear://user:pass@checkout", "exp://host:8081/--/settings"]) ("rejects callbacks outside the checkout route: %s", value => expect(isMobileReturnUrl(value)).toBe(false));
});
