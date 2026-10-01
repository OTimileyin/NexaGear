import "server-only";

import { getPublicSupabase } from "@/lib/supabase/public";
import type { InventoryStatus, Product } from "@/lib/types";

/** The catalogue could not be read (env missing or DB error). */
export class CatalogUnavailableError extends Error {}

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description: string;
  category: string;
  price: number | string;
  image_url: string | null;
  inventory_status: InventoryStatus;
  featured: boolean;
}

function normalize(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    imageUrl: row.image_url,
    inventoryStatus: row.inventory_status,
    featured: row.featured,
  };
}

function requirePublicClient() {
  const supabase = getPublicSupabase();
  if (!supabase) {
    throw new CatalogUnavailableError(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY missing)",
    );
  }
  return supabase;
}

export async function getProducts(): Promise<Product[]> {
  const supabase = requirePublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    throw new CatalogUnavailableError(error.message);
  }
  return ((data ?? []) as ProductRow[]).map(normalize);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = requirePublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("featured", true)
    .order("name", { ascending: true });
  if (error) {
    throw new CatalogUnavailableError(error.message);
  }
  return ((data ?? []) as ProductRow[]).map(normalize);
}

export async function getCategories(): Promise<string[]> {
  const supabase = requirePublicClient();
  const { data, error } = await supabase.from("products").select("category");
  if (error) {
    throw new CatalogUnavailableError(error.message);
  }
  const rows = (data ?? []) as { category: string }[];
  return Array.from(new Set(rows.map((r) => r.category)));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = requirePublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw new CatalogUnavailableError(error.message);
  }
  return data ? normalize(data as ProductRow) : null;
}
