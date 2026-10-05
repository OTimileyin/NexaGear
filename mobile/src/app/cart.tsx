import { useAuth, useClerk } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useCart } from "../cart/cart-context.tsx";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  QuantityStepper,
  Screen,
} from "../components/ui.tsx";
import { formatMoney } from "../lib/format.ts";
import { SHOP_URL } from "../lib/site.ts";
import { useTheme } from "../lib/theme.ts";

/**
 * The cart.
 *
 * This screen shows the *account's* cart, not a copy of it: the same rows the
 * website reads, streamed live. That is why it is empty while signed out —
 * there is nothing to show — and why the copy says so instead of implying the
 * cart was lost.
 *
 * Checkout stays on the website. `create_order` and the payment path live
 * there (PRD §13), and a phone that claimed to take payment without them would
 * be a lie; the button that opens the site is the honest version of that step.
 */
export default function CartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const cart = useCart();

  if (!isSignedIn) {
    return (
      <Screen title="Your cart" subtitle="The cart belongs to your account">
        <EmptyState
          title="Sign in to see your cart"
          body="Your cart is shared with the website, so it needs an account. Sign in and anything you have added on nexagear.vercel.app appears here."
          action={
            <Button label="Sign in" onPress={() => router.push("/sign-in" as Href)} />
          }
        />
      </Screen>
    );
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

  if (cart.items.length === 0) {
    return (
      <Screen title="Your cart" subtitle="Shared with the website">
        <EmptyState
          title="Nothing in your cart yet"
          body="Add something from the shop on this phone, or from the website — the same cart shows up in both."
          action={
            <Button label="Browse the shop" onPress={() => router.replace("/" as Href)} />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Your cart"
      subtitle={`${cart.count} ${cart.count === 1 ? "item" : "items"} · shared with the website`}
      action={
        <Button
          tone="quiet"
          label="Reload cart"
          busy={cart.refreshing}
          onPress={cart.refresh}
        />
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
          The website prices every order from the database again at checkout, so this
          total is for reference.
        </Text>

        <Button
          label="Checkout on the website"
          onPress={() => {
            void Linking.openURL(`${SHOP_URL}/cart`);
          }}
        />
        <Button tone="quiet" label="Sign out" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 16 },
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
