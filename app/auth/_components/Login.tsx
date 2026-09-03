'use client';

import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Mail, Lock, Eye as EyeIcon, EyeOff, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import CheckInbox from './CheckInbox';
import { ERROR_CODES } from '@/app/lib/errorcodes';
import type { ApiError } from '@/app/lib/axios';

interface LoginProps {
  onSwitchToSignup: () => void;
}

export default function Login({ onSwitchToSignup }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Set only when the backend says the password was right but the address is unverified.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const router = useRouter();

  const {login} = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Required'),
      password: Yup.string().required('Required'),
    }),
    onSubmit: async (values) => {
      setServerError(null);
      try {
        await login(values);
        toast.success('Logged in successfully!');
      } catch (error) {
        const apiError = error as ApiError;
        // Branch on the code, not the message: this 403 and an "account banned" 403 are the
        // same status, and only one of them is fixed by clicking a link in an email.
        if (apiError?.code === ERROR_CODES.EMAIL_NOT_VERIFIED) {
          setUnverifiedEmail(values.email);
          return;
        }
        setServerError(
          (error as Error)?.message ||
            'An unexpected error occurred. Please try again.'
        );
      }
    },
  });

  if (unverifiedEmail) {
    return (
      <CheckInbox
        email={unverifiedEmail}
        reason="login-blocked"
        onBack={() => setUnverifiedEmail(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center lg:text-left">

        <h1 className="text-3xl lg:text-4xl font-bold text-textPrimary font-clash-display">
          Welcome back
        </h1>
        <p className="mt-2 text-textSecondary">
          Please enter your details to sign in.
        </p>
      </div>

      <form onSubmit={formik.handleSubmit} className="mt-8 space-y-5">
        {serverError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {serverError}
          </div>
        )}
        <div className="space-y-4">
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
                {...formik.getFieldProps('email')}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-backgroundSecondary text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${formik.touched.email && formik.errors.email
                  ? 'border-red-500'
                  : 'border-borderPrimary'
                  }`}
                placeholder="Enter your email"
              />
            </div>
            {formik.touched.email && formik.errors.email ? (
              <div className="text-red-500 text-xs mt-1">{formik.errors.email}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1.5">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary group-focus-within:text-primary transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                {...formik.getFieldProps('password')}
                className={`block w-full pl-10 pr-12 py-3 border rounded-xl bg-backgroundSecondary text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${formik.touched.password && formik.errors.password
                  ? 'border-red-500'
                  : 'border-borderPrimary'
                  }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-textPrimary hover:text-hoverPrimary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {formik.touched.password && formik.errors.password ? (
              <div className="text-red-500 text-xs mt-1">{formik.errors.password}</div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20"
            />
            <span className="text-textSecondary group-hover:text-textPrimary transition-colors">
              Remember me
            </span>
          </label>
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
             Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {formik.isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="text-center text-sm text-textSecondary">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign up
          </button>
        </div>


      </form>
    </div>
  );
}
