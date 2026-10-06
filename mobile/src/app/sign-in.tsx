import { useAuth, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import * as Linking from "expo-linking";
import { type Href, useRouter, useLocalSearchParams } from "expo-router";
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
import { useBrowse } from "../lib/browse-context.tsx";

/** Native Clerk flow: email-code sign-in, password and email verification at sign-up. */
export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { isSignedIn } = useAuth();
  const { entered } = useBrowse();
  const params = useLocalSearchParams<{ mode?: string }>();

  /**
   * Leaving is idempotent. Two things can finish a sign-in — Clerk's own
   * `navigate` callback and the session becoming active — and doing both would
   * pop this screen and the one behind it.
   */
  const left = useRef(false);

  const [mode, setMode] = useState<"sign-in" | "sign-up">(params.mode === "sign-up" ? "sign-up" : "sign-in");
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
    router.replace("/" as Href);
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
      const { error: attemptError } = await signIn.emailCode.sendCode({
        emailAddress: email.trim(),
      });
      if (attemptError) {
        setError(describeAuthError(attemptError));
        return;
      }
      setCode("");
      setVerifying(true);
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
      const { error: verifyError } = mode === "sign-in"
        ? await signIn.emailCode.verifyCode({ code: code.trim() })
        : await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verifyError) {
        setError(describeAuthError(verifyError));
        return;
      }
      const attempt = mode === "sign-in" ? signIn : signUp;
      if (attempt.status !== "complete") {
        setError("This account requires another verification step. Complete sign-in on the website to continue there.");
        return;
      }
      const { error: finalizeError } = await attempt.finalize();
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
              <Button
                tone="quiet"
                label="Back to email"
                busy={busy}
                onPress={() => {
                  setVerifying(false);
                  setCode("");
                  setError(null);
                }}
              />
            </>
          ) : (
            <>
              <Button tone="quiet" label="Continue with Google" disabled={busy} onPress={() => {
                setBusy(true); setError(null);
                void startSSOFlow({ strategy: "oauth_google", redirectUrl: Linking.createURL("/") }).then(async result => {
                  if (result.createdSessionId && result.setActive) { await result.setActive({ session: result.createdSessionId }); leave(); }
                  else if (result.authSessionResult?.type !== "cancel" && result.authSessionResult?.type !== "dismiss") setError("Google sign-in needs another step. Continue with email to finish creating your account.");
                }).catch(cause => setError(describeAuthError(cause))).finally(() => setBusy(false));
              }} />
              <Text style={{ color: theme.steel, textAlign: "center" }}>or continue with email</Text>
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
              {mode === "sign-up" ? <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                autoComplete="new-password"
              /> : null}

              <Button
                label={mode === "sign-in" ? "Send sign-in code" : "Create account"}
                busy={busy}
                onPress={mode === "sign-in" ? handleSignIn : handleSignUp}
              />

              <Button
                tone="quiet"
                disabled={busy}
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

              <Button tone="quiet" label={entered ? "Back to the shop" : "Back to introduction"} disabled={busy} onPress={() => router.replace((entered ? "/" : "/welcome") as Href)} />
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
