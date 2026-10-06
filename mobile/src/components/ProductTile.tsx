import { Image, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useState } from "react";
import type { Product } from "../lib/types.ts";
import { productPhoto } from "../lib/product-photos.ts";
import { formatMoney, inventoryLabel } from "../lib/format.ts";
import { useTheme } from "../lib/theme.ts";
import { ShopIcon } from "./shopping.tsx";
export function ProductTile({ product, quantity, onOpen, onAdd, fullWidth = false }: { product: Product; quantity: number; onOpen: () => void; onAdd: () => void; fullWidth?: boolean }) {
  const theme = useTheme(); const photo = productPhoto(product.slug, product.imageUrl); const soldOut = product.inventoryStatus === "out_of_stock";
  const window = useWindowDimensions(); const [width, setWidth] = useState(0); const imageSize = width || (window.width - 6) / 2;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ flex: 1, minWidth: 0, maxWidth: fullWidth ? "100%" : "50%", gap: 2, backgroundColor: theme.paper }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={onOpen} style={{ gap: 4 }}>
      {photo ? <Image source={photo} accessibilityLabel={`${product.name}, representative photograph`} resizeMode="cover" style={{ width: "100%", height: imageSize, borderRadius: 2, backgroundColor: theme.surface }} /> : <View style={{ width: "100%", height: imageSize, backgroundColor: theme.surface, justifyContent: "center", padding: 16 }}><Text style={{ color: theme.steel }}>Photo pending</Text></View>}
      <Text numberOfLines={1} style={{ paddingHorizontal: 4, color: theme.ink, fontSize: 12, lineHeight: 16 }}>{product.name}</Text>
    </Pressable>
    <Text numberOfLines={1} style={{ paddingHorizontal: 4, color: theme.steel, fontSize: 11 }}>{product.category}</Text>
    <View style={{ paddingHorizontal: 4, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: theme.ink, fontWeight: "700", fontSize: 16 }}>{formatMoney(product.price)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.name} to cart`} disabled={soldOut} onPress={onAdd} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center", opacity: soldOut ? 0.5 : 1 }}><View style={{ width: 39, height: 28, borderWidth: 1, borderColor: theme.ink, borderRadius: 16, alignItems: "center", justifyContent: "center" }}><ShopIcon name="cart" color={theme.ink} size={20} /></View></Pressable></View>
    <Text style={{ paddingHorizontal: 4, color: theme.steel, fontSize: 11 }}>{quantity ? `${quantity} in your cart` : inventoryLabel(product.inventoryStatus).text}</Text>
  </View>;
}
