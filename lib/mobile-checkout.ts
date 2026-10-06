import { MAX_ORDER_ITEMS, isUuid, isSendablePayload, buildOrderItemsPayload, hasFieldErrors, validateCheckoutFields, type CheckoutFields } from "@/lib/checkout";

export function parseMobileOrder(value: unknown): { clientRef: string; fields: CheckoutFields; items: { productId: string; quantity: number }[] } | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.clientRef !== "string" || !isUuid(input.clientRef) || !input.fields || typeof input.fields !== "object" || !Array.isArray(input.items)) return null;
  if (input.items.length > MAX_ORDER_ITEMS) return null;
  const fields = input.fields as Record<string, unknown>;
  if (typeof fields.customerName !== "string" || typeof fields.phone !== "string" || typeof fields.shippingAddress !== "string") return null;
  const shipping = { customerName: fields.customerName, phone: fields.phone, shippingAddress: fields.shippingAddress };
  if (hasFieldErrors(validateCheckoutFields(shipping))) return null;
  const items: { productId: string; quantity: number }[] = [];
  for (const value of input.items) {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    if (typeof item.productId !== "string" || typeof item.quantity !== "number") return null;
    items.push({ productId: item.productId, quantity: item.quantity });
  }
  return isSendablePayload(buildOrderItemsPayload(items), input.clientRef) ? { clientRef: input.clientRef, fields: shipping, items } : null;
}

/** Payment callbacks carry an order reference, never a session or payment secret. */
export function isMobileReturnUrl(value: unknown, development = process.env.NODE_ENV !== "production"): value is string {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return false;
    if (url.protocol === "nexagear:") return url.hostname === "checkout" && (url.pathname === "" || url.pathname === "/");
    if (!development) return false;
    if (url.protocol === "exp:" || url.protocol === "exps:") return !!url.hostname && url.pathname === "/--/checkout";
    return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "8081" && url.pathname === "/checkout";
  } catch { return false; }
}
