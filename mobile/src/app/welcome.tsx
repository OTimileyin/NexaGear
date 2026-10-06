import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";
import { Button, Screen } from "../components/ui.tsx";
import { useTheme } from "../lib/theme.ts";
import { useBrowse } from "../lib/browse-context.tsx";

export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { enter, entered } = useBrowse();
  useEffect(() => { if (entered) router.replace("/" as Href); }, [entered, router]);
  const progress = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    const finish = () => { progress.stopAnimation(); progress.setValue(1); if (active) setDone(true); };
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduced) => { if (reduced) finish(); });
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      if (reduced) { finish(); return; }
      Animated.timing(progress, { toValue: 1, duration: 1800, useNativeDriver: true }).start(({ finished }) => { if (active && finished) setDone(true); });
    }).catch(finish);
    return () => { active = false; progress.stopAnimation(); subscription.remove(); };
  }, [progress]);
  return (
    <Screen title="NexaGear" action={<Button tone="quiet" label="Settings" onPress={() => router.push("/settings" as Href)} />}>
      <View style={styles.stage}>
        <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.mark, { backgroundColor: theme.drafting, opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "0deg"] }) }] }]}>
          <View style={[styles.bar, { backgroundColor: theme.paper, left: 28 }]} />
          <View style={[styles.diagonal, { backgroundColor: theme.paper }]} />
          <View style={[styles.bar, { backgroundColor: theme.paper, right: 28 }]} />
        </Animated.View>
        <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }]}>Make room for your next idea.</Text>
          <Text style={[styles.body, { color: theme.steel }]}>Gear for your workspace. Tools for what comes next.</Text>
        </Animated.View>
      </View>
      <View style={styles.actions}>
        {done ? <>
          <Button label="Sign in" onPress={() => router.push("/sign-in" as Href)} />
          <Button tone="quiet" label="Create an account" onPress={() => router.push("/sign-in?mode=sign-up" as Href)} />
          <Button tone="quiet" label="Browse the shop" onPress={enter} />
        </> : <Button tone="quiet" label="Skip introduction" onPress={() => { progress.stopAnimation(); progress.setValue(1); setDone(true); }} />}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  stage: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, gap: 32 },
  mark: { width: 120, height: 120, borderRadius: 32 },
  bar: { position: "absolute", width: 12, height: 64, top: 28, borderRadius: 6 },
  diagonal: { position: "absolute", width: 12, height: 78, left: 54, top: 21, borderRadius: 6, transform: [{ rotate: "-38deg" }] },
  title: { fontSize: 36, lineHeight: 42, fontWeight: "700", textAlign: "center", maxWidth: 360 },
  body: { fontSize: 17, lineHeight: 25, textAlign: "center", marginTop: 18, maxWidth: 360 },
  actions: { padding: 24, gap: 12, minHeight: 148 },
});
