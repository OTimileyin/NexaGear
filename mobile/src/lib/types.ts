/** Mirrors the web's `lib/types.ts` for the fields the phone actually reads. */
export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  slug: string;
  category: string;
  price: number;
  imageUrl: string | null;
  inventoryStatus: InventoryStatus;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
}
