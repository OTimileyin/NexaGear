import { useAuth, useUser } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTheme } from "../../lib/theme.ts";
import { useCart } from "../../cart/cart-context.tsx";
import { Screen, Button } from "../../components/ui.tsx";
import { Band, BenefitsStrip, SettingsRow, ShopIcon, type ShopIconName } from "../../components/shopping.tsx";
import { Recommendations } from "../../components/Recommendations.tsx";
export default function AccountScreen() {
  const theme = useTheme(); const router = useRouter(); const cart = useCart(); const { user } = useUser(); const { isSignedIn } = useAuth(); const name = user?.fullName ?? user?.username ?? "Your account";
  return <Screen title="You" compact bottomSafe={false}><ScrollView contentContainerStyle={{ paddingBottom: 20, width: "100%", maxWidth: 1000, alignSelf: "center" }}>
    <View style={{ paddingHorizontal: 13, marginTop: 25, minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 38, height: 38, backgroundColor: theme.surface, borderRadius: 19, alignItems: "center", justifyContent: "center" }}><Text style={{ color: theme.ink, fontSize: 22 }}>{name[0]?.toUpperCase()}</Text></View><Text numberOfLines={1} style={{ flex: 1, minWidth: 0, color: theme.ink, fontSize: 24, fontWeight: "700" }}>{name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings" as Href)} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}><ShopIcon name="settings" color={theme.ink} /></Pressable></View>
    {!isSignedIn ? <View style={{ paddingHorizontal: 13, paddingVertical: 8 }}><Button label="Sign in or create an account" onPress={() => router.push("/sign-in" as Href)} /></View> : null}
    <View style={{ flexDirection: "row", height: 67, alignItems: "center" }}>{[{ value: isSignedIn ? `${cart.count}` : "Sign in", label: "Cart items" }, { value: "NGN", label: "Shopping currency" }].map((item, i) => <View key={item.label} style={{ flex: 1, alignItems: "center", gap: 5, borderLeftWidth: i ? 1 : 0, borderColor: theme.border }}><Text style={{ color: theme.ink, fontSize: 18, fontWeight: "700" }}>{item.value}</Text><Text style={{ color: theme.ink, fontSize: 14 }}>{item.label}</Text></View>)}</View>
    <Band /><SettingsRow label="Your orders" icon="orders" onPress={() => router.push((isSignedIn ? "/orders" : "/sign-in") as Href)} /><SettingsRow label="Your cart" icon="cart" onPress={() => router.push("/cart" as Href)} /><SettingsRow label="Privacy & policies" icon="shield" onPress={() => router.push("/privacy" as Href)} />
    <Band /><View style={{ height: 70, flexDirection: "row" }}>{([{ label: "Shop", icon: "home", path: "/" }, { label: "Categories", icon: "categories", path: "/categories" }, { label: "Orders", icon: "orders", path: isSignedIn ? "/orders" : "/sign-in" }, { label: "Appearance", icon: "sun", path: "/settings" }] as { label: string; icon: ShopIconName; path: string }[]).map(item => <Pressable key={item.label} accessibilityRole="button" onPress={() => router.push(item.path as Href)} style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 5 }}><ShopIcon name={item.icon} color={theme.ink} size={22} /><Text style={{ color: theme.ink, fontSize: 12 }}>{item.label}</Text></Pressable>)}</View><BenefitsStrip /><Recommendations />
  </ScrollView></Screen>;
}
