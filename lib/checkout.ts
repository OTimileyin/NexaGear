import type { CartItem } from "@/lib/types";

export interface CheckoutFields {
  customerName: string;
  phone: string;
  shippingAddress: string;
}

export type CheckoutFieldErrors = Partial<
  Record<keyof CheckoutFields | "form", string>
>;

export const MAX_ORDER_ITEMS = 50;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Checkout form validation — mirrors the SQL checks so users get inline errors. */
export function validateCheckoutFields(fields: CheckoutFields): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};

  const name = fields.customerName.trim();
  if (!name) errors.customerName = "Enter the name for this order.";
  else if (name.length > 120)
    errors.customerName = "Keep the name under 120 characters.";

  const phone = fields.phone.trim();
  if (!phone) errors.phone = "Enter a phone number for delivery contact.";
  else if (phone.length > 32)
    errors.phone = "Keep the phone number under 32 characters.";

  const address = fields.shippingAddress.trim();
  if (!address) errors.shippingAddress = "Enter a delivery address.";
  else if (address.length > 400)
    errors.shippingAddress = "Keep the address under 400 characters.";

  return errors;
}

export function hasFieldErrors(errors: CheckoutFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export interface OrderItemPayload {
  product_id: string;
  quantity: number;
}

/**
 * The ONLY item data the client may send: product IDs + quantities.
 * Prices and totals never leave the browser payload (PRD §13).
 */
export function buildOrderItemsPayload(
  items: Array<Pick<CartItem, "productId" | "quantity">>,
): OrderItemPayload[] {
  return items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));
}

/** Structural validation of the payload before it hits the RPC. */
export function isSendablePayload(
  payload: OrderItemPayload[],
  clientRef: string,
): boolean {
  if (!isUuid(clientRef)) return false;
  if (payload.length < 1 || payload.length > MAX_ORDER_ITEMS) return false;
  return payload.every(
    (item) =>
      isUuid(item.product_id) &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 99,
  );
}
