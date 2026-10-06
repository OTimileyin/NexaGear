import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { filterCatalog } from "../mobile/src/lib/catalog-filter";
import type { Product } from "../mobile/src/lib/types";
const data = JSON.parse(readFileSync("catalog/expansion.json", "utf8")) as Array<{ name: string; slug: string; sku: string; category: string; price: number; description: string; image_url: string }>;
describe("owner-requested catalogue expansion", () => {
  it("contains exactly 100 distinct products with nonconflicting reserved SKUs", () => {
    expect(data).toHaveLength(100);
    expect(new Set(data.map(p => p.sku)).size).toBe(100);
    expect(new Set(data.map(p => p.slug)).size).toBe(100);
    expect(data.every(p => /^NG-(1\d\d|200)$/.test(p.sku))).toBe(true);
  });
  it("covers creators, developers and home appliances in ten groups", () => {
    expect(new Set(data.map(p => p.category)).size).toBe(10);
    expect(data.filter(p => p.category === "Content Creation")).toHaveLength(10);
    expect(data.filter(p => p.category === "Developer Setup")).toHaveLength(10);
    expect(data.filter(p => p.category === "Home Appliances")).toHaveLength(10);
  });
  it("provides valid NGN demo prices and real local image files for every entry", () => {
    for (const product of data) {
      expect(product.price).toBeGreaterThan(0);
      expect(product.description).toContain("Demo catalogue");
      expect(existsSync(`public${product.image_url}`)).toBe(true);
      expect(existsSync(`mobile/assets/catalog/${product.image_url.split("/").at(-1)}`)).toBe(true);
    }
  });
  it("uses an additive, idempotent migration without deleting or updating existing products", () => {
    const sql = readFileSync("supabase/migrations/0012_catalog_expansion.sql", "utf8");
    expect(sql).toContain("on conflict (slug) do nothing");
    expect(sql).not.toMatch(/\b(delete|update|truncate|drop)\s+(from|public|table)/i);
  });
});
const products = data.map((p, i) => ({ id: String(i), name: p.name, slug: p.slug, description: p.description, sku: p.sku, category: p.category, price: p.price, imageUrl: p.image_url, inventoryStatus: "in_stock" })) as Product[];
describe("shopping search and filters", () => {
  it("finds products using multiple case-insensitive words and SKU", () => {
    expect(filterCatalog(products, "USB microphone", null).map(p => p.name)).toEqual(["USB Podcast Microphone"]);
    expect(filterCatalog(products, "ng-101", null)).toHaveLength(1);
  });
  it("combines category and search without showing products from other groups", () => {
    expect(filterCatalog(products, "camera", "Smart Home").every(p => p.category === "Smart Home")).toBe(true);
    expect(filterCatalog(products, "camera", "Kitchen Appliances")).toHaveLength(0);
  });
  it("sorts prices while preserving the source catalogue order", () => {
    const first = products[0].id;
    const ascending = filterCatalog(products, "", null, "price-low");
    expect(ascending[0].price).toBe(7500);
    expect(filterCatalog(products, "", null, "price-high")[0].price).toBe(1250000);
    expect(products[0].id).toBe(first);
  });
});
