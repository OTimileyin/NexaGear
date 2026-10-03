import Link from "next/link";

import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { SignInGate } from "@/components/SignInGate";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { isUuid } from "@/lib/checkout";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Order received" };

interface OrderRow {
  id: string;
  status: string;
  payment_status: string;
  subtotal: number | string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  created_at: string;
  order_items: {
    id: string;
    product_name_snapshot: string;
    unit_price_snapshot: number | string;
    quantity: number;
    line_total: number | string;
  }[];
}

function MissingOrder({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs text-steel">ORDER · NOT FOUND</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-prose text-ink/75">{body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="bg-signal px-5 py-3 text-sm font-semibold text-white hover:bg-signal/90"
        >
          Browse the catalogue
        </Link>
        <Link
          href="/"
          className="border border-ink px-5 py-3 text-sm font-medium hover:bg-ink hover:text-paper"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    order?: string;
    email?: string;
    payment?: string;
  }>;
}) {
  const { order: orderId, email, payment } = await searchParams;
  const user = await getCurrentUser();

  const signInNext = orderId
    ? `/order/success?order=${encodeURIComponent(orderId)}`
    : "/order/success";

  if (!user) {
    return <SignInGate next={signInNext} />;
  }

  if (!orderId || !isUuid(orderId)) {
    return (
      <MissingOrder
        title="That order reference doesn't exist"
        body="The link is incomplete or altered. Your actual orders are always reachable from your confirmation email."
      />
    );
  }

  const supabase = await getSupabaseServerClient();
  const order = supabase
    ? (
        await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", orderId)
          .maybeSingle()
      ).data
    : null;

  if (!order) {
    // RLS returns nothing for other users' orders — never fabricate a result.
    return (
      <MissingOrder
        title="We couldn't find that order"
        body="It may belong to a different account, or the reference is wrong. Sign in with the account that placed it, or check your confirmation email."
      />
    );
  }

  const row = order as unknown as OrderRow;
  const items = [...row.order_items].sort((a, b) =>
    a.product_name_snapshot.localeCompare(b.product_name_snapshot),
  );
  const subtotal = Number(row.subtotal);
  const created = new Date(row.created_at);
  const emailSent = email === "sent";
  // The database is the source of truth, not the query string: a replayed or
  // hand-edited ?paid=1 must never claim money was received.
  const isPaid = row.payment_status === "paid";
  const receiptSent = email === "receipt_sent";
  const paymentFailure = payment && payment !== "unknown" ? payment : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="border-l-4 border-stock bg-white px-6 py-8">
        <p className="font-mono text-xs text-steel">ORDER RECEIVED · SAVED IN THE DATABASE</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {isPaid ? "Thanks — your order is paid." : "Thanks — your order is in."}
        </h1>
        <p className="mt-3 max-w-prose text-ink/80">
          Reference{" "}
          <span className="font-mono text-sm">{row.id}</span> · placed{" "}
          {created.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        <p className="mt-2 text-sm">
          Fulfillment: <OrderStatusBadge status={row.status} />
        </p>

        <table className="mt-8 w-full border-collapse text-sm">
          <caption className="sr-only">Items in your order</caption>
          <thead>
            <tr className="border-b border-ink/30 text-left font-mono text-[11px] text-steel">
              <th scope="col" className="py-2">Item</th>
              <th scope="col" className="py-2 text-right">Qty</th>
              <th scope="col" className="py-2 text-right">Unit</th>
              <th scope="col" className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-steel/40">
                <td className="py-3 pr-3">{item.product_name_snapshot}</td>
                <td className="py-3 text-right font-mono">{item.quantity}</td>
                <td className="py-3 text-right font-mono">
                  {formatMoney(Number(item.unit_price_snapshot))}
                </td>
                <td className="py-3 text-right font-mono">
                  {formatMoney(Number(item.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-mono">
              <td colSpan={3} className="py-3 text-right text-steel">Subtotal</td>
              <td className="py-3 text-right">{formatMoney(subtotal)}</td>
            </tr>
            <tr className="font-mono">
              <td colSpan={3} className="py-1 text-right text-steel">Delivery</td>
              <td className="py-1 text-right text-stock">Free</td>
            </tr>
            <tr className="font-mono text-base font-semibold">
              <td colSpan={3} className="py-2 text-right">Total</td>
              <td className="py-2 text-right text-signal">{formatMoney(subtotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 border-t border-steel/50 pt-4 text-sm">
          <p className="font-medium">Delivery to</p>
          <p className="text-ink/75">{row.customer_name}</p>
          <p className="text-ink/75">{row.shipping_address}</p>
        </div>

        <div
          aria-live="polite"
          className={`mt-6 border-l-4 bg-paper px-4 py-3 text-sm ${
            isPaid ? "border-stock" : "border-drafting"
          }`}
        >
          <p className="font-medium">
            {isPaid
              ? `Payment received — ${formatMoney(subtotal)}`
              : "Payment not yet completed"}
          </p>
          <p className="mt-1 text-ink/80">
            {isPaid
              ? receiptSent
                ? `A receipt was sent to ${row.customer_email}.`
                : `We couldn't send the receipt email, but your payment went through and the order is marked paid.`
              : paymentFailure === "not_configured"
                ? "This demo store isn't configured to take online payment yet. Your order is saved — payment can be arranged separately."
                : "Your order is saved either way. If you closed the payment page, nothing is lost — contact the store to finish paying."}
          </p>
        </div>

        <p aria-live="polite" className="mt-4 text-sm">
          {emailSent ? (
            <>
              A confirmation email was sent to{" "}
              <span className="font-mono text-xs">{row.customer_email}</span>.
            </>
          ) : (
            <>
              The order confirmation email couldn&apos;t be sent right now — the
              order itself is unaffected, and the failure is logged on the
              server.
            </>
          )}
        </p>

        <p className="mt-4 font-mono text-[11px] text-steel">
          PAYMENTS RUN IN PAYSTACK TEST MODE · NO REAL MONEY MOVES
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/order/track?order=${encodeURIComponent(row.id)}`}
          className="border border-ink px-5 py-3 text-sm font-medium hover:bg-ink hover:text-paper"
        >
          Track this order
        </Link>
        <Link
          href="/shop"
          className="bg-signal px-5 py-3 text-sm font-semibold text-white hover:bg-signal/90"
        >
          Continue shopping
        </Link>
        <Link
          href="/"
          className="border border-ink px-5 py-3 text-sm font-medium hover:bg-ink hover:text-paper"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
