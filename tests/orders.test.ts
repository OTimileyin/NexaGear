import { describe, expect, it } from "vitest";

import {
  CANCELLATION_REASONS,
  canTransition,
  cancellationReasonLabel,
  cancellationReasonsFor,
  checkStatusChange,
  isCancellationReason,
  isOrderStatus,
  isSampleRef,
  isTerminalStatus,
  nextOrderStatuses,
  statusActionLabel,
  statusLabel,
  statusTone,
  timelineIndex,
  timelineSteps,
} from "@/lib/orders";

describe("isOrderStatus", () => {
  it("accepts the lifecycle and rejects the old payment-shaped value", () => {
    expect(isOrderStatus("processing")).toBe(true);
    expect(isOrderStatus("delivered")).toBe(true);
    // 'paid' lived in `status` before 0008 and 'confirmed' in 0001; neither is
    // a fulfilment state, and accepting them would render nonsense buttons.
    expect(isOrderStatus("paid")).toBe(false);
    expect(isOrderStatus("confirmed")).toBe(false);
    expect(isOrderStatus("")).toBe(false);
  });
});

describe("canTransition", () => {
  it("walks the happy path one step at a time", () => {
    expect(canTransition("pending", "processing")).toBe(true);
    expect(canTransition("processing", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });

  it("never skips a step", () => {
    expect(canTransition("pending", "shipped")).toBe(false);
    expect(canTransition("pending", "delivered")).toBe(false);
    expect(canTransition("processing", "delivered")).toBe(false);
  });

  it("never moves backwards", () => {
    expect(canTransition("shipped", "processing")).toBe(false);
    expect(canTransition("delivered", "shipped")).toBe(false);
  });

  it("cancels only before the parcel leaves", () => {
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("processing", "cancelled")).toBe(true);
    expect(canTransition("shipped", "cancelled")).toBe(false);
  });

  it("treats terminal states as terminal", () => {
    for (const target of ["pending", "processing", "shipped", "delivered", "cancelled"]) {
      expect(canTransition("delivered", target)).toBe(false);
      expect(canTransition("cancelled", target)).toBe(false);
    }
    expect(isTerminalStatus("delivered")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isTerminalStatus("pending")).toBe(false);
  });

  it("refuses transitions out of an unrecognised status", () => {
    expect(canTransition("paid", "processing")).toBe(false);
    expect(canTransition("not-a-status", "delivered")).toBe(false);
    expect(nextOrderStatuses("paid")).toEqual([]);
  });
});

describe("labels", () => {
  it("names every status in plain language", () => {
    expect(statusLabel("pending")).toBe("Placed");
    expect(statusLabel("processing")).toBe("Being prepared");
    expect(statusLabel("shipped")).toBe("Shipped");
    expect(statusLabel("delivered")).toBe("Delivered");
    expect(statusLabel("cancelled")).toBe("Cancelled");
  });

  it("says so plainly when a status is unrecognised", () => {
    expect(statusLabel("wibble")).toBe("Unknown status");
  });

  it("gives every transition a verb the admin can act on", () => {
    for (const status of nextOrderStatuses("processing")) {
      expect(statusActionLabel(status).length).toBeGreaterThan(0);
    }
    expect(statusActionLabel("delivered")).toBe("Mark delivered");
  });

  it("tones are distinct enough to style, and unknown is neutral", () => {
    expect(statusTone("delivered")).toBe("good");
    expect(statusTone("cancelled")).toBe("bad");
    expect(statusTone("shipped")).toBe("progress");
    expect(statusTone("wibble")).toBe("neutral");
  });
});

describe("timeline", () => {
  it("reports the position on the happy path", () => {
    expect(timelineIndex("pending")).toBe(0);
    expect(timelineIndex("delivered")).toBe(3);
    expect(timelineIndex("cancelled")).toBe(-1);
  });

  it("shows no forward steps for a cancelled order", () => {
    expect(timelineSteps("cancelled")).toEqual([]);
    expect(timelineSteps("pending")).toHaveLength(4);
  });
});

describe("isSampleRef", () => {
  it("accepts the demo reference format and nothing looser", () => {
    expect(isSampleRef("NGX-1001")).toBe(true);
    expect(isSampleRef("ngx-1001")).toBe(false);
    expect(isSampleRef("NGX-101")).toBe(false);
    expect(isSampleRef("' OR 1=1")).toBe(false);
  });
});

describe("cancellation reasons", () => {
  it("offers a fixed vocabulary with no 'other' escape hatch", () => {
    expect(CANCELLATION_REASONS).toEqual([
      "out_of_stock",
      "customer_request",
      "payment_failed",
      "address_unreachable",
      "suspected_fraud",
    ]);
    // An 'other' bucket would collect values nobody can report on. Adding a
    // real reason is a reviewed migration instead.
    expect(isCancellationReason("other")).toBe(false);
    expect(isCancellationReason("n/a")).toBe(false);
    expect(isCancellationReason("")).toBe(false);
  });

  it("labels every reason in plain language and never guesses", () => {
    for (const reason of CANCELLATION_REASONS) {
      expect(cancellationReasonLabel(reason)).not.toBe("Unknown reason");
    }
    expect(cancellationReasonLabel("payment_failed")).toBe("Payment failed");
    expect(cancellationReasonLabel("mystery")).toBe("Unknown reason");
  });

  it("asks for a reason only when the target is cancelled", () => {
    expect(cancellationReasonsFor("cancelled")).toEqual([
      ...CANCELLATION_REASONS,
    ]);
    expect(cancellationReasonsFor("shipped")).toBeNull();
    expect(cancellationReasonsFor("delivered")).toBeNull();
  });
});

describe("checkStatusChange", () => {
  it("refuses a cancellation with no reason", () => {
    const result = checkStatusChange("pending", "cancelled", null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("reason_required");
  });

  it("treats whitespace as no reason, exactly as btrim does in SQL", () => {
    const result = checkStatusChange("pending", "cancelled", "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("reason_required");
  });

  it("refuses a reason outside the vocabulary", () => {
    const result = checkStatusChange(
      "pending",
      "cancelled",
      "customer_changed_mind",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_reason");
  });

  it("accepts a cancellation carrying a listed reason", () => {
    const result = checkStatusChange("processing", "cancelled", "out_of_stock");
    expect(result).toEqual({ ok: true, reason: "out_of_stock" });
  });

  it("refuses a reason on a status that is not a cancellation", () => {
    const result = checkStatusChange("pending", "processing", "out_of_stock");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("reason_not_allowed");
  });

  it("allows an ordinary transition with no reason at all", () => {
    expect(checkStatusChange("pending", "processing", null)).toEqual({
      ok: true,
      reason: null,
    });
    expect(checkStatusChange("shipped", "delivered", undefined)).toEqual({
      ok: true,
      reason: null,
    });
  });

  it("refuses an illegal transition before it ever considers the reason", () => {
    // A shipped order cannot be cancelled, so it must not be reported as
    // 'missing reason' — that would send the admin chasing the wrong fix.
    const result = checkStatusChange("shipped", "cancelled", null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_transition");
  });

  it("refuses an unknown target status", () => {
    const result = checkStatusChange("pending", "refunded", null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_status");
  });

  it("keeps the biconditional: the check must never be satisfiable by NULL", () => {
    // This is the bug the live proof caught. A SQL CHECK rejects only FALSE,
    // so the constraint `status='cancelled' AND cancellation_reason IN (...)`
    // evaluates to NULL — and therefore PASSES — when the reason is NULL.
    // The TypeScript mirror must never report a missing reason as acceptable,
    // and must never demand one for an ordinary forward step.
    const forwardSteps = [
      ["pending", "processing"],
      ["processing", "shipped"],
      ["shipped", "delivered"],
    ] as const;

    for (const [from, to] of forwardSteps) {
      expect(checkStatusChange(from, to, null)).toEqual({
        ok: true,
        reason: null,
      });
    }

    // A cancelled order can never be produced without a non-empty reason.
    for (const reason of [null, undefined, "", "   "]) {
      expect(checkStatusChange("pending", "cancelled", reason).ok).toBe(false);
    }
  });
});