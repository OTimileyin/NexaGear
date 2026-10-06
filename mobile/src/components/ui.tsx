import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme, type Theme } from "../lib/theme.ts";

/**
 * The small set of primitives every screen is built from.
 *
 * Accessibility is built in rather than added per screen: every control is a
 * labelled, keyboard/screen-reader-operable button with a 44pt touch target
 * (WCAG 2.2 AA), and single-character controls like "−" and "+" carry an
 * explicit label, because a screen reader announcing "minus" tells a shopper
 * nothing about *which* line it belongs to.
 */

export function Screen({
  title,
  subtitle,
  action,
  children,
  compact = false,
  bottomSafe = true,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  compact?: boolean;
  bottomSafe?: boolean;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]} edges={bottomSafe ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]}>
      {!compact ? <>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.steel }]}>{subtitle}</Text>
          ) : null}
        </View>
        {action}
      </View>
      </> : null}
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

export function Button({
  label,
  onPress,
  tone = "primary",
  busy = false,
  disabled = false,
  selected,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "quiet";
  busy?: boolean;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const blocked = disabled || busy;
  const background = tone === "primary" ? theme.drafting : "transparent";
  const textColor = tone === "primary" ? "#111111" : theme.scheme === "light" ? theme.signal : theme.drafting;

  return (
    <Pressable
      accessibilityRole={selected === undefined ? "button" : "radio"}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy, checked: selected }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: tone === "primary" ? background : theme.border,
          opacity: blocked ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function QuantityStepper({
  quantity,
  label,
  onChange,
}: {
  quantity: number;
  label: string;
  onChange: (delta: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.stepper, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease quantity of ${label}`}
        onPress={() => onChange(-1)}
        style={({ pressed }) => [styles.stepperButton, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.stepperGlyph, { color: theme.ink }]}>−</Text>
      </Pressable>
      <Text
        accessibilityLabel={`Quantity ${quantity} for ${label}`}
        style={[styles.stepperValue, { color: theme.ink }]}
      >
        {quantity}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase quantity of ${label}`}
        onPress={() => onChange(1)}
        style={({ pressed }) => [styles.stepperButton, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.stepperGlyph, { color: theme.ink }]}>+</Text>
      </Pressable>
    </View>
  );
}

export function StatusDot({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.dotRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.dotLabel, { color: theme.steel }]}>{label}</Text>
    </View>
  );
}

/** What to show while a fetch is in flight. Never an empty screen. */
export function LoadingState({ what }: { what: string }) {
  const theme = useTheme();
  return (
    <View style={styles.centre}>
      <ActivityIndicator color={theme.drafting} />
      <Text style={[styles.centreText, { color: theme.steel }]}>{what}</Text>
    </View>
  );
}

/**
 * What to show when a fetch failed.
 *
 * It states what happened, and gives the action that fixes it. It does not say
 * "something went wrong", and it does not blame the shopper.
 */
export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.centre}>
      <Text style={[styles.stateTitle, { color: theme.ink }]}>
        That didn’t load
      </Text>
      <Text style={[styles.centreText, { color: theme.steel }]}>{message}</Text>
      {onRetry ? <Button label={retryLabel} onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.centre}>
      <Text style={[styles.stateTitle, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.centreText, { color: theme.steel }]}>{body}</Text>
      {action}
    </View>
  );
}

export function themeColor(theme: Theme, token: "stock" | "signal" | "steel"): string {
  return theme[token];
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 13,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flexShrink: 1 },
  title: { fontSize: 19, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: 2 },
  body: { flex: 1 },
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: { fontSize: 15, fontWeight: "600" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  stepperButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  stepperGlyph: { fontSize: 20, lineHeight: 22 },
  stepperValue: { minWidth: 28, textAlign: "center", fontSize: 16, fontWeight: "600" },
  dotRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLabel: { fontSize: 13 },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  centreText: { fontSize: 15, textAlign: "center", lineHeight: 21 },
  stateTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
});
