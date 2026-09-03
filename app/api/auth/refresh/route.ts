import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  REFRESH_TOKEN_COOKIE,
  callGateway,
  clearSessionCookies,
  gatewayError,
  setSessionCookies,
  toPublicUser,
  type GatewayAuthResponse,
} from "@/app/lib/session";

/**
 * Exchanges the refresh cookie for a new pair.
 *
 * Whatever refresh token comes back is written to the cookie, rather than the old one being
 * left in place. identity-service is built to rotate on every use and to treat a replayed
 * token as a breach — see AuthServiceRefreshTokenTest — so dropping the replacement would
 * leave the browser holding a spent token and end every session the account has. (The instance
 * running against this checkout returns the same token rather than a rotated one, so that
 * behaviour is not currently observable; storing the response either way is what makes this
 * correct once it is.)
 *
 * On any failure the cookies are cleared rather than left in place: whatever is in them cannot
 * produce a session, and keeping them would make `proxy.ts` go on believing one exists.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    const response = NextResponse.json(
      { status: 401, error: "Unauthorized", message: "No session to refresh." },
      { status: 401 }
    );
    clearSessionCookies(response);
    return response;
  }

  const { response: gatewayResponse, body } = await callGateway("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  if (!gatewayResponse.ok) {
    const error = gatewayError(body, gatewayResponse.status);
    const response = NextResponse.json(error, { status: error.status });
    clearSessionCookies(response);
    return response;
  }

  const data = body as GatewayAuthResponse;
  const response = NextResponse.json(toPublicUser(data));
  setSessionCookies(response, data);
  return response;
}
