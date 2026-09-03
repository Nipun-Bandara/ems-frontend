import axiosInstance from "@/app/lib/axios";
import { API_PATHS } from "@/app/lib/apipaths";

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * What the browser is told about the signed-in account.
 *
 * There is no token here, and there is deliberately nowhere to put one: signing in sets two
 * httpOnly cookies that this code cannot read, and `/api/auth/login` strips the tokens out of
 * the gateway's response before it ever reaches the client bundle.
 */
export interface AuthApiResponse {
  userId: number;
  email: string;
  username: string;
  departmentId: number | null;
  departmentName: string | null;
  roles: string[];
  isBanned: boolean;
  emailVerified: boolean | null;
}

/**
 * Rejects with an ApiError carrying EMAIL_NOT_VERIFIED when the password was right but the
 * address has not been confirmed — the one 403 worth offering a resend link for.
 *
 * A banned account is also refused here with a 403, by the route handler rather than by the
 * caller, so that the refusal happens before any cookie is written.
 */
export async function loginUser(payload: LoginRequest) {
  const { data } = await axiosInstance.post<AuthApiResponse>(
    API_PATHS.AUTH.LOGIN,
    payload
  );

  return data;
}

/** The current session's user, or a 401 if there is none. */
export async function getCurrentUser() {
  const { data } = await axiosInstance.get<AuthApiResponse>(API_PATHS.AUTH.ME, {
    // A signed-out visitor to a public page must not be redirected to the sign-in screen just
    // because this call came back 401 — AuthContext wants the null, not a navigation.
    skipAuthRedirect: true,
  });

  return data;
}

/** Ends the session server-side and expires both cookies. */
export async function logoutUser() {
  await axiosInstance.post<void>(API_PATHS.AUTH.LOGOUT);
}
