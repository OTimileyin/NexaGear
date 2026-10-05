import { useAuth, useSignIn, useSignUp } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button, Screen } from "../components/ui.tsx";
import { describeAuthError } from "../lib/clerk-errors.ts";
import { useTheme } from "../lib/theme.ts";

/**
 * Sign-in and sign-up, built from Clerk's hooks rather than a hosted page.
 *
 * This is the "custom flow" approach, and the reason is the demo: email +
 * password needs **no redirect URI, no browser session and no OAuth client
 * registration**, so the same credentials work on the website and the phone
 * with nothing configured in between. Hosted authentication would send the
 * shopper to a browser and back through a deep link, which is the classic way
 * an evening disappears.
 *
 * The instance requires a username at sign-up, so the sign-up form asks for one
 * — a form that omits it would fail with a server-side complaint the shopper
 * cannot act on.
 */
export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { isSignedIn } = useAuth();

  /**
   * Leaving is idempotent. Two things can finish a sign-in — Clerk's own
   * `navigate` callback and the session becoming active — and doing both would
   * pop this screen and the one behind it.
   */
  const left = useRef(false);

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [verifying, setVerifying] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function leave() {
    if (left.current) return;
    left.current = true;
    if (router.canGoBack()) router.back();
    else router.replace("/" as Href);
  }

  // A sign-in that completes without Clerk asking for a redirect still has to
  // leave this screen.
  useEffect(() => {
    if (isSignedIn) leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      const { error: attemptError } = await signIn.password({
        emailAddress: email.trim(),
        password,
      });
      if (attemptError) {
        setError(describeAuthError(attemptError));
        return;
      }
      if (signIn.status !== "complete") {
        // Honest about the limit rather than spinning: this app does not
        // implement second factors, and the website does.
        setError(
          `This account needs another step before it can sign in here (${signIn.status}). Sign in on the website, which supports it, or ask for the account details to be simplified.`,
        );
        return;
      }
      const { error: finalizeError } = await signIn.finalize({
        navigate: () => leave(),
      });
      if (finalizeError) {
        setError(describeAuthError(finalizeError));
        return;
      }
      leave();
      return;
    } catch (cause) {
      setError(describeAuthError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    setBusy(true);
    setError(null);
    try {
      const { error: createError } = await signUp.password({
        emailAddress: email.trim(),
        password,
        username: username.trim(),
      });
      if (createError) {
        setError(describeAuthError(createError));
        return;
      }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setError(describeAuthError(sendError));
        return;
      }
      setVerifying(true);
    } catch (cause) {
      setError(describeAuthError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({
        code: code.trim(),
      });
      if (verifyError) {
        setError(describeAuthError(verifyError));
        return;
      }
      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) {
        setError(describeAuthError(finalizeError));
        return;
      }
      leave();
    } catch (cause) {
      setError(describeAuthError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      title={verifying ? "Check your email" : mode === "sign-in" ? "Sign in" : "Create an account"}
      subtitle={
        verifying
          ? `We sent a code to ${email.trim()}. Enter it to finish.`
          : "One account for the app and the website."
      }
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {error ? (
            <View
              accessibilityRole="alert"
              style={[styles.error, { borderColor: theme.signal }]}
            >
              <Text style={[styles.errorText, { color: theme.ink }]}>{error}</Text>
            </View>
          ) : null}

          {verifying ? (
            <>
              <Field
                label="Verification code"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="numeric"
                autoComplete="one-time-code"
              />
              <Button label="Verify and finish" onPress={handleVerify} busy={busy} />
            </>
          ) : (
            <>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
              />
              {mode === "sign-up" ? (
                <Field
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="yourname"
                  autoComplete="username-new"
                />
              ) : null}
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              />

              <Button
                label={mode === "sign-in" ? "Sign in" : "Create account"}
                busy={busy}
                onPress={mode === "sign-in" ? handleSignIn : handleSignUp}
              />

              <Button
                tone="quiet"
                label={
                  mode === "sign-in"
                    ? "New here? Create an account"
                    : "Already have an account? Sign in"
                }
                onPress={() => {
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                  setError(null);
                }}
              />

              {/* Required for sign-up on the web build; Clerk skips the browser
                  CAPTCHA on iOS and Android. */}
              <View nativeID="clerk-captcha" />

              <Button tone="quiet" label="Back to the shop" onPress={leave} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  ...input
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  autoComplete?: "email" | "username-new" | "current-password" | "new-password" | "one-time-code";
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.steel }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={theme.steel}
        style={[
          styles.input,
          { borderColor: theme.border, color: theme.ink, backgroundColor: theme.surface },
        ]}
        {...input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  form: { padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600" },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: { borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { fontSize: 14, lineHeight: 20 },
});
