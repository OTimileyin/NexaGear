import Link from "next/link";

import { AdminStatusControl } from "@/components/AdminStatusControl";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { getCurrentUser } from "@/lib/auth";
import {
  filterOrders,
  sortOrdersByDate,
  summariseOrders,
  type AdminFilter,
  type AdminOrderRow,
} from "@/lib/admin";
import { formatMoney } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = pageMetadata({
  title: "Admin",
  description: "Order fulfilment view.",
  path: "/admin",
  index: false,
});

/**
 * Read-mostly admin.
 *
 * This page does not grant access — the database does. `is_admin()` is a
 * SECURITY DEFINER function used by the SELECT policies on `orders` and
 * `order_items` (migration 0006), so a non-admin session gets zero rows from
 * the Data API whether it arrives here or is crafted by hand.
 *
 * The single write action here advances fulfilment status, and even that is not
 * this page's decision: `authenticated` has no UPDATE grant on `status`, so
 * `set_order_status` (migration 0008) is the only route in — and it re-checks
 * `is_admin()` plus the transition table itself. There is no INSERT/DELETE
 * policy, so an admin can neither add nor remove orders.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const active: AdminFilter =
    filter === "paid" || filter === "unpaid" ? filter : "all";

  const user = await getCurrentUser();

  if (!user) {
    return (
      <Shell title="Admin">
        <p className="text-ink/80">Sign in with an administrator account.</p>
      </Shell>
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return (
      <Shell title="Admin">
        <p className="text-ink/80">The store isn&apos;t configured.</p>
      </Shell>
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, created_at, status, status_changed_at, payment_status, is_sample, sample_ref, subtotal, customer_name, customer_email, shipping_address, order_items(id)",
    )
    .limit(200);

  // RLS returned nothing: either the caller is not an admin, or there is
  // genuinely nothing to show. Say which rather than implying an empty store.
  if (error) {
    console.error("[admin] orders query failed:", error.message);
    return (
      <Shell title="Admin">
        <p className="text-ink/80">We couldn&apos;t load orders just now.</p>
      </Shell>
    );
  }

  const rows = sortOrdersByDate((data ?? []) as unknown as AdminOrderRow[]);

  if (rows.length === 0) {
    return (
      <Shell title="Admin">
        <p className="text-ink/80">
          This account can&apos;t see any orders. If you expected admin access,
          an administrator needs to set <code>profiles.is_admin</code> for your
          account.
        </p>
      </Shell>
    );
  }

  const summary = summariseOrders(rows);
  const visible = filterOrders(rows, active);

  // Filter labels count what each tab actually lists — including sample rows,
  // which are shown (badged) but excluded from the money figures above.
  const allCount = rows.length;
  const paidCount = filterOrders(rows, "paid").length;
  const unpaidCount = filterOrders(rows, "unpaid").length;

  const filterLink = (value: AdminFilter, label: string) => (
    <Link
      href={value === "all" ? "/admin" : `/admin?filter=${value}`}
      aria-current={active === value ? "page" : undefined}
      className={`border px-3 py-1 font-mono text-xs ${
        active === value
          ? "border-ink bg-ink text-paper"
          : "border-ink/30 text-ink/80 hover:border-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <Shell title="Admin">
      <p className="font-mono text-[11px] text-steel">
        ACCESS GRANTED BY DATABASE POLICY, NOT BY THIS PAGE · STATUS ADVANCES
        ONLY THROUGH set_order_status, WHICH RE-CHECKES ADMIN AND THE ALLOWED
        STEPS
      </p>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Real orders" value={String(summary.orderCount)} />
        <Stat label="Sample orders" value={String(summary.sampleCount)} />
        <Stat
          label="Paid orders"
          value={`${summary.paidCount} / ${summary.orderCount}`}
        />
        <Stat label="Revenue (paid)" value={formatMoney(summary.revenuePaid)} />
        <Stat label="Order value (real)" value={formatMoney(summary.orderValue)} />
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {filterLink("all", `All ${allCount}`)}
        {filterLink("paid", `Paid ${paidCount}`)}
        {filterLink("unpaid", `Unpaid ${unpaidCount}`)}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Orders</caption>
          <thead>
            <tr className="border-b border-ink/30 text-left font-mono text-[11px] text-steel">
              <th scope="col" className="py-2">Placed</th>
              <th scope="col" className="py-2">Customer</th>
              <th scope="col" className="py-2">Payment</th>
              <th scope="col" className="py-2">Status</th>
              <th scope="col" className="py-2">Advance</th>
              <th scope="col" className="py-2 text-right">Items</th>
              <th scope="col" className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => (
              <tr key={order.id} className="border-b border-steel/40 align-top">
                <td className="py-3 pr-3 font-mono text-xs">
                  {new Date(order.created_at).toLocaleDateString("en-GB")}
                </td>
                <td className="py-3 pr-3">
                  {order.customer_name}
                  <span className="block font-mono text-[11px] text-steel">
                    {order.is_sample && order.sample_ref
                      ? order.sample_ref
                      : order.id.slice(0, 8)}
                  </span>
                  {order.is_sample && (
                    <span className="mt-1 inline-block border border-steel/50 px-1 font-mono text-[10px] text-steel">
                      SAMPLE · EXCLUDED FROM TOTALS
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3">
                  <Badge paid={order.payment_status === "paid"}>
                    {order.payment_status}
                  </Badge>
                </td>
                <td className="py-3 pr-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="py-3 pr-3">
                  <AdminStatusControl orderId={order.id} status={order.status} />
                </td>
                <td className="py-3 text-right font-mono">
                  {order.order_items?.length ?? 0}
                </td>
                <td className="py-3 text-right font-mono">
                  {formatMoney(Number(order.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="mt-6 text-sm text-ink/80">
          No orders match this filter.
        </p>
      )}

      <p className="mt-6 font-mono text-[11px] text-steel">
        SHOWING THE MOST RECENT {rows.length} ORDERS · AVERAGE REAL ORDER VALUE{" "}
        {formatMoney(summary.averageOrderValue)} · {summary.sampleCount} SAMPLE
        ORDER{summary.sampleCount === 1 ? "" : "S"} EXCLUDED FROM EVERY FIGURE
        ABOVE
      </p>
    </Shell>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-4">{children}</div>
      <div className="mt-8">
        <Link href="/" className="text-sm underline">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-4 border-drafting bg-surface px-4 py-3">
      <dt className="font-mono text-[11px] text-steel">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}

function Badge({
  paid,
  children,
}: {
  paid: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`font-mono text-[11px] ${paid ? "text-stock" : "text-signal"}`}
    >
      {children}
    </span>
  );
}