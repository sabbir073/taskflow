"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { forgotPassword } from "@/lib/actions/auth";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      await forgotPassword(data.email);
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
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
      </div>
    );
  }

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
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
                className={`w-full h-12 pl-11 pr-4 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/60
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200
                  ${errors.email ? "border-error ring-1 ring-error/30" : "border-border hover:border-foreground/20"}`}
              />
            </div>
            {errors.email && <p className="text-xs text-error pl-1">{errors.email.message}</p>}
          </div>

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
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      </div>

      <div className="border-t border-border/50 px-8 py-5 bg-muted/30">
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-primary font-semibold hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
