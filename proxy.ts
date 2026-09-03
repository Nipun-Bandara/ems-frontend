import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Guards the (user) route group.
 *
 * In Next.js 16 the `middleware` file convention was renamed to `proxy`; this is that file.
 *
 * It gates on the **refresh** cookie, not the access cookie. The access token lives fifteen
 * minutes, so gating on it would bounce a perfectly good session to /auth on any hard refresh
 * more than fifteen minutes after signing in — the exact case the refresh flow exists to
 * handle. The refresh cookie is the thing that means "there is a session here", and if it
 * turns out to be spent, /api/auth/me's 401 and the failed refresh behind it will land the
 * user on /auth anyway.
 *
 * This is an optimistic check, which is all proxy is meant for: it stops a protected page from
 * rendering for someone with no session at all, and it deliberately does not verify the token.
 * Verification happens at the gateway on every request that carries one.
 */

const REFRESH_TOKEN_COOKIE = "refresh_token";

export function proxy(request: NextRequest) {
  if (request.cookies.has(REFRESH_TOKEN_COOKIE)) {
    return NextResponse.next();
  }

  // Redirected before the page renders, so there is no flash of a protected screen. `from` is
  // carried so a later change can send the user back where they were aiming.
  const signIn = new URL("/auth", request.url);
  signIn.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(signIn);
}

/**
 * The pages inside app/(user) — route groups are not part of the URL, so these are top-level.
 * This list is the only definition of what is protected: the function above runs solely on
 * what matches here. Matcher values must be static literals to be analysable at build time.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/user-management/:path*"],
};
