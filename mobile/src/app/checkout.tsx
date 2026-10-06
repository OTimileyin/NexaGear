import { useAuth, useUser } from "@clerk/expo";
import { useLocalSearchParams, type Href, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Button, EmptyState, LoadingState, Screen } from "../components/ui.tsx";
import { useCart } from "../cart/cart-context.tsx";
import { checkoutRequest } from "../lib/checkout-api.ts";
import { formatMoney } from "../lib/format.ts";
import { useTheme } from "../lib/theme.ts";
import { useSupabase } from "../lib/supabase-context.tsx";

WebBrowser.maybeCompleteAuthSession();
interface Attempt { clientRef: string; orderId?: string; authorizationUrl?: string; amount?: number }
export default function CheckoutScreen() {
  const theme = useTheme();
  const cart = useCart();
  const supabase = useSupabase();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const { reference } = useLocalSearchParams<{ reference?: string }>();
  const [name, setName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [ready, setReady] = useState(false);
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const snapshot = useRef<{ productId: string; quantity: number }[] | null>(null);
  const working = useRef(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const storageKey = `nexagear.checkout.${userId}`;

  async function save(value: Attempt) {
    if (Platform.OS === "web") window.localStorage.setItem(storageKey, JSON.stringify(value));
    else await SecureStore.setItemAsync(storageKey, JSON.stringify(value));
    setAttempt(value);
  }
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const raw = Platform.OS === "web" ? window.localStorage.getItem(storageKey) : await SecureStore.getItemAsync(storageKey);
        const saved: unknown = raw ? JSON.parse(raw) : null;
        if (active && saved && typeof saved === "object" && "clientRef" in saved && typeof saved.clientRef === "string") {
          setAttempt({ clientRef: saved.clientRef, ...("orderId" in saved && typeof saved.orderId === "string" ? { orderId: saved.orderId } : {}), ...("authorizationUrl" in saved && typeof saved.authorizationUrl === "string" ? { authorizationUrl: saved.authorizationUrl } : {}), ...("amount" in saved && typeof saved.amount === "number" ? { amount: saved.amount } : {}) });
          if ("amount" in saved && typeof saved.amount === "number") setAmount(saved.amount);
        }
      } catch { if (active) { setRecoveryBlocked(true); setError("Your saved checkout could not be loaded. Close and reopen checkout before placing another order."); } }
      finally { if (active) setReady(true); }
    }
    void load();
    return () => { active = false; };
  }, [storageKey]);

  async function verify(orderId: string) {
    const result = await checkoutRequest(`payment/verify?reference=${encodeURIComponent(orderId)}`, await getToken());
    if (result.ok !== true) {
      setError("Payment is not confirmed yet. If you completed payment, tap Check payment again. You can also retry payment for this saved order.");
      return;
    }
    setPaid(true);
    setError(null);
    // Preserve items added on another device while payment was in progress.
    const current = cartRef.current;
    if (snapshot.current && supabase && userId) {
      for (const item of snapshot.current) {
        // Conditional deletion preserves a quantity changed on another device.
        await supabase.from("cart_items").delete().eq("user_id", userId).eq("product_id", item.productId).eq("quantity", item.quantity);
      }
      current.refresh();
    }
    if (Platform.OS === "web") window.localStorage.removeItem(storageKey);
    else await SecureStore.deleteItemAsync(storageKey);
  }
  useEffect(() => {
    if (!ready || !reference || working.current) return;
    working.current = true;
    setBusy(true);
    void verify(reference).catch(cause => setError(cause instanceof Error ? cause.message : "Payment could not be checked. Retry.")).finally(() => { working.current = false; setBusy(false); });
    // Deep-link references are hints only; the authenticated server verifies ownership and payment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, ready]);

  async function pay() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    try {
      let saved = attempt;
      if (!saved?.orderId) {
        if (!name.trim() || !phone.trim() || !address.trim()) throw new Error("Enter your name, phone number and delivery address.");
        if (cart.status !== "ready" || cart.items.length === 0) throw new Error("Reload your cart before checking out.");
        saved = saved ?? { clientRef: Crypto.randomUUID() };
        await save(saved); // Persist the idempotency key before a request can create an order.
        const items = cart.items.map(item => ({ productId: item.productId, quantity: item.quantity }));
        snapshot.current = items;
        const placed = await checkoutRequest("checkout", await getToken(), { clientRef: saved.clientRef, fields: { customerName: name, phone, shippingAddress: address }, items });
        if (placed.ok !== true || typeof placed.orderId !== "string") throw new Error(typeof placed.message === "string" ? placed.message : "The order could not be saved. Retry.");
        saved = { ...saved, orderId: placed.orderId };
        setAttempt(saved);
        await save(saved);
      }
      const orderId = saved.orderId;
      if (!orderId) throw new Error("No saved order was returned. Retry checkout.");
      const returnUrl = Linking.createURL("checkout");
      const payment = saved.authorizationUrl
        ? { ok: true, authorizationUrl: saved.authorizationUrl, amount: saved.amount }
        : await checkoutRequest("payment", await getToken(), { orderId, returnUrl });
      if (payment.ok !== true || typeof payment.authorizationUrl !== "string") throw new Error(typeof payment.message === "string" ? payment.message : "Payment could not start. Your order is saved; retry payment.");
      const paymentUrl = new URL(payment.authorizationUrl);
      if (paymentUrl.protocol !== "https:" || paymentUrl.hostname !== "checkout.paystack.com") throw new Error("The payment provider returned an invalid payment address. Retry payment.");
      if (typeof payment.amount === "number") setAmount(payment.amount);
      await save({ ...saved, authorizationUrl: payment.authorizationUrl, ...(typeof payment.amount === "number" ? { amount: payment.amount } : {}) });
      await WebBrowser.openAuthSessionAsync(payment.authorizationUrl, returnUrl);
      await verify(orderId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout could not continue. Check your connection and retry."); }
    finally { working.current = false; setBusy(false); }
  }

  if (!ready || cart.status === "loading") return <Screen title="Checkout"><LoadingState what="Loading checkout…" /></Screen>;
  if (recoveryBlocked) return <Screen title="Checkout"><EmptyState title="Checkout could not be restored" body={error ?? "Close and reopen checkout to retry."} action={<Button label="Back to cart" onPress={() => router.replace("/cart" as Href)} />} /></Screen>;
  if (!attempt?.orderId && cart.items.length === 0 && !paid) return <Screen title="Checkout"><EmptyState title="Your cart is empty" body="Add something from the shop before checking out." action={<Button label="Browse the shop" onPress={() => router.replace("/" as Href)} />} /></Screen>;
  return <Screen title={paid ? "Payment confirmed" : "Checkout"} subtitle={paid ? "Your order has been paid." : "Delivery details and secure Paystack payment"} action={<Button tone="quiet" label="Back" disabled={busy} onPress={() => router.replace("/cart" as Href)} />}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
        {error ? <Text accessibilityRole="alert" style={{ color: theme.signal, fontSize: 16, lineHeight: 24 }}>{error}</Text> : null}
        {paid ? <>
          <Text style={{ color: theme.ink, fontSize: 18 }}>Order: {reference ?? attempt?.orderId}</Text>
          <Button label="Continue shopping" onPress={() => router.replace("/" as Href)} />
        </> : <>
          {attempt?.orderId ? <Text style={{ color: theme.steel }}>Your order is saved. Retry or check payment without placing another order.</Text> : <>
            {([{ label: "Full name", value: name, change: setName, maxLength: 120 }, { label: "Phone number", value: phone, change: setPhone, maxLength: 32 }, { label: "Delivery address", value: address, change: setAddress, maxLength: 400 }] as const).map(field => <View key={field.label} style={{ gap: 8 }}>
              <Text style={{ color: theme.steel, fontSize: 15 }}>{field.label}</Text>
              <TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.change} maxLength={field.maxLength} editable={!busy} multiline={field.label === "Delivery address"} keyboardType={field.label === "Phone number" ? "phone-pad" : "default"} style={{ color: theme.ink, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 17, minHeight: 48 }} />
            </View>)}
          </>}
          <Text style={{ color: theme.ink, fontSize: 24, fontWeight: "600" }}>{amount !== null ? `Order total: ${formatMoney(amount)}` : attempt?.orderId ? "Your saved order total is confirmed by Paystack." : `Cart subtotal: ${formatMoney(cart.subtotal)}`}</Text>
          <Text style={{ color: theme.steel, lineHeight: 23 }}>Test payments only. Your order total is calculated from the store’s prices before payment. Paystack opens a secure payment screen and returns you here.</Text>
          <Button label={attempt?.orderId ? "Retry Paystack payment" : "Continue to Paystack"} busy={busy} onPress={() => void pay()} />
          {attempt?.orderId ? <Button tone="quiet" label="Check payment" busy={busy} onPress={() => {
            if (working.current) return;
            working.current = true; setBusy(true); setError(null);
            void verify(attempt.orderId!).catch(cause => setError(cause instanceof Error ? cause.message : "Payment could not be checked. Retry.")).finally(() => { working.current = false; setBusy(false); });
          }} /> : null}
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}
