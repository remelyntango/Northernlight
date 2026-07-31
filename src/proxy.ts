import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Runs before every matched request. Refreshes the Supabase session cookie and
 * gates the authenticated routes.
 *
 * (Next.js 16 renamed this convention from `middleware` to `proxy`.)
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /* Everything except Next internals and static assets. */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
  ],
};
