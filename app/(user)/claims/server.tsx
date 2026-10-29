import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, callGateway } from "@/app/lib/session";
import type { Permissions } from "./api";

export async function claimPageAllowed(review: boolean) {
 const jar = await cookies();
 if (!jar.has(REFRESH_TOKEN_COOKIE)) redirect(`/auth?from=/claims${review ? "/review" : ""}`);
 const token = jar.get(ACCESS_TOKEN_COOKIE)?.value;
 if (!token) return true; // The cookie BFF refreshes the session on the first client request.
 const { response, body } = await callGateway("/api/claims/permissions", { accessToken: token });
 if (response.status === 401) return true;
 if (!response.ok) return false;
 const permissions = body as Permissions;
 return review ? permissions.reviewer : permissions.active;
}
