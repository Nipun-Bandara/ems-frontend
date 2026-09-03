'use client';

import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Eye as EyeIcon,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  MailWarning,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { resetPassword } from '@/app/services/auth/password';
import { ERROR_CODES } from '@/app/lib/errorcodes';
import type { ApiError } from '@/app/lib/axios';

type Status = 'form' | 'done' | 'expired' | 'unusable';

interface ResetPasswordProps {
  token: string | null;
}

/**
 * Where the reset link lands: the form for choosing a new password, and the states a link that
 * cannot be used ends in.
 *
 * Unlike `/auth/verify`, nothing is requested on mount. The token is spent by the request that
 * carries the new password, so firing anything on arrival would burn the link just by opening
 * the mail — which is also why the backend makes this a POST and not a GET.
 */
export default function ResetPassword({ token }: ResetPasswordProps) {
  const [status, setStatus] = useState<Status>(token ? 'form' : 'unusable');
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      // Matches the rule Register applies. A reset that refused passwords registration
      // accepts would strand anyone who chose one before this page existed.
      newPassword: Yup.string()
        .min(4, 'Must be at least 4 characters')
        .required('Required'),
      // Typed twice because the field is masked and there is no way back: a typo here is
      // only discovered at the next sign-in, by which point the link is spent.
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword')], 'Passwords do not match')
        .required('Required'),
    }),
    onSubmit: async (values) => {
      if (!token) return;
      setServerError(null);
      try {
        const data = await resetPassword(token, values.newPassword);
        setEmail(data.email);
        setStatus('done');
        toast.success('Password updated. Sign in with your new password.');
      } catch (error) {
        const apiError = error as ApiError;
        // Branch on the code, never the message. Expired and used both mean "start again",
        // and both are worth a distinct panel rather than an inline error, because there is
        // nothing the user can fix by editing this form.
        if (apiError?.code === ERROR_CODES.PASSWORD_RESET_TOKEN_EXPIRED) {
          setMessage(apiError.message ?? null);
          setStatus('expired');
          return;
        }
        if (
          apiError?.code === ERROR_CODES.PASSWORD_RESET_TOKEN_USED ||
          apiError?.code === ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID
        ) {
          setMessage(apiError.message ?? null);
          setStatus('unusable');
          return;
        }
        setServerError(
          apiError?.message ||
            'An unexpected error occurred. Please try again.'
        );
      }
    },
  });

  return (
    <div className="min-h-screen w-full bg-white dark:bg-neutral-950 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        {status === 'done' && <Done email={email} />}
        {(status === 'expired' || status === 'unusable') && (
          <Unusable status={status} message={message} />
        )}
        {status === 'form' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl lg:text-4xl font-bold text-textPrimary font-clash-display">
                Choose a new password
              </h1>
              <p className="mt-3 text-textSecondary">
                Pick something you have not used here before. Signing in
                elsewhere will end when you save this.
              </p>
            </div>

            <form onSubmit={formik.handleSubmit} className="space-y-5">
              {serverError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {serverError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1.5">
                  New password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary group-focus-within:text-primary transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    {...formik.getFieldProps('newPassword')}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-xl bg-backgroundSecondary text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      formik.touched.newPassword && formik.errors.newPassword
                        ? 'border-red-500'
                        : 'border-borderPrimary'
                    }`}
                    placeholder="Enter a new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-textPrimary hover:text-hoverPrimary transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {formik.touched.newPassword && formik.errors.newPassword ? (
                  <div className="text-red-500 text-xs mt-1">
                    {formik.errors.newPassword}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1.5">
                  Confirm new password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary group-focus-within:text-primary transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...formik.getFieldProps('confirmPassword')}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-backgroundSecondary text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      formik.touched.confirmPassword &&
                      formik.errors.confirmPassword
                        ? 'border-red-500'
                        : 'border-borderPrimary'
                    }`}
                    placeholder="Enter it again"
                  />
                </div>
                {formik.touched.confirmPassword &&
                formik.errors.confirmPassword ? (
                  <div className="text-red-500 text-xs mt-1">
                    {formik.errors.confirmPassword}
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={formik.isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {formik.isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {formik.isSubmitting ? 'Saving...' : 'Save new password'}
              </button>

              <Link
                href="/auth"
                className="block text-center text-sm font-medium text-textSecondary hover:text-textPrimary transition-colors"
              >
                Back to sign in
              </Link>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Done({ email }: { email: string | null }) {
  const router = useRouter();

  return (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-green-500/10 text-green-500">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-textPrimary font-clash-display">
          Password updated
        </h1>
        <p className="mt-3 text-textSecondary">
          {email ? (
            <>
              Sign in to{' '}
              <span className="font-medium text-textPrimary">{email}</span> with
              your new password.
            </>
          ) : (
            'Sign in with your new password.'
          )}
        </p>
        <p className="mt-2 text-sm text-textSecondary">
          Anything else that was signed in to this account has been signed out.
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
 * Expired, spent and unrecognised share a panel because the remedy is one thing: ask for
 * another link. No email field here, unlike the verification equivalent — a reset link that
 * could not be redeemed told us nothing about whose it was, and asking for an address on a
 * page reached by a bad link is a form worth being wary of. The user is sent back to the
 * forgot-password page to type it there instead.
 */
function Unusable({
  status,
  message,
}: {
  status: 'expired' | 'unusable';
  message: string | null;
}) {
  const expired = status === 'expired';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500">
        <MailWarning className="w-7 h-7" />
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-textPrimary font-clash-display">
          {expired ? 'This link has expired' : 'This link cannot be used'}
        </h1>
        <p className="mt-3 text-textSecondary">
          {message ??
            (expired
              ? 'Password reset links last one hour.'
              : 'It may have been used already, or replaced by a newer one.')}
        </p>
        <p className="mt-2 text-sm text-textSecondary">
          Your password has not been changed. Request a new link to try again.
        </p>
      </div>

      <Link
        href="/auth/forgot"
        className="block w-full text-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
      >
        Request a new link
      </Link>

      <Link
        href="/auth"
        className="block text-center text-sm font-medium text-textSecondary hover:text-textPrimary transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  );
}
