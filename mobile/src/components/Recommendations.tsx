import { useAuth } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";
import { useCatalog } from "../lib/catalog-context.tsx";
import { useCart } from "../cart/cart-context.tsx";
import { useTheme } from "../lib/theme.ts";
import { ProductTile } from "./ProductTile.tsx";
import { LoadingState, ErrorState } from "./ui.tsx";
export function Recommendations() {
  const catalog = useCatalog(); const cart = useCart(); const router = useRouter(); const theme = useTheme(); const { isSignedIn } = useAuth(); const width = Math.min(useWindowDimensions().width, 1000); const columns = width >= 700 ? 4 : 2;
  if (catalog.status === "loading") return <View style={{ height: 120 }}><LoadingState what="Loading recommendations…" /></View>;
  if (catalog.status === "error") return <View style={{ height: 160 }}><ErrorState message={catalog.error ?? "Recommendations could not load."} onRetry={() => void catalog.reload()} /></View>;
  return <View style={{ maxWidth: 1000, width: "100%", alignSelf: "center" }}><Text accessibilityRole="header" style={{ padding: 13, fontSize: 15, fontWeight: "600", color: theme.ink }}>Explore NexaGear</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{catalog.products.slice(0, 12).map(product => <View key={product.id} style={{ width: (width - 6 * (columns - 1)) / columns, minWidth: 0 }}><ProductTile fullWidth product={product} quantity={cart.items.find(item => item.productId === product.id)?.quantity ?? 0} onOpen={() => router.push(`/product?id=${product.id}` as Href)} onAdd={() => { if (!isSignedIn || cart.addProduct(product) === "sign_in_required") router.push("/sign-in" as Href); }} /></View>)}</View></View>;
}
