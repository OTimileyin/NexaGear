import { useAuth, useUser } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { ProductRow } from "../components/ProductRow.tsx";
import { Button, EmptyState, ErrorState, LoadingState, Screen } from "../components/ui.tsx";
import { useCart } from "../cart/cart-context.tsx";
import { catalogErrorMessage, fetchProducts } from "../lib/catalog.ts";
import { useSupabase } from "../lib/supabase-context.tsx";
import { useTheme } from "../lib/theme.ts";
import type { Product } from "../lib/types.ts";

/**
 * The shop.
 *
 * The catalogue is public and the cart is not, so this screen is readable
 * signed out — and adding while signed out sends the shopper to sign in instead
 * of silently discarding the tap.
 */
export default function ShopScreen() {
  const theme = useTheme();
  const router = useRouter();
  const supabase = useSupabase();
  const { isSignedIn } = useAuth();
  // `useAuth` carries the session; the profile itself comes from `useUser`.
  // Clerk Core 3 removed `user` from `useAuth`'s return value.
  const { user } = useUser();
  const cart = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!supabase) {
      setStatus("error");
      setError("This build has no Supabase keys, so the shop cannot load.");
      return;
    }
    setStatus((current) => (current === "ready" ? current : "loading"));
    fetchProducts(supabase)
      .then((rows) => {
        setProducts(rows);
        setStatus("ready");
        setError(null);
      })
      .catch((cause: unknown) => {
        setStatus("error");
        setError(catalogErrorMessage(cause));
      });
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const inCart = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart.items) map.set(item.productId, item.quantity);
    return map;
  }, [cart.items]);

  const onAdd = useCallback(
    (product: Product) => {
      if (cart.addProduct(product) === "sign_in_required") {
        router.push("/sign-in" as Href);
      }
    },
    [cart, router],
  );

  const subtitle = isSignedIn
    ? `Signed in as ${user?.primaryEmailAddress?.emailAddress ?? user?.username ?? "your account"}`
    : "Browsing as a guest — sign in to add to your cart";

  return (
    <Screen
      title="NexaGear"
      subtitle={subtitle}
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            cart.count > 0 ? `Cart, ${cart.count} items` : "Cart, empty"
          }
          onPress={() => router.push("/cart" as Href)}
          style={({ pressed }) => [
            styles.cartButton,
            { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.cartLabel, { color: theme.ink }]}>Cart</Text>
          <View style={[styles.badge, { backgroundColor: cart.count > 0 ? theme.drafting : theme.border }]}>
            <Text style={[styles.badgeText, { color: cart.count > 0 ? "#ffffff" : theme.steel }]}>
              {cart.count}
            </Text>
          </View>
        </Pressable>
      }
    >
      {status === "loading" ? <LoadingState what="Loading the shop…" /> : null}

      {status === "error" && error ? (
        <ErrorState message={error} onRetry={load} retryLabel="Reload the shop" />
      ) : null}

      {status === "ready" ? (
        <FlatList
          data={products}
          keyExtractor={(product) => product.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={theme.drafting}
              onRefresh={() => {
                setRefreshing(true);
                load();
                cart.refresh();
                setRefreshing(false);
              }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="The shop is empty"
              body="There are no products listed right now. Pull down to check again."
            />
          }
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              inCartQuantity={inCart.get(item.id) ?? 0}
              onAdd={() => onAdd(item)}
            />
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cartButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 22,
  },
  cartLabel: { fontSize: 15, fontWeight: "600" },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 13, fontWeight: "700" },
});
