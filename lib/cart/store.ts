import { clampQuantity, parseStoredCart, stepQuantity } from "@/lib/cart/math";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "nexagear:cart";
const EMPTY: CartItem[] = [];

type Listener = () => void;

/** Mirrors writes to the server cart. Implemented by ServerCartBridge. */
export interface ServerCart {
  upsert(productId: string, quantity: number): Promise<void> | void;
  remove(productId: string): Promise<void> | void;
  clear(): Promise<void> | void;
}

/**
 * External cart store (browser only, read through useSyncExternalStore).
 *
 * Two modes, and the difference matters:
 *
 *   LOCAL  — a signed-out visitor. `localStorage` is the cart. Private,
 *            instant, and unchanged from before Lesson 3.
 *   SERVER — a signed-in customer. `cart_items` is the cart, so the same cart
 *            appears on the website and on a phone. localStorage is cleared on
 *            attach and never written, because two sources of truth for one
 *            cart is how a stale item reappears after being deleted elsewhere.
 *
 * Mutations apply locally FIRST and mirror to the server afterwards. The UI must
 * answer a tap immediately and the network cannot be trusted to be fast; if a
 * mirror write fails, the next realtime event or reload is what corrects the
 * view. Nothing here is trusted at checkout — `create_order` re-reads prices
 * from the database (PRD §13) — so a momentarily optimistic cart is safe.
 *
 * The class stays synchronous and React-free so it can be unit-tested directly;
 * the Clerk glue lives in components/CartSync.tsx.
 */
class CartStore {
  private items: CartItem[] = EMPTY;
  private listeners = new Set<Listener>();
  private loaded = false;
  private server: ServerCart | null = null;

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

  /** True while the account's cart, rather than this browser's, is on screen. */
  isServerBacked(): boolean {
    return this.server !== null;
  }

  /**
   * The local cart only, and nothing once the server cart is attached.
   *
   * The merge on sign-in reads this, and returning the merged result here would
   * send the account's own cart back to the merge function — doubling every
   * quantity on each sign-in.
   */
  guestItems(): CartItem[] {
    if (this.server) return EMPTY;
    this.ensureLoaded();
    return this.items;
  }

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

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  /** Replace the visible cart. Persists only when localStorage is the cart. */
  private setItems(next: CartItem[]): void {
    this.items = next;
    if (!this.server) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable — in-memory cart still works.
      }
    }
    this.emit();
  }

  /** Hand the cart over to the account's server cart. */
  attachServer(server: ServerCart, items: CartItem[]): void {
    this.loaded = true;
    this.server = server;
    this.items = items;
    // The guest cart has been merged on the server, so the local copy is
    // cleared. Leaving it would make a signed-out visitor inherit the previous
    // customer's cart on the same device.
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do; the in-memory switch below is what matters.
    }
    this.emit();
  }

  /** Back to local mode — signed out, or the server cart is unreachable. */
  detachServer(): void {
    if (!this.server) return;
    this.server = null;
    this.setItems(EMPTY);
  }

  /** Apply items that came from the server (initial load, or a realtime event). */
  applyServerItems(items: CartItem[]): void {
    if (!this.server) return;
    this.items = items;
    this.emit();
  }

  private mirror(work: (server: ServerCart) => void): void {
    if (!this.server) return;
    const server = this.server;
    try {
      work(server);
    } catch {
      // A failed mirror is corrected by the next realtime event or reload.
    }
  }

  /** Set one product's quantity when the cart already holds it. */
  private quantityOf(productId: string): number | null {
    const existing = this.items.find((i) => i.productId === productId);
    return existing ? existing.quantity : null;
  }

  addItem = (item: Omit<CartItem, "quantity">): void => {
    this.ensureLoaded();
    const existing = this.items.find((i) => i.productId === item.productId);

    if (existing) {
      const quantity = clampQuantity(existing.quantity + 1);
      this.setItems(
        this.items.map((i) =>
          i.productId === item.productId ? { ...i, quantity } : i,
        ),
      );
      this.mirror((server) => void server.upsert(item.productId, quantity));
      return;
    }

    this.setItems([...this.items, { ...item, quantity: 1 }]);
    this.mirror((server) => void server.upsert(item.productId, 1));
  };

  setQuantity = (productId: string, quantity: number): void => {
    this.ensureLoaded();
    const clamped = clampQuantity(quantity);
    this.setItems(
      this.items.map((i) =>
        i.productId === productId ? { ...i, quantity: clamped } : i,
      ),
    );
    this.mirror((server) => void server.upsert(productId, clamped));
  };

  increment = (productId: string): void => {
    this.ensureLoaded();
    const current = this.quantityOf(productId);
    if (current === null) return;
    const quantity = clampQuantity(current + 1);
    this.setItems(
      this.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
      ),
    );
    this.mirror((server) => void server.upsert(productId, quantity));
  };

  decrement = (productId: string): void => {
    this.ensureLoaded();
    const next: CartItem[] = [];
    let removed = false;
    for (const i of this.items) {
      if (i.productId !== productId) {
        next.push(i);
        continue;
      }
      const quantity = stepQuantity(i.quantity, -1);
      if (quantity === null) {
        removed = true;
      } else {
        next.push({ ...i, quantity });
      }
    }
    this.setItems(next);
    // Decrementing the last unit removes the line, so the server is told to
    // delete rather than to store a quantity of zero (which the CHECK forbids).
    if (removed) {
      this.mirror((server) => void server.remove(productId));
    } else {
      const quantity = next.find((i) => i.productId === productId)?.quantity;
      if (quantity !== undefined) {
        this.mirror((server) => void server.upsert(productId, quantity));
      }
    }
  };

  removeItem = (productId: string): void => {
    this.ensureLoaded();
    this.setItems(this.items.filter((i) => i.productId !== productId));
    this.mirror((server) => void server.remove(productId));
  };

  clear = (): void => {
    this.ensureLoaded();
    this.setItems(EMPTY);
    this.mirror((server) => void server.clear());
  };
}

export const cartStore = new CartStore();
