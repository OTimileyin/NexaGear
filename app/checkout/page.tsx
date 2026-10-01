import { SignInGate } from "@/components/SignInGate";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const user = await getCurrentUser();
  const { auth_error } = await searchParams;

  if (!user) {
    return <SignInGate next="/checkout" authError={auth_error} />;
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
