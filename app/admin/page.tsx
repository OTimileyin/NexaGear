import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import {
  filterOrders,
  sortOrdersByDate,
  summariseOrders,
  type AdminFilter,
  type AdminOrderRow,
} from "@/lib/admin";
import { formatMoney } from "@/lib/format";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin" };

/**
 * Read-only admin.
 *
 * This page does not grant access — the database does. `is_admin()` is a
 * SECURITY DEFINER function used by the SELECT policies on `orders` and
 * `order_items` (migration 0006), so a non-admin session gets zero rows from
 * the Data API whether it arrives here or is crafted by hand. There is no
 * admin INSERT/UPDATE/DELETE policy, so an admin cannot alter data either.
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
      "id, created_at, status, payment_status, subtotal, customer_name, customer_email, shipping_address, order_items(id)",
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
        READ-ONLY · ACCESS GRANTED BY DATABASE POLICY, NOT BY THIS PAGE
      </p>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders" value={String(summary.orderCount)} />
        <Stat
          label="Paid orders"
          value={`${summary.paidCount} / ${summary.orderCount}`}
        />
        <Stat label="Revenue (paid)" value={formatMoney(summary.revenuePaid)} />
        <Stat label="Order value (all)" value={formatMoney(summary.orderValue)} />
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {filterLink("all", `All ${summary.orderCount}`)}
        {filterLink("paid", `Paid ${summary.paidCount}`)}
        {filterLink("unpaid", `Unpaid ${summary.unpaidCount}`)}
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
                    {order.id.slice(0, 8)}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <Badge paid={order.payment_status === "paid"}>
                    {order.payment_status}
                  </Badge>
                </td>
                <td className="py-3 pr-3 font-mono text-xs">{order.status}</td>
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
        SHOWING THE MOST RECENT {rows.length} ORDERS · AVERAGE ORDER VALUE{" "}
        {formatMoney(summary.averageOrderValue)}
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
    <div className="border-l-4 border-drafting bg-white px-4 py-3">
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