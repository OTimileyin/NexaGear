import type { Product } from "./types.ts";
export function filterCatalog(products: Product[], query: string, category: string | null, sort: "name" | "price-low" | "price-high" = "name"): Product[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return products.filter(product => (!category || product.category === category) && terms.every(term => `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(term))).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "price-low" ? a.price - b.price : b.price - a.price);
}
