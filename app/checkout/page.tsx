import { SignInGate } from "@/components/SignInGate";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getCurrentUser } from "@/lib/auth";
import { pageMetadata } from "@/lib/seo";

// Functional and per-session: a search result for /checkout is never useful,
// and without this it advertised og:url as the homepage.
export const metadata = pageMetadata({
  title: "Checkout",
  description:
    "Review your NexaGear order and place it. Prices and totals are calculated from the catalogue.",
  path: "/checkout",
  index: false,
});

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <SignInGate next="/checkout" />;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <span className="font-mono text-[11px] text-steel">
          STEP 02 · REVIEW & PLACE
        </span>
      </div>
      <div className="mt-10">
        <CheckoutForm user={{ email: user.email, displayName: user.displayName }} />
      </div>
    </div>
  );
}
