import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Only allow same-site relative redirects (blocks open redirects). */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/checkout";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL(`${next}?auth_error=missing_code`, url.origin),
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL(`${next}?auth_error=not_configured`, url.origin),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] OAuth code exchange failed:", error.message);
    return NextResponse.redirect(
      new URL(`${next}?auth_error=exchange_failed`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
