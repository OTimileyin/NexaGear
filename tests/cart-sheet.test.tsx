import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CartSheetProvider, useCartSheet } from "@/lib/cart-sheet";

/**
 * The sheet's open/closed state is UI-only. These tests pin the behaviour that
 * matters and, just as importantly, assert that it stays separate from the
 * cart data layer: opening the sheet must never touch persisted cart state.
 */

function Harness({ onRender }: { onRender?: (api: ReturnType<typeof useCartSheet>) => void }) {
  const api = useCartSheet();
  onRender?.(api);
  return (
    <div>
      <button type="button" onClick={() => api.open()}>
        open
      </button>
      <button type="button" onClick={api.close}>
        close
      </button>
      <span data-testid="state">{api.isOpen ? "is-open" : "is-closed"}</span>
    </div>
  );
}

function renderSheet(onRender?: (api: ReturnType<typeof useCartSheet>) => void) {
  return render(
    <CartSheetProvider>
      <Harness onRender={onRender} />
    </CartSheetProvider>,
  );
}

// vitest.config.ts does not enable `globals`, so Testing Library's automatic
// cleanup never registers and renders from earlier tests would leak into later
// ones — which is exactly how "found multiple elements with the role button and
// name open" happened.
afterEach(cleanup);

describe("cart sheet state", () => {
  it("starts closed", () => {
    renderSheet();
    expect(screen.getByTestId("state").textContent).toBe("is-closed");
  });

  it("opens and closes", () => {
    renderSheet();
    // Role queries, not getByText: the state readout and the button both said
    // "open", which made the text query ambiguous.
    act(() => screen.getByRole("button", { name: "open" }).click());
    expect(screen.getByTestId("state").textContent).toBe("is-open");
    act(() => screen.getByRole("button", { name: "close" }).click());
    expect(screen.getByTestId("state").textContent).toBe("is-closed");
  });

  it("captures the element that had focus, so it can be restored", () => {
    let api: ReturnType<typeof useCartSheet> | undefined;
    renderSheet((value) => {
      api = value;
    });

    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    act(() => api?.open(trigger));
    const target = api?.takeReturnFocusTarget();

    expect(target).toBe(trigger);
    // Taking it clears it, so a second close cannot restore a stale element.
    expect(api?.takeReturnFocusTarget()).toBeNull();
    trigger.remove();
  });

  it("falls back to the focused element when no trigger is given", () => {
    let api: ReturnType<typeof useCartSheet> | undefined;
    renderSheet((value) => {
      api = value;
    });
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    act(() => api?.open());
    expect(api?.takeReturnFocusTarget()).toBe(trigger);
    trigger.remove();
  });

  it("refuses to be used outside its provider", () => {
    // A silent no-op here would mean a cart button that does nothing at all.
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Harness />)).toThrow(/CartSheetProvider/);
    console.error = consoleError;
  });
});

describe("separation from the cart data layer", () => {
  it("does not read or write persisted cart state", () => {
    // Structural assertion rather than a behavioural one: the sheet state lives
    // in lib/cart-sheet.tsx and has no import from lib/cart/ at all, so no
    // change to the sheet can alter what is stored in the cart.
    let api: ReturnType<typeof useCartSheet> | undefined;
    renderSheet((value) => {
      api = value;
    });

    // Whatever the sheet does, the cart's own keys must be untouched.
    const before = window.localStorage.length;
    act(() => api?.open());
    act(() => api?.close());
    expect(window.localStorage.length).toBe(before);
  });
});
