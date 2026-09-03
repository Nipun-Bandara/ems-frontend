/**
 * Error codes the backend puts in `ErrorResponse.code`, mirrored here because they are the
 * contract this app branches on. The `message` beside them is for the user and may be
 * reworded at any time; these strings are not.
 *
 * Kept in step with identity-service's AuthErrorCode.
 */
export const ERROR_CODES = {
  /** Password was right, but the address has not been verified. Offer a resend. */
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  /** The verification link is not one we issued, or has been superseded. */
  VERIFICATION_TOKEN_INVALID: "VERIFICATION_TOKEN_INVALID",
  /** The verification link was real but is more than 24 hours old. */
  VERIFICATION_TOKEN_EXPIRED: "VERIFICATION_TOKEN_EXPIRED",
  /** A verification email went out less than a minute ago. */
  RESEND_TOO_SOON: "RESEND_TOO_SOON",
  /** The password reset link is not one we issued. */
  PASSWORD_RESET_TOKEN_INVALID: "PASSWORD_RESET_TOKEN_INVALID",
  /** The password reset link was real but is more than an hour old. */
  PASSWORD_RESET_TOKEN_EXPIRED: "PASSWORD_RESET_TOKEN_EXPIRED",
  /** The password reset link was already spent, or replaced by a newer request. */
  PASSWORD_RESET_TOKEN_USED: "PASSWORD_RESET_TOKEN_USED",
} as const;
