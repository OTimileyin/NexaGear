import { useAuth, useClerk } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useCart } from "../cart/cart-context.tsx";
import {
  Button,
  ErrorState,
  LoadingState,
  QuantityStepper,
  Screen,
} from "../components/ui.tsx";
import { formatMoney } from "../lib/format.ts";
import { useTheme } from "../lib/theme.ts";
import { Recommendations } from "../components/Recommendations.tsx";
import { Band, ShopIcon, TopBar } from "../components/shopping.tsx";


/** Shared account cart. Checkout collects delivery details in the app. */
export default function CartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const cart = useCart();


  if (!isSignedIn || (cart.status === "ready" && cart.items.length === 0)) {
    return <Screen title="Cart" compact><TopBar title="Cart" /><ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={{ minHeight: 87, padding: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 15 }}><ShopIcon name="cart" color={theme.border} size={58} /><View style={{ flex: 1, maxWidth: 270 }}><Text style={{ color: theme.ink, fontSize: 18, fontWeight: "700" }}>{isSignedIn ? "Your shopping cart is empty" : "Sign in to see your cart"}</Text><Text style={{ color: theme.steel, fontSize: 14, marginTop: 5 }}>{isSignedIn ? "Add your favourite gear to it." : "Your account keeps your cart in sync."}</Text></View></View>
      {!isSignedIn ? <View style={{ paddingHorizontal: 13, paddingBottom: 13 }}><Button label="Sign in" onPress={() => router.push("/sign-in" as Href)} /></View> : null}
      <Band /><Recommendations />
    </ScrollView></Screen>;
  }

  if (cart.status === "loading") {
    return (
      <Screen title="Your cart">
        <LoadingState what="Loading your cart…" />
      </Screen>
    );
  }

  if (cart.status === "error" && cart.error) {
    return (
      <Screen title="Your cart">
        <ErrorState
          message={cart.error}
          onRetry={cart.refresh}
          retryLabel="Reload the cart"
        />
      </Screen>
    );
  }


  return (
    <Screen
      title="Your cart"
      subtitle={`${cart.count} ${cart.count === 1 ? "item" : "items"} · shared with the website`}
      action={<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button tone="quiet" label="Shop" onPress={() => router.replace("/" as Href)} />
        <Button
          tone="quiet"
          label="Reload cart"
          busy={cart.refreshing}
          onPress={cart.refresh}
        /></View>
      }
    >
      <ScrollView contentContainerStyle={styles.list}>
        {cart.items.map((item) => (
          <View
            key={item.productId}
            style={[styles.line, { borderBottomColor: theme.border }]}
          >
            <View style={styles.lineInfo}>
              <Text style={[styles.name, { color: theme.ink }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: theme.steel }]}>
                {item.sku} · {formatMoney(item.price)} each
              </Text>
              <Text style={[styles.lineTotal, { color: theme.ink }]}>
                {formatMoney(item.price * item.quantity)}
              </Text>
            </View>
            <View style={styles.lineControls}>
              <QuantityStepper
                quantity={item.quantity}
                label={item.name}
                onChange={(delta) =>
                  delta > 0 ? cart.increment(item.productId) : cart.decrement(item.productId)
                }
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name} from your cart`}
                onPress={() => cart.removeItem(item.productId)}
                style={({ pressed }) => [styles.remove, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.removeLabel, { color: theme.signal }]}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.summary}>
          <Text style={[styles.summaryLabel, { color: theme.steel }]}>Subtotal</Text>
          <Text style={[styles.summaryValue, { color: theme.ink }]}>
            {formatMoney(cart.subtotal)}
          </Text>
        </View>
        <Text style={[styles.summaryNote, { color: theme.steel }]}>
          Your order total is confirmed from the store’s prices at checkout.
        </Text>

        <Button
          label="Checkout"
          onPress={() => router.push("/checkout" as Href)}
        />
        <Button tone="quiet" label="Sign out" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 13, gap: 12 },
  line: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineInfo: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13 },
  lineTotal: { fontSize: 15, fontWeight: "700" },
  lineControls: { alignItems: "flex-end", gap: 8 },
  remove: { minHeight: 44, justifyContent: "center" },
  removeLabel: { fontSize: 14, fontWeight: "600" },
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  summaryLabel: { fontSize: 15 },
  summaryValue: { fontSize: 22, fontWeight: "700" },
  summaryNote: { fontSize: 13, lineHeight: 19, marginTop: -8 },
});
