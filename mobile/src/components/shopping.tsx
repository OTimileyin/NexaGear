import { Image, Pressable, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTheme } from "../lib/theme.ts";
import { shoppingIcons } from "./shopping-icons.ts";

export const shopping = { padding: 13, gap: 6, separator: 7, row: 51, nav: 54, peach: "#fff0e2", green: "#078a00" };
const paths = {
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  categories: '<circle cx="9" cy="9" r="6"/><path d="m14 14 7 7M18 3h4M18 7h4M3 20h7"/>',
  account: '<circle cx="12" cy="7" r="4"/><path d="M3 22v-3a9 9 0 0 1 18 0v3z"/>',
  cart: '<path d="M2 3h3l3 13h11l3-10H6M14 8v6M11 11h6"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  back: '<path d="m15 3-9 9 9 9"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z"/><path d="m7 12 3 3 7-7"/>',
  settings: '<path d="m12 2 9 5v10l-9 5-9-5V7z"/><circle cx="12" cy="12" r="4"/>',
  orders: '<rect x="4" y="3" width="16" height="19" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  check: '<path d="m4 12 5 5L21 5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
} as const;
export type ShopIconName = keyof typeof paths;
/** Shared SVG paths rendered by the platform Image API; no additional native module. */
export function ShopIcon({ name, color, size = 23 }: { name: ShopIconName; color: string; size?: number }) {
  return <Image accessible={false} source={shoppingIcons[name]} style={{ width: size, height: size, tintColor: color }} />;
}
export function SearchHeader({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  return <View style={{ marginHorizontal: shopping.padding, marginTop: 10, marginBottom: 10, height: 40, borderWidth: 1.5, borderColor: theme.ink, borderRadius: 24, flexDirection: "row", alignItems: "center", paddingLeft: 13, paddingRight: 3 }}>
    <TextInput accessibilityLabel="Search products" placeholder="Search NexaGear" placeholderTextColor={theme.steel} value={value} onChangeText={onChange} autoCorrect={false} returnKeyType="search" style={{ flex: 1, minWidth: 0, height: 38, color: theme.ink, fontSize: 16 }} />
    <Pressable accessibilityRole="button" accessibilityLabel="Search catalogue" onPress={() => onChange(value.trim())} hitSlop={5} style={{ width: 48, height: 34, borderRadius: 20, backgroundColor: theme.ink, justifyContent: "center", alignItems: "center" }}><ShopIcon name="search" color={theme.paper} size={22} /></Pressable>
  </View>;
}
export function Band() { const theme = useTheme(); return <View style={{ height: shopping.separator, backgroundColor: theme.surface }} />; }
export function BenefitsStrip({ panel = false }: { panel?: boolean }) {
  const theme = useTheme();
  return <View style={{ marginHorizontal: panel ? 13 : 0, height: panel ? 59 : 38, borderRadius: panel ? 7 : 0, backgroundColor: theme.scheme === "light" ? shopping.peach : theme.surface, flexDirection: "row", alignItems: "center" }}>
    {[{ title: "Shared cart", detail: "Phone & website" }, { title: "NGN checkout", detail: "Powered by Paystack" }].map((item, i) => <View key={item.title} style={{ flex: 1, paddingHorizontal: 10, borderLeftWidth: i ? 1 : 0, borderColor: theme.border, gap: 4 }}><View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}><ShopIcon name="check" color={theme.stock} size={18} /><Text numberOfLines={1} style={{ color: theme.ink, fontSize: panel ? 15 : 13 }}>{item.title}</Text></View>{panel ? <Text style={{ color: theme.steel, fontSize: 12 }}>{item.detail}</Text> : null}</View>)}
  </View>;
}
export function TopBar({ title }: { title: string }) {
  const theme = useTheme(); const router = useRouter();
  return <View style={{ height: 49, borderBottomWidth: 1, borderColor: theme.border, justifyContent: "center", alignItems: "center" }}><Text accessibilityRole="header" style={{ color: theme.ink, fontSize: 19, fontWeight: "700" }}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/" as Href)} style={{ position: "absolute", left: 3, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><ShopIcon name="back" color={theme.ink} size={22} /></Pressable></View>;
}
export function SettingsRow({ label, value, onPress, icon }: { label: string; value?: string; onPress?: () => void; icon?: ShopIconName }) {
  const theme = useTheme();
  const content = <><View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>{icon ? <ShopIcon name={icon} color={theme.ink} size={20} /> : null}<Text style={{ color: theme.ink, fontSize: 17, fontWeight: "500", flexShrink: 1 }}>{label}</Text></View>{value ? <Text style={{ color: theme.steel, fontSize: 15 }}>{value}</Text> : null}{onPress ? <ShopIcon name="chevron" color={theme.steel} size={13} /> : null}</>;
  const style = { minHeight: shopping.row, paddingHorizontal: shopping.padding, borderBottomWidth: 1, borderColor: theme.border, flexDirection: "row" as const, alignItems: "center" as const, gap: 9 };
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [style, { backgroundColor: pressed ? theme.surface : theme.paper }]}>{content}</Pressable> : <View style={style}>{content}</View>;
}
