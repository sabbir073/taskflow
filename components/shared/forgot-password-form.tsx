"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { forgotPassword, resetPassword } from "@/lib/actions/auth";

// ----- Schemas -------------------------------------------------------------

const requestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Mirrors the password rules in `resetPassword` (lib/actions/auth.ts) so the
// client surfaces the failure reason inline before round-tripping the server.
const setNewPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must include 1 uppercase letter")
      .regex(/[0-9]/, "Must include 1 number")
      .regex(/[^A-Za-z0-9]/, "Must include 1 special character"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RequestData = z.infer<typeof requestSchema>;
type SetNewPasswordData = z.infer<typeof setNewPasswordSchema>;

// ----- Container -----------------------------------------------------------

interface Props {
  // Provided when the user landed via the email link
  // (`/forgot-password?token=...`). When absent, render the email-request
  // form. When present, render the set-new-password form.
  token?: string;
}

export function ForgotPasswordForm({ token }: Props) {
  return token ? <SetNewPasswordView token={token} /> : <RequestResetView />;
}

// ----- Mode 1: request reset link -----------------------------------------

function RequestResetView() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestData>({ resolver: zodResolver(requestSchema) });

  async function onSubmit(data: RequestData) {
    setIsLoading(true);
    try {
      await forgotPassword(data.email);
      setSent(true);
    } catch {
      // The action returns a neutral success even when rate-limited or
      // when the email doesn't exist, so a thrown error here is unusual —
      // still flip to "sent" UI to keep enumeration leaks closed.
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <Shell>
        <div className="px-8 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
            If an account exists with that email, we&apos;ve sent a password reset link.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="px-8 pt-8 pb-2">
        <h2 className="text-2xl font-bold tracking-tight">Forgot password?</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter your email and we&apos;ll send you a reset link</p>
      </div>

      <div className="px-8 py-6">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }}
          className="flex flex-col gap-5"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className={inputCls(!!errors.email)}
              />
            </div>
            {errors.email && <p className="text-xs text-error pl-1">{errors.email.message}</p>}
          </div>

          <SubmitButton isLoading={isLoading} idleLabel="Send Reset Link" loadingLabel="Sending..." />
        </form>
      </div>

      <FooterLink />
    </Shell>
  );
}

// ----- Mode 2: set new password (came from email link) --------------------

function SetNewPasswordView({ token }: { token: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetNewPasswordData>({ resolver: zodResolver(setNewPasswordSchema) });

  async function onSubmit(data: SetNewPasswordData) {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await resetPassword(token, data.newPassword);
      if (res.success) {
        setDone(true);
        toast.success("Password reset successfully");
      } else {
        // Surface the real failure (expired link, invalid token, etc.)
        // instead of bouncing back to the email form silently.
        setServerError(res.error || "Couldn't reset your password");
        toast.error(res.error || "Couldn't reset your password");
      }
    } catch {
      setServerError("Something went wrong — please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (done) {
    return (
      <Shell>
        <div className="px-8 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Password reset</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
            Your password has been updated. Sign in with your new password to continue.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            Sign in
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="px-8 pt-8 pb-2">
        <h2 className="text-2xl font-bold tracking-tight">Set a new password</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a strong password for your account.
        </p>
      </div>

      <div className="px-8 py-6">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }}
          className="flex flex-col gap-5"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">New password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                {...register("newPassword")}
                type={showPw ? "text" : "password"}
                placeholder="Min 8 chars, 1 upper, 1 number, 1 special"
                autoComplete="new-password"
                autoFocus
                className={`${inputCls(!!errors.newPassword)} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-error pl-1">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm new password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                {...register("confirmPassword")}
                type={showPw ? "text" : "password"}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className={inputCls(!!errors.confirmPassword)}
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-error pl-1">{errors.confirmPassword.message}</p>}
          </div>

          {serverError && (
            <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
              {serverError}
            </div>
          )}

          <SubmitButton isLoading={isLoading} idleLabel="Reset password" loadingLabel="Resetting..." />
        </form>
      </div>

      <FooterLink />
    </Shell>
  );
}

// ----- Invalid / expired token (rendered by the page server-side) --------

export function InvalidResetTokenView({ reason }: { reason: "expired" | "invalid" }) {
  const isExpired = reason === "expired";
  return (
    <Shell>
      <div className="px-8 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {isExpired ? "Reset link expired" : "Invalid reset link"}
        </h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
          {isExpired
            ? "This password reset link has expired. Reset links are valid for 30 minutes — please request a new one."
            : "This reset link is invalid or has already been used. If you still need to reset your password, request a new link below."}
        </p>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            Request a new link
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </Shell>
  );
}

// ----- Shared bits ---------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
      {children}
    </div>
  );
}

function FooterLink() {
  return (
    <div className="border-t border-border/50 px-8 py-5 bg-muted/30">
      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-primary font-semibold hover:text-primary/80 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Sign In
      </Link>
    </div>
  );
}

function SubmitButton({
  isLoading,
  idleLabel,
  loadingLabel,
}: {
  isLoading: boolean;
  idleLabel: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold
        hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
        active:translate-y-0 active:shadow-md
        disabled:opacity-60 disabled:hover:shadow-none disabled:hover:translate-y-0
        transition-all duration-200 flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> {loadingLabel}</>
      ) : (
        idleLabel
      )}
    </button>
  );
}

function inputCls(hasError: boolean): string {
  return `w-full h-12 pl-11 pr-4 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/60
    focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200
    ${hasError ? "border-error ring-1 ring-error/30" : "border-border hover:border-foreground/20"}`;
}
