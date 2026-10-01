export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";
export type OrderStatus = "pending" | "confirmed";

export interface Product {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string | null;
  inventoryStatus: InventoryStatus;
  featured: boolean;
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

export interface OrderItem {
  id: string;
  productId: string | null;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number;
  customerName: string;
  customerEmail: string;
  phone: string;
  shippingAddress: string;
  createdAt: string;
  items: OrderItem[];
}
