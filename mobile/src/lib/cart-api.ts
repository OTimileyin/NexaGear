import type { SupabaseClient } from "@supabase/supabase-js";

import type { CartItem } from "./types.ts";

/**
 * The phone's half of the shared cart — the same table, the same policies, the
 * same shapes as the website's `lib/cart/server-bridge.ts`.
 *
 * There is one deliberate difference: **no `mergeGuest`.** That call exists to
 * fold a browser's `localStorage` cart into an account, and the phone has no
 * local cart to fold in — `cart_items` is its only cart, so there is nothing to
 * merge and calling it would send an empty list every sign-in.
 *
 * Writes are fire-and-forget at the call site (the provider applies the change
 * to local state first), because the cart must answer a tap instantly and the
 * network cannot be trusted to be fast. Nothing here is trusted at checkout:
 * `create_order` re-prices every line from the database (PRD §13).
 */

interface CartRow {
  product_id: string;
  quantity: number;
  products:
    | {
        slug: string;
        name: string;
        sku: string;
        price: number | string;
        image_url: string | null;
      }
    | null;
}

export interface CartApi {
  load(): Promise<CartItem[]>;
  upsert(productId: string, quantity: number): Promise<void>;
  remove(productId: string): Promise<void>;
  clear(): Promise<void>;
  subscribe(onItems: (items: CartItem[]) => void): () => void;
}

export function createCartApi(
  supabase: SupabaseClient,
  userId: string,
): CartApi {
  /** The account's current cart, in the shape the UI already understands. */
  async function load(): Promise<CartItem[]> {
    const { data, error } = await supabase
      .from("cart_items")
      .select("product_id, quantity, products(slug, name, sku, price, image_url)")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const items: CartItem[] = [];
    for (const row of (data ?? []) as unknown as CartRow[]) {
      const product = row.products;
      // A row whose product vanished is skipped rather than shown as a broken
      // line; the cascade in 0011 should make this unreachable.
      if (!product) continue;
      items.push({
        productId: row.product_id,
        slug: product.slug,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        imageUrl: product.image_url,
        quantity: row.quantity,
      });
    }
    return items;
  }

  async function upsert(productId: string, quantity: number): Promise<void> {
    const { error } = await supabase.from("cart_items").upsert(
      { user_id: userId, product_id: productId, quantity },
      { onConflict: "user_id,product_id" },
    );
    if (error) throw error;
  }

  async function remove(productId: string): Promise<void> {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("product_id", productId);
    if (error) throw error;
  }

  /**
   * Emptying the cart. The `user_id` filter is stated rather than implied: RLS
   * scopes the delete anyway, and saying it means the statement reads as "my
   * rows" instead of "every row".
   */
  async function clear(): Promise<void> {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
  }

  /**
   * Subscribes to this account's cart rows and hands back fresh items.
   *
   * Every event triggers a re-read instead of interpreting the payload. That
   * costs one small query per change and removes a class of bugs: a DELETE
   * payload carries the old row and an UPDATE the new one, and reconciling
   * those by hand is where sync code goes wrong. A re-read is always current.
   *
   * The filter keeps this from refetching its own writes, and RLS applies to
   * the stream as well as to the query.
   */
  function subscribe(onItems: (items: CartItem[]) => void): () => void {
    const channel = supabase
      .channel(`cart_items:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void load()
            .then(onItems)
            .catch(() => {
              // A failed refresh leaves the last known cart on screen; the next
              // event or a manual refresh corrects it.
            });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  return { load, upsert, remove, clear, subscribe };
}
