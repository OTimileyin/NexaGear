import { NextRequest, NextResponse } from "next/server";
import { verifyOrderPayment } from "@/lib/payment-verification";

export async function GET(request: NextRequest) {
  const result = await verifyOrderPayment(request.nextUrl.searchParams.get("reference") ?? "");
  return NextResponse.json({ ok: result.paid === "1", ...result }, { status: result.payment === "unauthenticated" ? 401 : 200, headers: { "Cache-Control": "no-store" } });
}
