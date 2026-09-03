import axiosInstance from "@/app/lib/axios";
import { API_PATHS } from "@/app/lib/apipaths";

export interface VerificationResponse {
  email: string;
  /**
   * True when the link had already been used. Still a success — the account is verified
   * either way — so the page says so rather than reporting a broken link.
   */
  alreadyVerified: boolean;
}

/**
 * Redeems a verification token. Rejects with an ApiError carrying
 * VERIFICATION_TOKEN_EXPIRED or VERIFICATION_TOKEN_INVALID if the link cannot be used.
 */
export async function verifyEmail(token: string) {
  const { data } = await axiosInstance.get<VerificationResponse>(
    API_PATHS.AUTH.VERIFY,
    { params: { token } }
  );

  return data;
}

/**
 * Asks for a fresh verification link, which invalidates any sent before it.
 *
 * Resolves for an address with no account and for one already verified, exactly as it does
 * for a real resend — the backend answers all three identically so that this endpoint cannot
 * be used to find out which addresses are registered. Rejects with RESEND_TOO_SOON if one
 * went out within the last minute.
 */
export async function resendVerification(email: string) {
  await axiosInstance.post<void>(API_PATHS.AUTH.RESEND_VERIFICATION, { email });
}
