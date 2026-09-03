import type { NextResponse } from "next/server";

/**
 * The session cookies and the server-side call to the gateway that mints them.
 *
 * Everything in here runs on the Next server. The browser never sees a token: it holds two
 * httpOnly cookies it cannot read, and every request that needs a token goes through a route
 * handler that reads them here.
 */

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

/**
 * Matched to identity-service's JWT_EXPIRATION (900000ms) and JWT_REFRESH_EXPIRATION
 * (604800000ms). Cookie max-age is in seconds, those are in milliseconds.
 *
 * The cookie outliving its token would only mean a pointless request that comes back 401 and
 * gets refreshed; the token outliving its cookie would log the user out early. These are kept
 * equal, so if the backend TTLs move, move these with them.
 */
export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

const isProduction = process.env.NODE_ENV === "production";

/**
 * `secure` only in production because the dev server is plain http on localhost, and a secure
 * cookie would simply never be stored there.
 *
 * `sameSite: "lax"` rather than "strict": the email verification and password reset links are
 * opened from a mail client, which is a cross-site navigation. Under "strict" the cookies
 * would be withheld on that first request.
 *
 * Both cookies are scoped to "/" rather than the refresh cookie being narrowed to the refresh
 * endpoint, because `proxy.ts` has to read it on page requests to decide whether a session
 * exists before rendering a protected page.
 */
const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
} as const;

/**
 * The gateway's origin. `NEXT_PUBLIC_BASE_URL` is what the app is already configured with;
 * `GATEWAY_INTERNAL_URL` exists so a containerised deployment can point the server hop at a
 * service name while the public variable stays a browser-facing URL. Nothing client-side reads
 * either one any more — axios now talks only to this app's own /api.
 */
export const GATEWAY_URL =
  process.env.GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:8080";

/** The shape identity-service's AuthResponse comes back as. */
export interface GatewayAuthResponse {
  token: string | null;
  refreshToken: string | null;
  userId: number;
  email: string;
  username: string;
  departmentId: number | null;
  departmentName: string | null;
  roles: string[];
  isBanned: boolean | null;
  emailVerified: boolean | null;
}

/**
 * What a route handler is allowed to hand back to the browser: the same payload minus the two
 * fields that must never cross that boundary. Returning `Omit<...>` rather than picking fields
 * by hand means a new token-ish field added to the backend response would still be stripped
 * only if named here — so `toPublicUser` below rebuilds the object explicitly instead.
 */
export type PublicUser = Omit<GatewayAuthResponse, "token" | "refreshToken">;

/**
 * Rebuilds the response field by field rather than deleting the two token keys, so that
 * anything the backend starts sending has to be added here deliberately before it can reach
 * the browser. Spreading and deleting would leak new fields by default; this leaks nothing.
 */
export function toPublicUser(data: GatewayAuthResponse): PublicUser {
  return {
    userId: data.userId,
    email: data.email,
    username: data.username,
    departmentId: data.departmentId ?? null,
    departmentName: data.departmentName ?? null,
    roles: data.roles ?? [],
    isBanned: data.isBanned ?? false,
    emailVerified: data.emailVerified ?? null,
  };
}

/**
 * Writes whichever tokens the response carried. Refresh responses always include both because
 * the backend rotates the refresh token on every use — storing the new one is what keeps the
 * next refresh working, and skipping it would end the session after one rotation.
 */
export function setSessionCookies(
  response: NextResponse,
  tokens: { token?: string | null; refreshToken?: string | null }
) {
  if (tokens.token) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.token, {
      ...baseCookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
  }

  if (tokens.refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...baseCookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
}

/**
 * Expires both cookies. Set with the same attributes they were written with, because a browser
 * matches a deletion against path and domain — clearing with a different path silently leaves
 * the original cookie in place.
 */
export function clearSessionCookies(response: NextResponse) {
  for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
    response.cookies.set(name, "", { ...baseCookieOptions, maxAge: 0 });
  }
}

/**
 * One server-side call to the gateway.
 *
 * `cache: "no-store"` because these are session-bearing requests and a cached 200 from one
 * user's session would be served to the next.
 */
export async function callGateway(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {}
) {
  const { accessToken, headers, ...rest } = init;

  const response = await fetch(`${GATEWAY_URL}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  // 204s (logout, resend-verification) and any empty body would make .json() throw.
  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  return { response, body };
}

/**
 * Turns a failed gateway response into the ApiError shape app/lib/axios.ts normalizes to, so a
 * failure surfaces identically whether it was the gateway or this app's own hop that produced
 * it. In particular `code` is preserved — the UI branches on EMAIL_NOT_VERIFIED and the
 * password-reset codes, and losing it would break those screens.
 */
export function gatewayError(body: unknown, status: number) {
  const payload = (body ?? {}) as {
    status?: number;
    error?: string;
    message?: string;
    code?: string;
  };

  return {
    status: payload.status ?? status,
    error: payload.error ?? "Request failed",
    message: payload.message ?? "Something went wrong",
    ...(payload.code ? { code: payload.code } : {}),
  };
}
