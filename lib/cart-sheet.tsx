"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * UI state for the cart slide-over sheet.
 *
 * This is deliberately NOT part of the cart data layer. `lib/cart/*` is the
 * source of truth for what is in the cart, and it is unchanged by the sheet.
 * Open/closed is a presentation concern with a different lifetime: it must not
 * be persisted, must not survive a reload, and must never end up in the
 * serialised cart blob. Putting it in `CartProvider` would have meant
 * threading a field through the store, its subscriber and its parser for
 * something that is not cart data.
 */

interface CartSheetContextValue {
  isOpen: boolean;
  open: (trigger?: HTMLElement | null) => void;
  close: () => void;
  /** Returns the element focus should return to, or null. */
  takeReturnFocusTarget: () => HTMLElement | null;
}

const CartSheetContext = createContext<CartSheetContextValue | null>(null);

export function CartSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  // A ref, not state: the element must be readable at close time without
  // causing a re-render, and must not be part of the rendered output.
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const open = useCallback((trigger?: HTMLElement | null) => {
    // Remember whatever had focus so it can be restored on close. Captured
    // here rather than in the sheet, because the sheet may unmount before its
    // close handler runs.
    returnFocusTo.current =
      trigger ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const takeReturnFocusTarget = useCallback(() => {
    const target = returnFocusTo.current;
    returnFocusTo.current = null;
    return target;
  }, []);

  const value = useMemo(
    () => ({ isOpen, open, close, takeReturnFocusTarget }),
    [isOpen, open, close, takeReturnFocusTarget],
  );

  return (
    <CartSheetContext.Provider value={value}>{children}</CartSheetContext.Provider>
  );
}

export function useCartSheet(): CartSheetContextValue {
  const ctx = useContext(CartSheetContext);
  if (!ctx) {
    throw new Error("useCartSheet must be used inside <CartSheetProvider>");
  }
  return ctx;
}
