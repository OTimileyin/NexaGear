"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { placeOrder } from "@/app/checkout/actions";
import {
  hasFieldErrors,
  validateCheckoutFields,
  type CheckoutFieldErrors,
  type CheckoutFields,
} from "@/lib/checkout";
import { useCart } from "@/lib/cart/cart-context";
import { cartSubtotal } from "@/lib/cart/math";
import { formatMoney } from "@/lib/format";

export function CheckoutForm({
  user,
}: {
  user: { email: string; displayName: string | null };
}) {
  const { items, clearCart } = useCart();
  const router = useRouter();

  // One reference per checkout session: retries reuse it, so a duplicate
  // submit can never create a second order (server has a UNIQUE backstop).
  const clientRef = useRef<string | null>(null);

  const [fields, setFields] = useState<CheckoutFields>({
    customerName: user.displayName ?? "",
    phone: "",
    shippingAddress: "",
  });
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const subtotal = cartSubtotal(items);

  if (items.length === 0) {
    return (
      <div className="border-l-4 border-drafting bg-white px-6 py-8">
        <h2 className="font-medium">Nothing to check out</h2>
        <p className="mt-2 text-sm text-ink/75">
          Your cart is empty. Add gear first — this page will be ready when you
          are.
        </p>
        <Link
          href="/shop"
          className="mt-4 inline-block bg-signal px-5 py-3 text-sm font-semibold text-white hover:bg-signal/90"
        >
          Browse gear
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return; // in-flight guard (client half of dedup)

    const validation = validateCheckoutFields(fields);
    setErrors(validation);
    if (hasFieldErrors(validation)) return;

    if (!clientRef.current) {
      clientRef.current = window.crypto.randomUUID();
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await placeOrder({
        clientRef: clientRef.current,
        fields,
        // IDs + quantities only — prices never leave the browser (PRD §13).
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      });

      if (result.ok) {
        clearCart();
        router.push(
          `/order/success?order=${encodeURIComponent(result.orderId)}&email=${result.emailSent ? "sent" : "failed"}`,
        );
        return; // stay busy until navigation completes
      }

      setSubmitting(false);
      setFormError(result.message);
      if (result.code === "unauthenticated") {
        router.refresh(); // server re-renders the sign-in gate
      }
    } catch {
      setSubmitting(false);
      setFormError(
        "The request didn't finish. Nothing was saved — try again. Retrying won't create a duplicate order.",
      );
    }
  }

  const inputClass = (name: keyof CheckoutFields) =>
    `mt-1 w-full border bg-white px-3 py-2 text-sm ${
      errors[name] ? "border-signal" : "border-ink/30"
    }`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <form onSubmit={handleSubmit} noValidate>
        <h2 className="border-b border-steel/50 pb-2 font-mono text-xs text-steel">
          DELIVERY DETAILS
        </h2>

        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="customerName" className="text-sm font-medium">
              Full name
            </label>
            <input
              id="customerName"
              name="customerName"
              autoComplete="name"
              value={fields.customerName}
              onChange={(e) =>
                setFields((f) => ({ ...f, customerName: e.target.value }))
              }
              aria-invalid={Boolean(errors.customerName)}
              aria-describedby={errors.customerName ? "customerName-error" : undefined}
              className={inputClass("customerName")}
            />
            {errors.customerName && (
              <p id="customerName-error" className="mt-1 text-sm text-signal">
                {errors.customerName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              readOnly
              value={user.email}
              aria-describedby="email-help"
              className="mt-1 w-full border border-ink/20 bg-ink/5 px-3 py-2 text-sm text-ink/70"
            />
            <p id="email-help" className="mt-1 font-mono text-[11px] text-steel">
              FROM YOUR GOOGLE ACCOUNT · CONFIRMATION ARRIVES HERE
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium">
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={fields.phone}
              onChange={(e) =>
                setFields((f) => ({ ...f, phone: e.target.value }))
              }
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              className={inputClass("phone")}
            />
            {errors.phone && (
              <p id="phone-error" className="mt-1 text-sm text-signal">
                {errors.phone}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="shippingAddress" className="text-sm font-medium">
              Delivery address
            </label>
            <textarea
              id="shippingAddress"
              name="shippingAddress"
              autoComplete="street-address"
              rows={3}
              value={fields.shippingAddress}
              onChange={(e) =>
                setFields((f) => ({ ...f, shippingAddress: e.target.value }))
              }
              aria-invalid={Boolean(errors.shippingAddress)}
              aria-describedby={
                errors.shippingAddress ? "shippingAddress-error" : undefined
              }
              className={inputClass("shippingAddress")}
            />
            {errors.shippingAddress && (
              <p id="shippingAddress-error" className="mt-1 text-sm text-signal">
                {errors.shippingAddress}
              </p>
            )}
          </div>
        </div>

        <p aria-live="polite" className="mt-5 min-h-12 text-sm text-signal">
          {formError ?? ""}
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full bg-signal px-6 py-3 text-sm font-semibold text-white hover:bg-signal/90 disabled:cursor-not-allowed disabled:bg-steel sm:w-auto"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>

        <p className="mt-3 font-mono text-[11px] text-steel">
          NO PAYMENT IS TAKEN · THIS DEMO DOESN&apos;T PROCESS PAYMENTS
        </p>
      </form>

      <aside aria-label="Order summary">
        <h2 className="border-b border-steel/50 pb-2 font-mono text-xs text-steel">
          ORDER SUMMARY
        </h2>
        <ul className="mt-3 divide-y divide-steel/40">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3 py-3 text-sm">
              <span>
                {item.name}
                <span className="ml-2 font-mono text-xs text-steel">
                  ×{item.quantity}
                </span>
              </span>
              <span className="font-mono">
                {formatMoney(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-steel/50 pt-3 font-mono text-sm">
          <div className="flex justify-between">
            <dt className="text-steel">Subtotal</dt>
            <dd>{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-steel">Delivery</dt>
            <dd className="text-stock">Free for this demo</dd>
          </div>
          <div className="flex justify-between border-t border-steel/50 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="text-signal">{formatMoney(subtotal)}</dd>
          </div>
        </dl>
        <p className="mt-3 font-mono text-[11px] text-steel">
          TOTALS RECALCULATED FROM THE CATALOGUE WHEN YOU PLACE THE ORDER
        </p>
      </aside>
    </div>
  );
}
