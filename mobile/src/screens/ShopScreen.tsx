import { useAuth } from "@clerk/expo";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useCatalog } from "../lib/catalog-context.tsx";
import { filterCatalog } from "../lib/catalog-filter.ts";
import { productPhoto } from "../lib/product-photos.ts";
import { formatMoney } from "../lib/format.ts";
import { ProductTile } from "../components/ProductTile.tsx";
import { Screen, Button, ErrorState, EmptyState, LoadingState } from "../components/ui.tsx";
import { SearchHeader, BenefitsStrip, Band, ShopIcon, shopping } from "../components/shopping.tsx";
import { useTheme } from "../lib/theme.ts";
import { useCart } from "../cart/cart-context.tsx";

export default function ShopScreen() {
  const theme = useTheme(); const router = useRouter(); const catalog = useCatalog(); const cart = useCart(); const { isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const [query, setQuery] = useState(params.q ?? ""); const category = params.category || null;
  const [sort, setSort] = useState<"name" | "price-low" | "price-high">("name"); const [limit, setLimit] = useState(24);
  const useWidth = useWindowDimensions().width;
  const columns = useWidth >= 700 ? 4 : 2;
  const categories = useMemo(() => [...new Set(catalog.products.map(p => p.category))].sort(), [catalog.products]);
  const products = useMemo(() => filterCatalog(catalog.products, query, category, sort), [catalog.products, query, category, sort]);
  const highlights = [catalog.products.find(p => p.category === "Content Creation"), catalog.products.find(p => p.category === "Developer Setup")].filter(p => p !== undefined);
  return <Screen title="NexaGear" compact bottomSafe={false}>
    <View style={{ flex: 1, width: "100%", maxWidth: 1000, alignSelf: "center" }}>
    <SearchHeader value={query} onChange={value => { setQuery(value); setLimit(24); }} />
    <ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0, height: 38 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 13, gap: 22 }}>{["All", ...categories].map(label => { const active = label === (category ?? "All"); return <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { router.setParams({ category: label === "All" ? "" : label }); setLimit(24); }} style={{ height: 38, justifyContent: "center", gap: 5 }}><Text style={{ color: active ? theme.ink : theme.steel, fontSize: 16, fontWeight: active ? "700" : "500" }}>{label}</Text><View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: active ? theme.ink : "transparent" }} /></Pressable>; })}</ScrollView>
    {catalog.status === "loading" ? <LoadingState what="Loading the shop…" /> : catalog.status === "error" ? <ErrorState message={catalog.error ?? "The shop could not load."} onRetry={() => void catalog.reload()} /> : <FlatList
      key={columns} data={products.slice(0, limit)} numColumns={columns} keyExtractor={item => item.id}
      contentContainerStyle={{ paddingBottom: 20, gap: 8 }} columnWrapperStyle={{ gap: shopping.gap }}
      refreshing={catalog.refreshing} onRefresh={() => { void catalog.reload(); cart.refresh(); }}
      onEndReached={() => setLimit(value => Math.min(value + 24, products.length))} onEndReachedThreshold={0.5}
      ListHeaderComponent={<View>
        {!query && !category ? <>
          <View style={{ paddingTop: 8 }}><BenefitsStrip panel /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Payment and privacy information" onPress={() => router.push("/privacy" as Href)} style={{ marginHorizontal: 13, marginTop: 8, height: 32, borderRadius: 4, backgroundColor: shopping.green, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><ShopIcon name="shield" color="white" size={18} /><Text style={{ color: "white", fontSize: 12 }}>Why NexaGear?</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><Text style={{ color: "white", fontSize: 12 }}>Paystack checkout</Text><ShopIcon name="chevron" color="white" size={13} /></View></Pressable>
          <View style={{ flexDirection: "row", margin: 13, gap: 10 }}>{highlights.map((product, i) => { const photo = productPhoto(product.slug, product.imageUrl); return <Pressable key={product.id} accessibilityRole="button" accessibilityLabel={`Explore ${product.name}`} onPress={() => router.push(`/product?id=${product.id}` as Href)} style={{ flex: 1, minWidth: 0, borderRadius: 5, backgroundColor: theme.scheme === "light" ? shopping.peach : theme.surface, paddingHorizontal: 9 }}><Text numberOfLines={1} style={{ color: theme.ink, fontSize: 15, fontWeight: "600", paddingVertical: 9 }}>{i ? "Desk essentials" : "Creator picks"}</Text>{photo ? <Image source={photo} resizeMode="cover" style={{ width: "100%", height: Math.min(151, (useWidth - 64) / 2) }} /> : null}<Text style={{ fontSize: 15, color: theme.ink, paddingVertical: 5 }}>{formatMoney(product.price)}</Text></Pressable>; })}</View>
          <Band /><Text accessibilityRole="header" style={{ paddingHorizontal: 13, height: 35, paddingTop: 9, fontSize: 15, color: theme.ink }}>Shop by interest</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, gap: 18, paddingBottom: 12 }}>{categories.map(label => <Pressable key={label} accessibilityRole="button" onPress={() => router.setParams({ category: label })} style={{ width: 105, height: 51, borderRadius: 5, backgroundColor: theme.surface, justifyContent: "center", padding: 8 }}><Text numberOfLines={2} style={{ color: theme.ink, fontWeight: "600", fontSize: 12 }}>{label}</Text></Pressable>)}</ScrollView>
        </> : null}
        <Band /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 13, gap: 24 }}>{([{ key: "name", label: "All" }, { key: "price-low", label: "Price ↑" }, { key: "price-high", label: "Price ↓" }] as const).map(option => <Pressable key={option.key} accessibilityRole="button" accessibilityState={{ selected: sort === option.key }} onPress={() => setSort(option.key)} style={{ height: 44, justifyContent: "center", gap: 4 }}><Text style={{ color: sort === option.key ? theme.ink : theme.steel, fontSize: 15, fontWeight: "600" }}>{option.label}</Text><View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: sort === option.key ? theme.ink : "transparent" }} /></Pressable>)}<Text style={{ color: theme.steel, fontSize: 11, paddingTop: 15 }}>{products.length} products</Text></ScrollView>
      </View>}
      ListEmptyComponent={<EmptyState title="No products found" body="Try another search or choose All." action={<Button label="Clear filters" onPress={() => { setQuery(""); router.setParams({ category: "" }); }} />} />}
      ListFooterComponent={<Text style={{ color: theme.steel, padding: 13, fontSize: 11, lineHeight: 16 }}>Demo catalogue · indicative NGN prices and representative photographs. Supplier specifications and availability await confirmation.</Text>}
      renderItem={({ item }) => <ProductTile fullWidth={columns > 2} product={item} quantity={cart.items.find(line => line.productId === item.id)?.quantity ?? 0} onOpen={() => router.push(`/product?id=${item.id}` as Href)} onAdd={() => { if (!isSignedIn || cart.addProduct(item) === "sign_in_required") router.push("/sign-in" as Href); }} />}
    />}</View>
  </Screen>;
}
