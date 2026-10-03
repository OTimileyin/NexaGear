"use client";

import { useState, useTransition } from "react";

import { updateOrderStatus } from "@/app/admin/actions";
import {
  cancellationReasonLabel,
  cancellationReasonsFor,
  nextOrderStatuses,
  statusActionLabel,
  type CancellationReason,
  type OrderStatus,
} from "@/lib/orders";

/**
 * The admin's only write control in the app.
 *
 * It renders exactly the transitions `lib/orders.ts` allows, so the UI cannot
 * offer an illegal move; the database still re-checks (migration 0008). Errors
 * are announced, not swallowed — an admin who clicks "Mark shipped" and sees
 * nothing happen has no way to tell success from a dropped request.
 *
 * Cancelling additionally requires a reason (migration 0010). The reason is
 * asked for rather than assumed: a default selection would let an admin record
 * "payment failed" on an order that was never paid, which is exactly the vague
 * or wrong data the constrained vocabulary exists to prevent. The Cancel button
 * stays disabled until a reason is chosen, and the label says why.
 *
 * These reasons are internal. They are recorded for operations and are NOT
 * rendered on the customer tracking page — "suspected fraud" is an operational
 * judgement, not something to show the person whose order it is.
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
  const [reason, setReason] = useState<CancellationReason | "">("");

  const options = nextOrderStatuses(status);
  const cancelReasons = cancellationReasonsFor("cancelled");
  const canCancelFromHere = options.includes("cancelled");
  const cancelBlocked = canCancelFromHere && reason === "";

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
      const result = await updateOrderStatus(
        orderId,
        status,
        next,
        next === "cancelled" ? reason || null : null,
      );
      if (!result.ok) setError(result.message);
      // Only clear once the database confirmed the move.
      if (result.ok && next === "cancelled") setReason("");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {cancelReasons && (
        <div className="flex flex-col gap-1">
          <label
            className="font-mono text-[11px] text-steel"
            htmlFor={`cancel-reason-${orderId}`}
          >
            Reason for cancelling (required)
          </label>
          <select
            id={`cancel-reason-${orderId}`}
            value={reason}
            disabled={pending}
            onChange={(event) =>
              setReason(event.target.value as CancellationReason | "")
            }
            className="border border-ink/40 bg-paper px-2 py-1 font-mono text-[11px] disabled:opacity-60"
          >
            <option value="">Choose a reason…</option>
            {cancelReasons.map((value) => (
              <option key={value} value={value}>
                {cancellationReasonLabel(value)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((next) => {
          const destructive = next === "cancelled";
          const blocked = destructive && cancelBlocked;
          return (
            <button
              key={next}
              type="button"
              onClick={() => advance(next)}
              disabled={pending || blocked}
              aria-describedby={
                blocked ? `cancel-reason-hint-${orderId}` : undefined
              }
              className={`border px-2 py-1 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-60 ${
                destructive
                  ? "border-signal text-signal hover:bg-signal hover:text-white"
                  : "border-ink/40 hover:border-ink hover:bg-ink hover:text-paper"
              }`}
            >
              {pending
                ? "Updating…"
                : `${statusActionLabel(next)}${blocked ? " (choose a reason)" : ""}`}
            </button>
          );
        })}
      </div>

      {cancelBlocked && (
        <p
          id={`cancel-reason-hint-${orderId}`}
          className="font-mono text-[11px] text-steel"
        >
          Pick a reason first — a cancellation without one doesn&apos;t record
          why the order stopped.
        </p>
      )}

      <p aria-live="polite" className="min-h-4 text-[11px] text-signal">
        {error ?? ""}
      </p>
    </div>
  );
}