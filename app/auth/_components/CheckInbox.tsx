'use client';

import { useState } from 'react';
import { MailCheck, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resendVerification } from '@/app/api/auth/verify';
import { ERROR_CODES } from '@/app/lib/errorcodes';
import type { ApiError } from '@/app/lib/axios';

interface CheckInboxProps {
  /** The address the link was sent to. Shown so the user can spot a typo in it. */
  email: string;
  /** Wording differs slightly between "you just registered" and "you tried to sign in". */
  reason: 'registered' | 'login-blocked';
  onBack: () => void;
}

/**
 * Shown wherever the answer is "the account exists but its address is unverified": after
 * registering, and after a login refused with EMAIL_NOT_VERIFIED. One component for both so
 * that the resend button behaves identically no matter which door the user arrived through.
 */
export default function CheckInbox({ email, reason, onBack }: CheckInboxProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setError(null);
    setIsSending(true);
    try {
      await resendVerification(email);
      toast.success('Verification email sent. Check your inbox.');
    } catch (err) {
      const apiError = err as ApiError;
      // The one-a-minute limit is a normal thing to hit -- a user who does not see the mail
      // immediately will press this twice -- so it reads as guidance, not as a failure.
      setError(
        apiError?.code === ERROR_CODES.RESEND_TOO_SOON
          ? 'A verification email was just sent. Give it a minute before asking for another.'
          : apiError?.message || 'Could not send the email. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto lg:mx-0">
        <MailCheck className="w-7 h-7" />
      </div>

      <div className="text-center lg:text-left">
        <h1 className="text-3xl lg:text-4xl font-bold text-textPrimary font-clash-display">
          Check your inbox
        </h1>
        <p className="mt-3 text-textSecondary">
          {reason === 'registered'
            ? 'Your account is created. We sent a verification link to'
            : 'This account still needs verifying. We sent a link to'}{' '}
          <span className="font-medium text-textPrimary">{email}</span>
          {reason === 'registered'
            ? '. Click it to finish setting up and sign in.'
            : ' when you registered. Click it, then sign in again.'}
        </p>
        <p className="mt-2 text-sm text-textSecondary">
          The link works once and expires in 24 hours.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={isSending}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSending ? 'Sending...' : 'Resend verification email'}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 px-4 rounded-xl text-sm font-medium text-textSecondary hover:text-textPrimary transition-colors"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
