import axiosInstance from "@/app/lib/axios";
import { API_PATHS } from "@/app/lib/apipaths";

export interface ForgotPasswordResponse {
  /** Wording to show the user. Identical in every case — see `requestPasswordReset`. */
  message: string;
}

export interface PasswordResetResponse {
  /** The address whose password was changed, so the sign-in page can prefill it. */
  email: string;
}

/**
 * Asks for a password reset link.
 *
 * Resolves the same way for an address with no account, for one that has already had its
 * three links this hour, and for a real request — the backend answers all three identically
 * so that this public endpoint cannot be used to find out which addresses are registered.
 * There is deliberately nothing in the response to branch on, and the caller should not try.
 */
export async function requestPasswordReset(email: string) {
  const { data } = await axiosInstance.post<ForgotPasswordResponse>(
    API_PATHS.AUTH.FORGOT_PASSWORD,
    { email }
  );

  return data;
}

/**
 * Redeems a reset token and sets the new password.
 *
 * Rejects with an ApiError carrying PASSWORD_RESET_TOKEN_EXPIRED, _USED or _INVALID if the
 * link cannot be used. Unlike email verification, a spent link is a failure here: the password
 * in hand was never applied, so reporting success would leave the user locked out.
 *
 * On success every session the account had is over, including any this browser held — the
 * caller is sent to sign in again rather than being handed a token.
 */
export async function resetPassword(token: string, newPassword: string) {
  const { data } = await axiosInstance.post<PasswordResetResponse>(
    API_PATHS.AUTH.RESET_PASSWORD,
    { token, newPassword }
  );

  return data;
}
