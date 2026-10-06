import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { useSupabase } from "./supabase-context.tsx";
import { fetchProducts, catalogErrorMessage } from "./catalog.ts";
import type { Product } from "./types.ts";
const Context = createContext<{ products: Product[]; status: "loading" | "ready" | "error"; error: string | null; reload: () => Promise<void>; refreshing: boolean } | null>(null);
export function CatalogProvider({ children }: { children: ReactNode }) {
  const client = useSupabase();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      if (!client) throw new Error("The store connection is not configured.");
      setProducts(await fetchProducts(client)); setStatus("ready"); setError(null);
    } catch (cause) { setError(catalogErrorMessage(cause)); setStatus("error"); }
    finally { setRefreshing(false); }
  }, [client]);
  useEffect(() => { void reload(); }, [reload]);
  return <Context.Provider value={{ products, status, error, reload, refreshing }}>{children}</Context.Provider>;
}
export function useCatalog() { const value = useContext(Context); if (!value) throw new Error("CatalogProvider required"); return value; }
