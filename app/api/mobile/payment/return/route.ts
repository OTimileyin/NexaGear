import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/checkout";
import { isMobileReturnUrl } from "@/lib/mobile-checkout";

export async function GET(request: NextRequest) {
  const returnUrl = request.nextUrl.searchParams.get("returnUrl");
  const reference = request.nextUrl.searchParams.get("reference");
  if (!isMobileReturnUrl(returnUrl) || !reference || !isUuid(reference)) return new NextResponse("Return to NexaGear and tap Check payment to confirm your order.", { status: 400 });
  const target = new URL(returnUrl);
  target.searchParams.set("reference", reference);
  // A redirect is not proof of payment. The authenticated app verifies with the server.
  return new NextResponse(null, { status: 303, headers: { Location: target.toString(), "Cache-Control": "no-store" } });
}
