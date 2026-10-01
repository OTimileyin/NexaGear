"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { cartStore } from "@/lib/cart/store";
import type { CartItem } from "@/lib/types";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">) => cartStore.addItem(item),
    [],
  );
  const increment = useCallback(
    (productId: string) => cartStore.increment(productId),
    [],
  );
  const decrement = useCallback(
    (productId: string) => cartStore.decrement(productId),
    [],
  );
  const setQuantity = useCallback(
    (productId: string, quantity: number) =>
      cartStore.setQuantity(productId, quantity),
    [],
  );
  const removeItem = useCallback(
    (productId: string) => cartStore.removeItem(productId),
    [],
  );
  const clearCart = useCallback(() => cartStore.clear(), []);

  const value = useMemo(
    () => ({
      items,
      addItem,
      increment,
      decrement,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [items, addItem, increment, decrement, setQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}
