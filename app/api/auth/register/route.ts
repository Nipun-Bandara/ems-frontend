import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  callGateway,
  gatewayError,
  toPublicUser,
  type GatewayAuthResponse,
} from "@/app/lib/session";

/**
 * Creates an account. Deliberately sets no cookies: an account cannot be signed in to until
 * its address is verified, so registering starts the verification flow rather than a session.
 * The caller's next step is the "check your inbox" screen.
 */
export async function POST(request: NextRequest) {
  const payload = await request.json();

  const { response: gatewayResponse, body } = await callGateway("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!gatewayResponse.ok) {
    const error = gatewayError(body, gatewayResponse.status);
    return NextResponse.json(error, { status: error.status });
  }

  return NextResponse.json(toPublicUser(body as GatewayAuthResponse), { status: 201 });
}
