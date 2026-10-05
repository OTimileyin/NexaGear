import type { SupabaseClient } from "@supabase/supabase-js";

import type { Product } from "./types.ts";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  slug: string;
  category: string;
  price: number | string;
  image_url: string | null;
  inventory_status: Product["inventoryStatus"];
}

/**
 * The catalogue is public and identical for everyone — the same rows the
 * website's shop page reads with the anon key. No token is required, which is
 * why browsing works before sign-in while the cart does not: the cart is the
 * account's, the catalogue is the shop's.
 */
export async function fetchProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, slug, category, price, image_url, inventory_status")
    .order("name", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as ProductRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    category: row.category,
    price: Number(row.price),
    imageUrl: row.image_url,
    inventoryStatus: row.inventory_status,
  }));
}

/**
 * What to say when the catalogue cannot be read. Names the cause and the next
 * step; it never blames the shopper for a network or configuration problem.
 */
export function catalogErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `Could not load the shop. Check your connection, then retry. (${detail})`;
}
