'use client';

import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Link from 'next/link';
import { Mail, AlertCircle, Loader2, MailCheck } from 'lucide-react';
import { requestPasswordReset } from '@/app/services/auth/password';
import type { ApiError } from '@/app/lib/axios';

/**
 * Asks for the address to send a reset link to.
 *
 * The screen after submitting says a link is on its way <em>if</em> the address has an account,
 * and says it whether or not one does. That wording is not hedging for its own sake: the
 * backend answers a known and an unknown address identically on purpose, so a page that
 * claimed "we've sent it" would be lying half the time, and one that reported "no such
 * account" would undo the property the endpoint was built to have.
 */
export default function ForgotPassword() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Required'),
    }),
    onSubmit: async (values) => {
      setServerError(null);
      try {
        await requestPasswordReset(values.email);
        setSubmittedEmail(values.email);
      } catch (error) {
        // Only a genuine transport or server failure reaches here. Being over the hourly
        // limit does not: that is answered as a normal success, so it lands on the same
        // confirmation screen as everything else.
        setServerError(
          (error as ApiError)?.message ||
            'An unexpected error occurred. Please try again.'
        );
      }
    },
  });

  if (submittedEmail) {
    return <LinkOnItsWay email={submittedEmail} />;
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-neutral-950 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-textPrimary font-clash-display">
            Forgot your password?
          </h1>
          <p className="mt-3 text-textSecondary">
            Enter the email address on your account and we will send you a link
            to choose a new password.
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
              Email
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary group-focus-within:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                autoFocus
                {...formik.getFieldProps('email')}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-backgroundSecondary text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                  formik.touched.email && formik.errors.email
                    ? 'border-red-500'
                    : 'border-borderPrimary'
                }`}
                placeholder="you@example.com"
              />
            </div>
            {formik.touched.email && formik.errors.email ? (
              <div className="text-red-500 text-xs mt-1">
                {formik.errors.email}
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {formik.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {formik.isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>

          <Link
            href="/auth"
            className="block text-center text-sm font-medium text-textSecondary hover:text-textPrimary transition-colors"
          >
            Back to sign in
          </Link>
        </form>
      </div>
    </div>
  );
}

/**
 * The confirmation. Says "if" rather than "we have" because the page genuinely does not know
 * — and telling the user what to do when no mail arrives is more useful here than a claim it
 * cannot back up.
 */
function LinkOnItsWay({ email }: { email: string }) {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-neutral-950 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="w-7 h-7" />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-textPrimary font-clash-display">
            Check your inbox
          </h1>
          <p className="mt-3 text-textSecondary">
            If an account exists for{' '}
            <span className="font-medium text-textPrimary">{email}</span>, a link
            to reset its password is on its way.
          </p>
          <p className="mt-2 text-sm text-textSecondary">
            The link works once and expires in one hour. If nothing arrives,
            check the address for typos and look in your spam folder.
          </p>
        </div>

        <Link
          href="/auth"
          className="block w-full text-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
