import { NextRequest, NextResponse } from "next/server";
import { verifyOrderPayment } from "@/lib/payment-verification";

export async function GET(request: NextRequest) {
  const result = await verifyOrderPayment(request.nextUrl.searchParams.get("reference") ?? "");
  if (result.payment === "unauthenticated") return NextResponse.redirect(`${request.nextUrl.origin}/sign-in`);
  return NextResponse.redirect(`${request.nextUrl.origin}/order/success?${new URLSearchParams(result)}`);
}
