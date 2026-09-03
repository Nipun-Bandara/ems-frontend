import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  callGateway,
  clearSessionCookies,
} from "@/app/lib/session";

/**
 * Ends the session.
 *
 * The gateway's /logout is authenticated and also wants the refresh token in the body: the
 * access token says who is asking, the refresh token says which of their sessions to end.
 * Both come from the cookies here.
 *
 * The cookies are cleared whatever the gateway says. A logout that reported failure and left
 * the browser holding a working session would be the worst outcome of the three, and the
 * backend already answers identically for an already-spent token.
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    try {
      await callGateway("/api/auth/logout", {
        method: "POST",
        accessToken,
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // The gateway being unreachable does not change what this endpoint owes the caller:
      // the cookies go either way, and the refresh token expires on its own.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
}
