import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_TOKEN_COOKIE, GATEWAY_URL } from "@/app/lib/session";

/**
 * Forwards everything that is not one of the five auth routes to the gateway, attaching the
 * access token from the cookie.
 *
 * This exists because the browser no longer holds a token. axios now points at this app's own
 * origin, so a call like `getAllUsers` arrives here with nothing but cookies; the Authorization
 * header it used to set client-side has to be put on somewhere, and this is the first place
 * that can read an httpOnly cookie.
 *
 * The public auth endpoints (verify, resend-verification, forgot-password, reset-password)
 * come through here too. They need no token and the gateway exempts them, so an absent cookie
 * is simply an absent header rather than a failure.
 *
 * Next resolves static segments before catch-alls, so app/api/auth/login and its four siblings
 * still take their own paths and never reach this file.
 */

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function forward(request: NextRequest, path: string[]) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const target = `${GATEWAY_URL}/api/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // The cookie header is dropped deliberately: the gateway authenticates on Authorization,
    // and forwarding session cookies to it would put the refresh token somewhere it has no
    // reason to be.
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "cookie") {
      headers.set(key, value);
    }
  });

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    headers.delete("Authorization");
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const gatewayResponse = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const body = await gatewayResponse.text();

  // Set-Cookie is not copied back: the only cookies this app sets are the session pair, and
  // those are written by the auth route handlers alone.
  const responseHeaders = new Headers();
  const contentType = gatewayResponse.headers.get("content-type");
  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  return new NextResponse(body || null, {
    status: gatewayResponse.status,
    headers: responseHeaders,
  });
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  return forward(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: Context) {
  return forward(request, (await params).path);
}

export async function PUT(request: NextRequest, { params }: Context) {
  return forward(request, (await params).path);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  return forward(request, (await params).path);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  return forward(request, (await params).path);
}
