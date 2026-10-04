"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CartItem } from "@/lib/types";

/**
 * Talks to the server cart (`cart_items`, migration 0011) on behalf of the
 * local store.
 *
 * The store stays React-free and synchronous; this class owns everything that
 * is asynchronous — the initial read, writes, the guest merge, and the realtime
 * subscription. That split is what keeps the cart's existing components and
 * tests working while the source of truth moves to the server.
 *
 * Writes are fire-and-forget on purpose. The user's cart UI must respond to a
 * tap immediately, so the store applies the change locally first and this
 * mirrors it. If a write fails the next realtime event or reload corrects the
 * view — and the cart is not money-critical, because `create_order` re-prices
 * everything from the database at checkout (PRD §13).
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

export class ServerCartBridge {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  /** The account's current cart, as cart items the UI already understands. */
  async load(): Promise<CartItem[]> {
    const { data, error } = await this.supabase
      .from("cart_items")
      .select("product_id, quantity, products(slug, name, sku, price, image_url)")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const items: CartItem[] = [];
    for (const row of (data ?? []) as unknown as CartRow[]) {
      const product = row.products;
      // A cart row whose product vanished is skipped rather than rendered as a
      // broken line; the cascade in 0011 means this should not happen.
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

  /**
   * Merges whatever was in the guest's local cart into the account.
   *
   * Called once when a signed-out cart becomes a signed-in one. Quantities are
   * summed by the database function, and the caller empties the local cart
   * afterwards — which is what makes this safe to call again on a remount: the
   * second call sends an empty list and changes nothing.
   */
  async mergeGuest(items: CartItem[]): Promise<void> {
    if (items.length === 0) return;

    const { error } = await this.supabase.rpc("merge_guest_cart", {
      p_items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
    if (error) throw error;
  }

  async upsert(productId: string, quantity: number): Promise<void> {
    const { error } = await this.supabase.from("cart_items").upsert(
      { user_id: this.userId, product_id: productId, quantity },
      { onConflict: "user_id,product_id" },
    );
    if (error) throw error;
  }

  async remove(productId: string): Promise<void> {
    const { error } = await this.supabase
      .from("cart_items")
      .delete()
      .eq("product_id", productId);
    if (error) throw error;
  }

  /**
   * Emptying the cart. The `user_id` filter is explicit rather than implied:
   * RLS scopes the delete anyway, and stating it means the statement reads as
   * "my rows" instead of "every row", which is the version that would be a
   * disaster if a policy were ever dropped.
   */
  async clear(): Promise<void> {
    const { error } = await this.supabase
      .from("cart_items")
      .delete()
      .eq("user_id", this.userId);
    if (error) throw error;
  }

  /**
   * Subscribes to this user's cart rows and hands back fresh items on change.
   *
   * On any event it re-reads rather than interpreting the payload. That costs
   * one small query per change and removes a whole class of bugs: the realtime
   * payload for a DELETE carries the old row, an UPDATE the new one, and
   * reconciling those by hand is where sync code usually goes wrong. A re-read
   * is always the current truth, for every event type.
   *
   * The filter is on `user_id` so a second device does not cause this client to
   * refetch its own writes, and RLS applies to the stream as well.
   */
  subscribe(onItems: (items: CartItem[]) => void): () => void {
    const channel = this.supabase
      .channel(`cart_items:${this.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `user_id=eq.${this.userId}`,
        },
        () => {
          void this.load()
            .then(onItems)
            .catch(() => {
              // A failed refresh leaves the last known cart on screen; the next
              // event or a reload corrects it.
            });
        },
      )
      .subscribe();

    return () => {
      void this.supabase.removeChannel(channel);
    };
  }
}
