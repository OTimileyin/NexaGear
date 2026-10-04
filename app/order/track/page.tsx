import Link from "next/link";

import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { SignInGate } from "@/components/SignInGate";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/checkout";
import { formatMoney } from "@/lib/format";
import { isSampleRef, statusLabel, timelineIndex, timelineSteps } from "@/lib/orders";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = pageMetadata({
  title: "Track an order",
  description:
    "Look up a NexaGear order by reference and see its fulfilment status.",
  path: "/order/track",
  index: false,
});

interface TrackedOrder {
  id: string;
  status: string;
  payment_status: string;
  subtotal: number | string;
  customer_name: string;
  shipping_address: string;
  created_at: string;
  status_changed_at: string | null;
  is_sample: boolean;
  sample_ref: string | null;
  order_items: {
    id: string;
    product_name_snapshot: string;
    quantity: number;
    line_total: number | string;
  }[];
}

/**
 * Customer-facing order tracking.
 *
 * Reachable only with a session, and RLS decides what it can see: the owner
 * policy from 0003 plus the admin policy from 0006. An order id belonging to
 * someone else simply does not come back — this page never falls back to
 * cached, remembered or guessed data, because a wrong delivery address or a
 * false "shipped" is worse than an honest "we can't find that".
 */
export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; ref?: string }>;
}) {
  const { order: orderId, ref } = await searchParams;
  const user = await getCurrentUser();

  const signInNext = orderId
    ? `/order/track?order=${encodeURIComponent(orderId)}`
    : ref
      ? `/order/track?ref=${encodeURIComponent(ref)}`
      : "/order/track";

  if (!user) {
    return <SignInGate next={signInNext} />;
  }

  const supabase = await getSupabaseServerClient();

  const columns =
    "id, status, payment_status, subtotal, customer_name, shipping_address, created_at, status_changed_at, is_sample, sample_ref, order_items(id, product_name_snapshot, quantity, line_total)";

  // An order id addresses a real order the caller owns (or any order, if the
  // caller is an admin); a sample reference addresses the fictional demo rows,
  // which RLS makes readable to any signed-in visitor.
  const order = supabase
    ? orderId && isUuid(orderId)
      ? (
          await supabase
            .from("orders")
            .select(columns)
            .eq("id", orderId)
            .maybeSingle()
        ).data
      : ref && isSampleRef(ref)
        ? (
            await supabase
              .from("orders")
              .select(columns)
              .eq("sample_ref", ref.toUpperCase())
              .maybeSingle()
          ).data
        : null
    : null;

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="font-mono text-xs text-steel">TRACKING · NOT FOUND</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          We can&apos;t find that order
        </h1>
        <p className="mt-3 max-w-prose text-ink/75">
          The link may be incomplete, or the order belongs to a different
          account. Open the link from your confirmation email, or sign in with
          the account that placed it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="bg-signal px-5 py-3 text-sm font-semibold text-paper hover:bg-signal/90"
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

  const row = order as unknown as TrackedOrder;
  const items = [...row.order_items].sort((a, b) =>
    a.product_name_snapshot.localeCompare(b.product_name_snapshot),
  );
  const current = timelineIndex(row.status);
  const steps = timelineSteps(row.status);
  const placed = new Date(row.created_at);
  const moved = row.status_changed_at ? new Date(row.status_changed_at) : placed;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="font-mono text-xs text-steel">ORDER TRACKING</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {statusLabel(row.status)}
      </h1>
      <p className="mt-2 font-mono text-sm text-ink/80">
        Reference{" "}
        <span className="text-xs">{row.sample_ref ?? row.id}</span> · placed{" "}
        {placed.toLocaleDateString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>

      {row.is_sample && (
        <p className="mt-4 border-l-4 border-drafting bg-surface px-4 py-3 text-sm">
          <span className="font-mono text-[11px] text-steel">SAMPLE ORDER · NOT REAL</span>
          <span className="mt-1 block text-ink/80">
            This is invented demo data so the tracking page can be seen without
            placing an order. The customer, address and totals are fictional.
          </span>
        </p>
      )}

      {steps.length > 0 ? (
        <ol className="mt-8 space-y-0 border-l-2 border-steel/40">
          {steps.map((step) => {
            const index = timelineIndex(step);
            const done = index < current;
            const isCurrent = index === current;

            return (
              <li
                key={step}
                aria-current={isCurrent ? "step" : undefined}
                className="flex items-baseline gap-3 py-3 pl-5"
              >
                <span
                  aria-hidden="true"
                  className={`-ml-[1.6rem] h-2.5 w-2.5 shrink-0 rounded-full ${
                    isCurrent
                      ? "bg-signal"
                      : done
                        ? "bg-stock"
                        : "bg-steel/40"
                  }`}
                />
                <span
                  className={
                    isCurrent
                      ? "font-semibold"
                      : done
                        ? "text-ink/70"
                        : "text-steel"
                  }
                >
                  {statusLabel(step)}
                </span>
                {isCurrent && (
                  <span className="font-mono text-[11px] text-steel">
                    current step
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-8 border-l-4 border-signal bg-surface px-4 py-3 text-sm">
          This order was cancelled, so it isn&apos;t being prepared or shipped.
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div aria-live="polite" className="border-l-4 border-drafting bg-surface px-4 py-3 text-sm">
          <p className="font-mono text-[11px] text-steel">LAST UPDATED</p>
          <p className="mt-1">
            {moved.toLocaleDateString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="mt-2">
            Status: <OrderStatusBadge status={row.status} />
          </p>
          <p className="mt-2 text-ink/80">
            {row.payment_status === "paid"
              ? "Payment received."
              : "Payment not yet completed."}
          </p>
        </div>

        <div className="border-l-4 border-steel/40 bg-surface px-4 py-3 text-sm">
          <p className="font-mono text-[11px] text-steel">DELIVERING TO</p>
          <p className="mt-1">{row.customer_name}</p>
          <p className="text-ink/75">{row.shipping_address}</p>
        </div>
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <caption className="sr-only">Items in this order</caption>
        <thead>
          <tr className="border-b border-ink/30 text-left font-mono text-[11px] text-steel">
            <th scope="col" className="py-2">Item</th>
            <th scope="col" className="py-2 text-right">Qty</th>
            <th scope="col" className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-steel/40">
              <td className="py-3 pr-3">{item.product_name_snapshot}</td>
              <td className="py-3 text-right font-mono">{item.quantity}</td>
              <td className="py-3 text-right font-mono">
                {formatMoney(Number(item.line_total))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-mono font-semibold">
            <td colSpan={2} className="py-3 text-right text-steel">Total</td>
            <td className="py-3 text-right">
              {formatMoney(Number(row.subtotal))}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="bg-signal px-5 py-3 text-sm font-semibold text-paper hover:bg-signal/90"
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