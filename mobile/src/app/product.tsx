import { useAuth } from "@clerk/expo";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Image, Text, useWindowDimensions } from "react-native";
import { useCatalog } from "../lib/catalog-context.tsx";
import { useCart } from "../cart/cart-context.tsx";
import { useTheme } from "../lib/theme.ts";
import { productPhoto } from "../lib/product-photos.ts";
import { formatMoney } from "../lib/format.ts";
import { Screen, Button, EmptyState, LoadingState, ErrorState } from "../components/ui.tsx";
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const catalog = useCatalog(); const theme = useTheme(); const cart = useCart(); const router = useRouter(); const { isSignedIn } = useAuth(); const product = catalog.products.find(p => p.id === id);
  const photoSize = useWindowDimensions().width - 40;
  const back = <Button tone="quiet" label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/" as Href)} />;
  if (catalog.status === "loading") return <Screen title="Product" action={back}><LoadingState what="Loading product…" /></Screen>;
  if (catalog.status === "error") return <Screen title="Product" action={back}><ErrorState message={catalog.error ?? "Product could not load."} onRetry={() => void catalog.reload()} /></Screen>;
  if (!product) return <Screen title="Product" action={back}><EmptyState title="Product not found" body="Return to the shop to choose an available product." /></Screen>;
  const photo = productPhoto(product.slug, product.imageUrl);
  return <Screen title="Product details" action={back}><ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
    {photo ? <Image source={photo} accessibilityLabel={`${product.name}, representative photograph`} style={{ width: "100%", height: photoSize, borderRadius: 18 }} /> : null}
    <Text style={{ color: theme.steel }}>{product.category} · {product.sku}</Text><Text accessibilityRole="header" style={{ color: theme.ink, fontSize: 28, fontWeight: "700" }}>{product.name}</Text><Text style={{ color: theme.drafting, fontSize: 25, fontWeight: "700" }}>{formatMoney(product.price)}</Text><Text style={{ color: theme.steel, fontSize: 16, lineHeight: 25 }}>{product.description}</Text><Text style={{ color: theme.steel, fontSize: 12 }}>Representative demo photography. Exact supplier specifications and availability must be confirmed.</Text>
    <Button label={product.inventoryStatus === "out_of_stock" ? "Out of stock" : "Add to cart"} disabled={product.inventoryStatus === "out_of_stock"} onPress={() => { if (!isSignedIn || cart.addProduct(product) === "sign_in_required") router.push("/sign-in" as Href); }} /><Button tone="quiet" label="View cart" onPress={() => router.push("/cart" as Href)} />
  </ScrollView></Screen>;
}
