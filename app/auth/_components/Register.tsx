"use client";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Mail,
  Lock,
  User,
  Eye as EyeIcon,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import CheckInbox from "./CheckInbox";
import type { ApiError } from "@/app/lib/axios";

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Registration no longer signs anyone in, so this is where the flow ends: the account
  // exists and the next move is in the user's inbox.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const {register} = useAuth();

  const formik = useFormik({
    initialValues: {
      email: "",
      username: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email address").required("Required"),
      username: Yup.string().required("Required"),
      password: Yup.string()
        .min(4, "Must be at least 4 characters")
        .required("Required"),
    }),
    onSubmit: async (values) => {
      setServerError(null);
      try {
        const { email } = await register(values);
        toast.success("Account created. Check your email to verify it.");
        setRegisteredEmail(email);
      } catch (error) {
        setServerError(
          (error as ApiError)?.message ||
            "An unexpected error occurred. Please try again."
        );
      }
    },
  });

  if (registeredEmail) {
    return (
      <CheckInbox
        email={registeredEmail}
        reason="registered"
        onBack={onSwitchToLogin}
      />
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="text-3xl lg:text-4xl font-bold text-textPrimary font-clash-display">
          Create Account
        </h1>
        <p className="mt-2 text-textSecondary">
          Join us today and find your perfect boarding place.
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
                {...formik.getFieldProps("email")}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-backgroundSecondary text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                  formik.touched.email && formik.errors.email
                    ? "border-red-500"
                    : "border-borderPrimary"
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

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1.5">
              User Name
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary group-focus-within:text-primary transition-colors">
                <User className="h-5 w-5" />
              </div>
              <input
                type="text"
                {...formik.getFieldProps("username")}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-backgroundSecondary text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                  formik.touched.username && formik.errors.username
                    ? "border-red-500"
                    : "border-borderPrimary"
                }`}
                placeholder="Enter username"
              />
            </div>
            {formik.touched.username && formik.errors.username ? (
              <div className="text-red-500 text-xs mt-1">
                {formik.errors.username}
              </div>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                {...formik.getFieldProps("password")}
                className={`block w-full pl-10 pr-12 py-3 border rounded-xl bg-backgroundSecondary text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                  formik.touched.password && formik.errors.password
                    ? "border-red-500"
                    : "border-borderPrimary"
                }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-textSecondary hover:text-textPrimary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {formik.touched.password && formik.errors.password ? (
              <div className="text-red-500 text-xs mt-1">
                {formik.errors.password}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {formik.isSubmitting ? "Creating Account..." : "Register"}
        </button>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Already have an account? Sign in
          </button>
        </div>
      </form>
    </div>
  );
}
