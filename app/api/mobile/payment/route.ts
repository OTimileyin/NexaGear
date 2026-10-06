import { NextRequest, NextResponse } from "next/server";
import { startPayment } from "@/app/checkout/actions";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/checkout";
import { isMobileReturnUrl } from "@/lib/mobile-checkout";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!await getCurrentUser()) return NextResponse.json({ ok: false, message: "Sign in to pay for your order." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, message: "Invalid payment request." }, { status: 400 });
  const { orderId, returnUrl } = body as Record<string, unknown>;
  if (typeof orderId !== "string" || !isUuid(orderId) || !isMobileReturnUrl(returnUrl)) return NextResponse.json({ ok: false, message: "Invalid order or payment return address." }, { status: 400 });
  const result = await startPayment(orderId, returnUrl);
  if (!result.ok) return NextResponse.json(result, { status: result.code === "rate_limited" ? 429 : 400 });
  const client = await getSupabaseServerClient();
  const { data, error } = client ? await client.from("orders").select("subtotal").eq("id", orderId).maybeSingle() : { data: null, error: true };
  if (error || !data) return NextResponse.json({ ok: false, message: "Your order is saved, but the total could not be loaded. Retry payment." }, { status: 503 });
  return NextResponse.json({ ...result, orderId, amount: Number(data.subtotal), currency: "NGN" });
}
