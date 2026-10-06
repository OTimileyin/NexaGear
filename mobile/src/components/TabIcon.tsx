import { View, type ColorValue } from "react-native";
export function TabIcon({ kind, color }: { kind: "home" | "categories" | "account" | "cart"; color: ColorValue }) {
  const border = { borderColor: color, borderWidth: 2 };
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 28, height: 28 }}>
    {kind === "home" ? <><View style={{ ...border, width: 17, height: 17, position: "absolute", left: 5, top: 4, transform: [{ rotate: "45deg" }], borderBottomWidth: 0, borderRightWidth: 0 }} /><View style={{ ...border, position: "absolute", width: 18, height: 15, left: 5, top: 12, borderTopWidth: 0, borderRadius: 3 }} /></> : null}
    {kind === "categories" ? [0, 1, 2, 3].map(i => <View key={i} style={{ ...border, width: 10, height: 10, borderRadius: 3, position: "absolute", left: i % 2 * 14, top: Math.floor(i / 2) * 14 + 2 }} />) : null}
    {kind === "account" ? <><View style={{ ...border, width: 10, height: 10, borderRadius: 8, left: 9, top: 2 }} /><View style={{ ...border, width: 24, height: 12, borderTopLeftRadius: 14, borderTopRightRadius: 14, left: 2, top: 5 }} /></> : null}
    {kind === "cart" ? <><View style={{ ...border, width: 21, height: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, left: 4, top: 4 }} />{[7, 20].map(left => <View key={left} style={{ backgroundColor: color, width: 4, height: 4, borderRadius: 4, position: "absolute", left, top: 23 }} />)}</> : null}
  </View>;
}
