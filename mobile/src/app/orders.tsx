import { useAuth } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSupabase } from "../lib/supabase-context.tsx";
import { useTheme } from "../lib/theme.ts";
import { formatMoney } from "../lib/format.ts";
import { Screen, Button, EmptyState, ErrorState, LoadingState } from "../components/ui.tsx";
interface Order { id: string; subtotal: number | string; created_at: string; status: string; payment_status: string }
export default function OrdersScreen() {
  const client = useSupabase(); const { userId } = useAuth(); const theme = useTheme(); const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]); const [status, setStatus] = useState<"loading" | "ready" | "error">("loading"); const [error, setError] = useState("");
  const load = useCallback(async () => {
    setStatus("loading");
    try {
      if (!client || !userId) throw new Error("Sign in to load your orders.");
      const { data, error } = await client.from("orders").select("id,subtotal,created_at,status,payment_status").eq("user_id", userId).eq("is_sample", false).order("created_at", { ascending: false });
      if (error) throw error; setOrders((data ?? []) as Order[]); setStatus("ready");
    } catch { setError("Your orders could not load. Check your connection and retry."); setStatus("error"); }
  }, [client, userId]);
  useEffect(() => { void load(); }, [load]);
  return <Screen title="Your orders" action={<Button tone="quiet" label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/account" as Href)} />}>
    {status === "loading" ? <LoadingState what="Loading your orders…" /> : status === "error" ? <ErrorState message={error} onRetry={() => void load()} /> : !orders.length ? <EmptyState title="No orders yet" body="Your orders will appear here after you check out." action={<Button label="Browse the shop" onPress={() => router.replace("/" as Href)} />} /> : <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>{orders.map(order => <View key={order.id} style={{ borderColor: theme.border, borderWidth: 1, borderRadius: 16, padding: 18, gap: 8 }}><Text style={{ color: theme.ink, fontWeight: "700", fontSize: 18 }}>Order {order.id.slice(0, 8)}</Text><Text style={{ color: theme.steel }}>{new Date(order.created_at).toLocaleDateString()}</Text><Text style={{ color: theme.drafting, fontSize: 20, fontWeight: "700" }}>{formatMoney(Number(order.subtotal))}</Text><Text style={{ color: theme.ink }}>Payment: {order.payment_status.replaceAll("_", " ")}</Text><Text style={{ color: theme.steel }}>Order status: {order.status}</Text></View>)}</ScrollView>}
  </Screen>;
}
