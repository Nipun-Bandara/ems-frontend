import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  callGateway,
  gatewayError,
  setSessionCookies,
  toPublicUser,
  type GatewayAuthResponse,
} from "@/app/lib/session";

/**
 * Signs in. The tokens the gateway returns are written straight to httpOnly cookies and are
 * not part of the response body — the browser gets the user and nothing it could replay.
 */
export async function POST(request: NextRequest) {
  const credentials = await request.json();

  const { response: gatewayResponse, body } = await callGateway("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (!gatewayResponse.ok) {
    const error = gatewayError(body, gatewayResponse.status);
    return NextResponse.json(error, { status: error.status });
  }

  const data = body as GatewayAuthResponse;

  // Refused here rather than in the client: this is the point where the cookies would be
  // written, and a check that runs after they are set is a banned account with a live session.
  if (data.isBanned) {
    return NextResponse.json(
      {
        status: 403,
        error: "Forbidden",
        message: "This account has been banned. Please contact support.",
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json(toPublicUser(data));
  setSessionCookies(response, data);
  return response;
}
