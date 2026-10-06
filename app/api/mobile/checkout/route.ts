import { NextRequest, NextResponse } from "next/server";
import { placeOrder } from "@/app/checkout/actions";
import { getCurrentUser } from "@/lib/auth";
import { parseMobileOrder } from "@/lib/mobile-checkout";

export async function POST(request: NextRequest) {
  if (!await getCurrentUser()) return NextResponse.json({ ok: false, message: "Sign in to place your order." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 20000) return NextResponse.json({ ok: false, message: "The checkout request is too large." }, { status: 413 });
  const input = parseMobileOrder(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ ok: false, message: "Check your delivery details and cart, then try again." }, { status: 400 });
  const result = await placeOrder(input);
  return NextResponse.json(result, { status: result.ok ? 200 : result.code === "rate_limited" ? 429 : 400 });
}
