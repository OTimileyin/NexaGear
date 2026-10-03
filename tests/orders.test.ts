import { describe, expect, it } from "vitest";

import {
  canTransition,
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