import { Image, StyleSheet, Text, View } from "react-native";

import { formatMoney, inventoryLabel } from "../lib/format.ts";
import { useTheme } from "../lib/theme.ts";
import { productPhoto } from "../lib/product-photos.ts";
import type { Product } from "../lib/types.ts";
import { Button, StatusDot } from "./ui.tsx";

/**
 * One catalogue row.
 *
 * No product photography: the shop's images are drawn from SVG on the website
 * and served as `image_url` for a handful of rows, and a phone that renders a
 * broken image box for a missing URL looks worse than one that shows none. The
 * name, SKU, category, price and stock state are the same fields the web card
 * shows, in the same words.
 */
export function ProductRow({
  product,
  inCartQuantity,
  onAdd,
  busy = false,
}: {
  product: Product;
  inCartQuantity: number;
  onAdd: () => void;
  busy?: boolean;
}) {
  const theme = useTheme();
  const stock = inventoryLabel(product.inventoryStatus);
  const soldOut = product.inventoryStatus === "out_of_stock";
  const photo = productPhoto(product.slug, product.imageUrl);

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      {photo ? <Image source={photo} accessibilityLabel={`${product.name}, representative photograph`} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: theme.surface }} resizeMode="cover" /> : null}
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.ink }]}>{product.name}</Text>
        <Text style={[styles.meta, { color: theme.steel }]}>
          {product.sku} · {product.category}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.price, { color: theme.ink }]}>
            {formatMoney(product.price)}
          </Text>
          <StatusDot color={theme[stock.token]} label={stock.text} />
        </View>
        {inCartQuantity > 0 ? (
          <Text style={[styles.inCart, { color: theme.drafting }]}>
            {inCartQuantity} in your cart
          </Text>
        ) : null}
      </View>

      <View style={styles.action}>
        <Button
          busy={busy}
          accessibilityLabel={soldOut ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
          disabled={soldOut}
          label={
            soldOut
              ? `${product.name} is out of stock`
              : inCartQuantity > 0
                ? "Add another"
                : "Add to cart"
          }
          onPress={onAdd}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13 },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  price: { fontSize: 16, fontWeight: "700" },
  inCart: { fontSize: 13, marginTop: 2 },
  action: { paddingTop: 2 },
});
