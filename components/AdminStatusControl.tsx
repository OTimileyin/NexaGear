"use client";

import { useState, useTransition } from "react";

import { updateOrderStatus } from "@/app/admin/actions";
import {
  nextOrderStatuses,
  statusActionLabel,
  type OrderStatus,
} from "@/lib/orders";

/**
 * The admin's only write control in the app.
 *
 * It renders exactly the transitions `lib/orders.ts` allows, so the UI cannot
 * offer an illegal move; the database still re-checks (migration 0008). Errors
 * are announced, not swallowed — an admin who clicks "Mark shipped" and sees
 * nothing happen has no way to tell success from a dropped request.
 */
export function AdminStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const options = nextOrderStatuses(status);

  if (options.length === 0) {
    return (
      <p className="font-mono text-[11px] text-steel">
        No further steps from here.
      </p>
    );
  }

  function advance(next: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {options.map((next) => {
          const destructive = next === "cancelled";
          return (
            <button
              key={next}
              type="button"
              onClick={() => advance(next)}
              disabled={pending}
              className={`border px-2 py-1 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-60 ${
                destructive
                  ? "border-signal text-signal hover:bg-signal hover:text-white"
                  : "border-ink/40 hover:border-ink hover:bg-ink hover:text-paper"
              }`}
            >
              {pending ? "Updating…" : statusActionLabel(next)}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="min-h-4 text-[11px] text-signal">
        {error ?? ""}
      </p>
    </div>
  );
}