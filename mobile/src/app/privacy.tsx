import { ScrollView, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";
import { Screen, Button } from "../components/ui.tsx";
import { useTheme } from "../lib/theme.ts";
export default function PrivacyScreen() {
  const theme = useTheme(); const router = useRouter();
  return <Screen title="Privacy & policies" action={<Button tone="quiet" label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/welcome" as Href)} />}><ScrollView contentContainerStyle={{ padding: 24, gap: 22 }}>
    {[
      ["Essential storage", "Clerk stores the sign-in session. NexaGear remembers your appearance choice and an unfinished checkout reference on this device. These support the features you use."],
      ["Your account and orders", "Supabase stores the account’s shared cart and order records. Checkout collects your name, phone number and delivery address. Signed-in requests are scoped to your account by database policies."],
      ["Payment and email", "Paystack processes payment details on its secure payment screen. NexaGear receives the payment reference and checks payment on the server. Mailgun sends order and payment emails."],
      ["Optional tracking", "NexaGear has no advertising cookies or optional analytics enabled. There are no optional trackers to accept or reject."],
      ["Demo shopping terms", "This is a demo catalogue with test-mode payments. Product photographs are representative. Supplier specifications, real prices, stock, delivery terms and returns must be confirmed before live sales."],
    ].map(([title, body]) => <View key={title} style={{ gap: 9 }}><Text accessibilityRole="header" style={{ color: theme.ink, fontSize: 21, fontWeight: "600" }}>{title}</Text><Text style={{ color: theme.steel, fontSize: 16, lineHeight: 25 }}>{body}</Text></View>)}
  </ScrollView></Screen>;
}
