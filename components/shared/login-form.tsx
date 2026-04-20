"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Loader2, Clock, ShieldAlert } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isPending = errorParam === "PendingApproval";
  const isBanned = errorParam === "AccountBlocked";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  async function onSubmit(data: LoginData) {
    setIsLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-2">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
      </div>

      {/* Pending approval banner */}
      {isPending && (
        <div className="mx-8 mt-6 rounded-xl border border-warning/30 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5 text-warning" />
            </div>
            <div>
              <p className="font-semibold text-sm">Your account is awaiting approval</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Thanks for signing up! An admin needs to review and approve your account before you can access the dashboard.
                You&apos;ll receive an email as soon as you&apos;re approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banned banner */}
      {isBanned && (
        <div className="mx-8 mt-6 rounded-xl border border-error/30 bg-gradient-to-br from-error/10 via-error/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4.5 h-4.5 text-error" />
            </div>
            <div>
              <p className="font-semibold text-sm">Account blocked</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your account has been banned. If you believe this is a mistake, please contact support.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="px-8 py-6">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }}
          className="flex flex-col gap-5"
        >
          {error && (
            <div className="bg-error/10 text-error text-sm px-4 py-3 rounded-xl border border-error/20 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-error shrink-0" />
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
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
            {errors.email && (
              <p className="text-xs text-error pl-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`w-full h-12 pl-11 pr-12 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/60
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200
                  ${errors.password ? "border-error ring-1 ring-error/30" : "border-border hover:border-foreground/20"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-error pl-1">{errors.password.message}</p>
            )}
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 rounded-md border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-all duration-200 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
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
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 px-8 py-5 bg-muted/30">
        <p className="text-sm text-center text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-semibold hover:text-primary/80 transition-colors">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
