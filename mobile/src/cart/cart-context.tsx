import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/expo";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { createCartApi, type CartApi } from "../lib/cart-api.ts";
import {
  addOne,
  cartCount,
  cartSubtotal,
  clampQuantity,
  stepQuantity,
  withQuantity,
  withoutProduct,
} from "../lib/cart-math.ts";
import type { CartItem, Product } from "../lib/types.ts";

/**
 * The cart, as React context.
 *
 * WHY THIS IS NOT THE WEBSITE'S STORE. The website reads one cart through
 * `useSyncExternalStore` because one cart has to be readable by a sheet, a page
 * and a header at once without a provider. On the phone the whole cart lives
 * behind one screen, so context is the smaller answer — and AGENTS.md §2 asks
 * for context, not a state library.
 *
 * WHY LOAD *AND* SUBSCRIBE. Subscribing alone would show an empty cart to
 * someone who adds an item on the website and then opens the app: the write
 * happened before the phone connected, and realtime only reports changes after
 * you subscribe. Loading alone would go stale the moment the website changed
 * while the app was open. Both are needed, and the subscription is established
 * *before* the first read so nothing that lands in between is missed.
 */

export type AddOutcome = "added" | "sign_in_required";

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  /** `signed_out` is a normal state, not an error. */
  status: "signed_out" | "loading" | "ready" | "error";
  error: string | null;
  addProduct: (product: Product) => AddOutcome;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  refresh: () => void;
  refreshing: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used inside <CartProvider>.");
  }
  return value;
}

function productToItem(product: Product): Omit<CartItem, "quantity"> {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    price: product.price,
    imageUrl: product.imageUrl,
  };
}

export function CartProvider({
  client,
  children,
}: {
  client: SupabaseClient | null;
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [status, setStatus] = useState<CartContextValue["status"]>("signed_out");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  /**
   * A product tapped while signed out. Held in memory only — it lasts for this
   * run of the app, which is exactly as long as the sign-in screen is reachable,
   * and it is not a cart: nothing is written anywhere until a session exists.
   */
  const [pending, setPending] = useState<Product | null>(null);
  const apiRef = useRef<CartApi | null>(null);
  const signedIn = Boolean(isLoaded && isSignedIn && userId);
  /**
   * The last committed cart, and the quantity every mirror write reads from.
   * `setItems` is asynchronous, so reading state to decide what to *send* would
   * make two fast taps both send a quantity of 1 and lose the second one.
   */
  const itemsRef = useRef<CartItem[]>(items);
  itemsRef.current = items;

  /**
   * The only way this provider changes the cart: the ref is written first, so a
   * mirror write that runs in the same tick reads the quantity it just set.
   */
  const commit = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const mirror = useCallback((work: (api: CartApi) => Promise<void>) => {
    const api = apiRef.current;
    if (!api) return;
    void Promise.resolve(work(api)).catch(() => {
      // Corrected by the next event or a reopen; the cart is not money-critical.
    });
  }, []);

  // Attach to the account's cart: subscribe first, then read.
  useEffect(() => {
    if (!client || !userId) {
      apiRef.current = null;
      setItems([]);
      setStatus(isLoaded ? "signed_out" : "loading");
      setError(null);
      return;
    }

    const api = createCartApi(client, userId);
    apiRef.current = api;

    let cancelled = false;

    const unsubscribe = api.subscribe((next) => {
      if (cancelled) return;
      setItems(next);
      setStatus("ready");
      setError(null);
    });

    setStatus("loading");
    api
      .load()
      .then((next) => {
        if (cancelled) return;
        setItems(next);
        setStatus("ready");
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setError(cartErrorMessage(cause));
      });

    return () => {
      cancelled = true;
      unsubscribe();
      apiRef.current = null;
    };
  }, [client, userId, isLoaded]);

  // A product tapped before signing in is added once a session exists.
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !pending || !signedIn) return;
    const product = pending;
    setPending(null);
    commit(addOne(itemsRef.current, productToItem(product)));
    void Promise.resolve(api.upsert(product.id, 1)).catch(() => {
      // The next realtime event, or a reopen, is what corrects this.
    });
  }, [pending, signedIn, status, commit]);

  const refresh = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    setRefreshing(true);
    api
      .load()
      .then((next) => {
        setItems(next);
        setStatus("ready");
        setError(null);
      })
      .catch((cause: unknown) => {
        setStatus("error");
        setError(cartErrorMessage(cause));
      })
      .finally(() => setRefreshing(false));
  }, []);

  /**
   * Coming back to a backgrounded app refetches.
   *
   * This is a backstop, not the mechanism: the subscription is what makes the
   * cart live. But a phone that was asleep has a websocket the network may have
   * dropped without telling us, and a shopper who reopened the app should never
   * be looking at a cart that is missing something they just added elsewhere.
   */
  useEffect(() => {
    if (!signedIn) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [signedIn, refresh]);

  const addProduct = useCallback(
    (product: Product): AddOutcome => {
      if (!signedIn) {
        setPending(product);
        return "sign_in_required";
      }
      const updated = addOne(itemsRef.current, productToItem(product));
      const quantity =
        updated.find((item) => item.productId === product.id)?.quantity ?? 1;
      commit(updated);
      mirror((api) => api.upsert(product.id, quantity));
      return "added";
    },
    [signedIn, mirror, commit],
  );

  const increment = useCallback(
    (productId: string) => {
      const current = itemsRef.current.find((i) => i.productId === productId);
      if (!current) return;
      const quantity = clampQuantity(current.quantity + 1);
      commit(withQuantity(itemsRef.current, productId, quantity));
      mirror((api) => api.upsert(productId, quantity));
    },
    [mirror, commit],
  );

  const decrement = useCallback(
    (productId: string) => {
      const current = itemsRef.current.find((i) => i.productId === productId);
      if (!current) return;
      const quantity = stepQuantity(current.quantity, -1);
      if (quantity === null) {
        commit(withoutProduct(itemsRef.current, productId));
        // Decrementing the last unit removes the line, so the server is told to
        // delete — storing a quantity of 0 would be refused by the CHECK.
        mirror((api) => api.remove(productId));
        return;
      }
      commit(withQuantity(itemsRef.current, productId, quantity));
      mirror((api) => api.upsert(productId, quantity));
    },
    [mirror, commit],
  );

  const removeItem = useCallback(
    (productId: string) => {
      commit(withoutProduct(itemsRef.current, productId));
      mirror((api) => api.remove(productId));
    },
    [mirror, commit],
  );

  const clear = useCallback(() => {
    commit([]);
    mirror((api) => api.clear());
  }, [mirror, commit]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      subtotal: cartSubtotal(items),
      status,
      error,
      addProduct,
      increment,
      decrement,
      removeItem,
      clear,
      refresh,
      refreshing,
    }),
    [
      items,
      status,
      error,
      addProduct,
      increment,
      decrement,
      removeItem,
      clear,
      refresh,
      refreshing,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function cartErrorMessage(cause: unknown): string {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return `Could not reach your cart. Check your connection, then retry. (${detail})`;
}
