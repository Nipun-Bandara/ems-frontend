'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  MailWarning,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { verifyEmail, resendVerification } from '@/app/services/auth/verify';
import { ERROR_CODES } from '@/app/lib/errorcodes';
import type { ApiError } from '@/app/lib/axios';

type Status = 'pending' | 'success' | 'already' | 'expired' | 'invalid';

interface VerifyEmailProps {
  token: string | null;
}

export default function VerifyEmail({ token }: VerifyEmailProps) {
  const [status, setStatus] = useState<Status>(token ? 'pending' : 'invalid');
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // The token is spent by the first request, and React runs effects twice in development.
  // The endpoint is idempotent so a second call is harmless, but it would answer
  // "already verified" and rob a first-time visitor of the success state.
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!token || hasRequested.current) return;
    hasRequested.current = true;

    verifyEmail(token)
      .then((data) => {
        setEmail(data.email);
        setStatus(data.alreadyVerified ? 'already' : 'success');
      })
      .catch((err) => {
        const apiError = err as ApiError;
        setMessage(apiError?.message ?? null);
        setStatus(
          apiError?.code === ERROR_CODES.VERIFICATION_TOKEN_EXPIRED
            ? 'expired'
            : 'invalid'
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-neutral-950 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        {status === 'pending' && <Pending />}
        {status === 'success' && <Success email={email} />}
        {status === 'already' && <AlreadyVerified email={email} />}
        {(status === 'expired' || status === 'invalid') && (
          <Unusable status={status} message={message} />
        )}
      </div>
    </div>
  );
}

function Pending() {
  return (
    <div className="space-y-5 text-center">
      <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
      <h1 className="text-2xl font-bold text-textPrimary font-clash-display">
        Verifying your email
      </h1>
      <p className="text-textSecondary">This will only take a moment.</p>
    </div>
  );
}

function Success({ email }: { email: string | null }) {
  const router = useRouter();

  return (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-green-500/10 text-green-500">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-textPrimary font-clash-display">
          Email verified
        </h1>
        <p className="mt-3 text-textSecondary">
          {email ? (
            <>
              <span className="font-medium text-textPrimary">{email}</span> is
              confirmed. Your account is ready to use.
            </>
          ) : (
            'Your account is ready to use.'
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push('/auth')}
        className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
      >
        Continue to sign in
      </button>
    </div>
  );
}

/**
 * A spent token is a success, not a failure: the account is verified, which is what the
 * person clicking the link wanted. Saying "already" rather than "done" only so that someone
 * who genuinely did not expect it is not left wondering whether it worked the first time.
 */
function AlreadyVerified({ email }: { email: string | null }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-green-500/10 text-green-500">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-textPrimary font-clash-display">
          Already verified
        </h1>
        <p className="mt-3 text-textSecondary">
          {email ? (
            <>
              <span className="font-medium text-textPrimary">{email}</span> was
              confirmed already — nothing more to do.
            </>
          ) : (
            'This address was confirmed already — nothing more to do.'
          )}
        </p>
      </div>
      <Link
        href="/auth"
        className="block w-full py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
      >
        Continue to sign in
      </Link>
    </div>
  );
}

/**
 * Expired and invalid share a panel because the remedy is the same one: ask for a new link.
 * The address is asked for here rather than assumed, since a link that could not be redeemed
 * told us nothing about whose it was.
 */
function Unusable({
  status,
  message,
}: {
  status: 'expired' | 'invalid';
  message: string | null;
}) {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = status === 'expired';

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSending(true);
    try {
      await resendVerification(email);
      setSent(true);
      toast.success('If that address needs verifying, a new link is on its way.');
    } catch (err) {
      const apiError = err as ApiError;
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
    <div className="space-y-6">
      <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500">
        <MailWarning className="w-7 h-7" />
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-textPrimary font-clash-display">
          {expired ? 'This link has expired' : 'This link is not valid'}
        </h1>
        <p className="mt-3 text-textSecondary">
          {message ??
            (expired
              ? 'Verification links last 24 hours.'
              : 'It may have been mistyped, or replaced by a newer one.')}{' '}
          Enter your email address and we will send a new one.
        </p>
      </div>

      {sent ? (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm text-center">
          Check your inbox for the new link, then sign in.
        </div>
      ) : (
        <form onSubmit={handleResend} className="space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary group-focus-within:text-primary transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-borderPrimary rounded-xl bg-backgroundSecondary text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSending ? 'Sending...' : 'Send a new link'}
          </button>
        </form>
      )}

      <Link
        href="/auth"
        className="block text-center text-sm font-medium text-textSecondary hover:text-textPrimary transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  );
}
