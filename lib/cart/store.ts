import { clampQuantity, parseStoredCart, stepQuantity } from "@/lib/cart/math";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "nexagear:cart";
const EMPTY: CartItem[] = [];

type Listener = () => void;

/**
 * External cart store (browser only, read through useSyncExternalStore).
 * - getServerSnapshot is a stable EMPTY array (SSR renders an empty cart).
 * - The first client getSnapshot loads persisted state from localStorage.
 * - Every mutation commits to memory + localStorage and notifies subscribers.
 */
class CartStore {
  private items: CartItem[] = EMPTY;
  private listeners = new Set<Listener>();
  private loaded = false;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): CartItem[] => {
    this.ensureLoaded();
    return this.items;
  };

  getServerSnapshot = (): CartItem[] => EMPTY;

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      this.items = raw ? parseStoredCart(raw) : EMPTY;
    } catch {
      this.items = EMPTY;
    }
  }

  private commit(next: CartItem[]): void {
    this.items = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable — in-memory cart still works.
    }
    this.listeners.forEach((listener) => listener());
  }

  addItem = (item: Omit<CartItem, "quantity">): void => {
    this.ensureLoaded();
    const existing = this.items.find((i) => i.productId === item.productId);
    if (existing) {
      this.commit(
        this.items.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: clampQuantity(i.quantity + 1) }
            : i,
        ),
      );
      return;
    }
    this.commit([...this.items, { ...item, quantity: 1 }]);
  };

  setQuantity = (productId: string, quantity: number): void => {
    this.ensureLoaded();
    const clamped = clampQuantity(quantity);
    this.commit(
      this.items.map((i) =>
        i.productId === productId ? { ...i, quantity: clamped } : i,
      ),
    );
  };

  increment = (productId: string): void => {
    this.ensureLoaded();
    this.commit(
      this.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: clampQuantity(i.quantity + 1) }
          : i,
      ),
    );
  };

  decrement = (productId: string): void => {
    this.ensureLoaded();
    const next: CartItem[] = [];
    for (const i of this.items) {
      if (i.productId !== productId) {
        next.push(i);
        continue;
      }
      const quantity = stepQuantity(i.quantity, -1);
      if (quantity !== null) next.push({ ...i, quantity });
    }
    this.commit(next);
  };

  removeItem = (productId: string): void => {
    this.ensureLoaded();
    this.commit(this.items.filter((i) => i.productId !== productId));
  };

  clear = (): void => {
    this.ensureLoaded();
    this.commit(EMPTY);
  };
}

export const cartStore = new CartStore();
