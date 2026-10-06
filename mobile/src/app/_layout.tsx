import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CartProvider } from "../cart/cart-context.tsx";
import { missingEnvNames, readEnv } from "../lib/env.ts";
import { createSupabaseClient } from "../lib/supabase.ts";
import { SupabaseProvider, unconfiguredMessage } from "../lib/supabase-context.tsx";
import { ErrorState, Screen } from "../components/ui.tsx";
import { LoadingState } from "../components/ui.tsx";
import { ThemeProvider, useAppearance, useTheme } from "../lib/theme.ts";
import { BrowseProvider, useBrowse } from "../lib/browse-context.tsx";
import { CatalogProvider } from "../lib/catalog-context.tsx";

const env = readEnv();
const missing = missingEnvNames(env);

export default function RootLayout() {
  // Ahead of every hook, because there is nothing to sign in to and nothing to
  // load without keys. The message names the exact variables and the file to
  // put them in, which is the only actionable thing to say.
  if (missing.length > 0) {
    return (
      <SafeAreaProvider>
        <Screen title="NexaGear" subtitle="This build cannot reach the shop">
          <ErrorState message={unconfiguredMessage()} />
        </Screen>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider><ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
        <BrowseProvider><AppShell /></BrowseProvider>
      </ClerkProvider></ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Everything that needs a Clerk session, which is everything that talks to
 * Supabase.
 *
 * The token getter is held in a ref so the client can be built exactly once:
 * `getToken`'s identity changes across Clerk renders, and putting it in the
 * dependency list would build a new Supabase client (and a new realtime socket)
 * on every render, which is how a subscription ends up silently torn down and
 * re-created mid-session.
 */
function AppShell() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const theme = useTheme();
  const { ready } = useAppearance();
  const { entered } = useBrowse();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const client = useMemo(
    () => createSupabaseClient(() => getTokenRef.current()),
    [],
  );

  if (!isLoaded || !ready) return <Screen title="NexaGear"><LoadingState what="Opening NexaGear…" /></Screen>;
  if (!client) {
    return (
      <Screen title="NexaGear" subtitle="This build cannot reach the shop">
        <ErrorState message={unconfiguredMessage()} />
      </Screen>
    );
  }

  return (
    <SupabaseProvider client={client}>
      <CartProvider client={client}>
        <CatalogProvider>
        <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.paper } }}>
          <Stack.Protected guard={!isSignedIn}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
          <Stack.Protected guard={!!isSignedIn || entered}>
            <Stack.Screen name="(shop)" />
            <Stack.Screen name="product" />
          </Stack.Protected>
          <Stack.Protected guard={!!isSignedIn}>
            <Stack.Screen name="checkout" />
            <Stack.Screen name="orders" />
          </Stack.Protected>
          <Stack.Screen name="settings" />
          <Stack.Screen name="privacy" />
        </Stack>
        </CatalogProvider>
      </CartProvider>
    </SupabaseProvider>
  );
}
