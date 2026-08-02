import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/**
 * Handles links from confirmation, magic-link and password-reset emails.
 *
 * Why this exists rather than reusing /auth/callback:
 *
 * Supabase's default `{{ .ConfirmationURL }}` points at its own /auth/v1/verify
 * endpoint, which verifies the token and then 303s back to us with the session
 * in the URL *fragment* (`#access_token=...`). Fragments are never transmitted
 * to a server, so a server-side route can't read them — the user's email would
 * get confirmed but they'd arrive with no session at all.
 *
 * Instead the email template links straight here with `token_hash`, a query
 * parameter, and verifyOtp() exchanges it for a session that gets written to
 * cookies server-side. Nothing depends on client-side JavaScript.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/";

  // Only ever redirect to a same-site relative path.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!tokenHash || !type || !VALID_TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // Most often the link was already used or has aged out.
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  // A password-reset link should land on the change-password form, not the feed.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/settings?reset=1`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
