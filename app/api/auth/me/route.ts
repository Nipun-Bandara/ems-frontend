import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  callGateway,
  gatewayError,
  toPublicUser,
  type GatewayAuthResponse,
} from "@/app/lib/session";

/**
 * Who the cookies say the caller is. This is what replaces reading a user object out of
 * localStorage: the answer comes from the backend against a token the browser cannot see.
 *
 * A missing or expired access token is a plain 401 — the browser's axios interceptor turns
 * that into a refresh and a replay, which is what makes a hard refresh on an expired access
 * token come back signed in rather than bouncing to /auth.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { status: 401, error: "Unauthorized", message: "Not signed in." },
      { status: 401 }
    );
  }

  const { response: gatewayResponse, body } = await callGateway("/api/auth/me", {
    method: "GET",
    accessToken,
  });

  if (!gatewayResponse.ok) {
    const error = gatewayError(body, gatewayResponse.status);
    return NextResponse.json(error, { status: error.status });
  }

  return NextResponse.json(toPublicUser(body as GatewayAuthResponse));
}
