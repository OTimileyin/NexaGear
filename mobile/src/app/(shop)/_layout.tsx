import { Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../lib/theme.ts";
import { useCart } from "../../cart/cart-context.tsx";
import { ShopIcon, type ShopIconName } from "../../components/shopping.tsx";
export default function ShopTabs() {
  const theme = useTheme(); const cart = useCart(); const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false }} tabBar={({ state, navigation }) => {
    if (state.routes[state.index].name === "cart") return null;
    return <View style={{ backgroundColor: theme.paper, borderTopWidth: 1, borderColor: theme.border, height: 54 + insets.bottom, paddingBottom: insets.bottom, flexDirection: "row" }}>
      {state.routes.map((route, index) => { const selected = state.index === index; const label = route.name === "index" ? "Home" : route.name === "categories" ? "Categories" : route.name === "account" ? "You" : "Cart"; const icon: ShopIconName = route.name === "index" ? "home" : route.name === "categories" ? "categories" : route.name === "account" ? "account" : "cart"; const color = selected ? theme.drafting : theme.ink;
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => { const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true }); if (!event.defaultPrevented) navigation.navigate(route.name); }} style={({ pressed }) => ({ width: "20%", height: 53, alignItems: "center", justifyContent: "center", gap: 3, opacity: pressed ? 0.65 : 1 })}><ShopIcon name={icon} color={color} size={23} /><Text style={{ color, fontSize: 10, lineHeight: 12 }}>{label}{route.name === "cart" && cart.count ? ` (${cart.count})` : ""}</Text></Pressable>;
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="Read NexaGear shopping policies" onPress={() => navigation.getParent()?.navigate("privacy")} style={{ width: "20%", justifyContent: "center", alignItems: "center", gap: 3 }}><Text style={{ color: theme.stock, fontSize: 9 }}>NexaGear</Text><View style={{ backgroundColor: theme.stock, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: "white", fontSize: 10 }}>Shop info</Text></View></Pressable>
    </View>;
  }}>
    <Tabs.Screen name="index" options={{ title: "Home" }} />
    <Tabs.Screen name="categories" options={{ title: "Categories" }} />
    <Tabs.Screen name="account" options={{ title: "You" }} />
    <Tabs.Screen name="cart" options={{ title: "Cart" }} />
  </Tabs>;
}
