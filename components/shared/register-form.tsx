"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { registerUser } from "@/lib/actions/auth";
import { getPlans } from "@/lib/actions/plans";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least 1 uppercase letter")
      .regex(/[0-9]/, "Must contain at least 1 number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least 1 special character"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v === true, { message: "You must accept the terms" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<"plan" | "details">("plan");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getPlans().then((p) => { setPlans(p); setLoadingPlans(false); });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterData) {
    setIsLoading(true);
    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        planId: selectedPlanId || undefined,
      });
      if (result.success) {
        toast.success(result.message || "Account created!");
        router.push("/login");
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full h-12 pl-11 pr-4 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/60
    focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200
    ${hasError ? "border-error ring-1 ring-error/30" : "border-border hover:border-foreground/20"}`;

  // ===== Step 1: Plan Selection =====
  if (step === "plan") {
    return (
      <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
        <div className="px-8 pt-8 pb-2">
          <h2 className="text-2xl font-bold tracking-tight">Choose a Plan</h2>
          <p className="text-sm text-muted-foreground mt-1">Select a plan to get started with TaskFlow</p>
        </div>

        <div className="px-8 py-6">
          {loadingPlans ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => {
                const id = plan.id as number;
                const name = String(plan.name || "");
                const price = Number(plan.price || 0);
                const period = String(plan.period || "");
                const description = String(plan.description || "");
                const features = (plan.features || []) as string[];
                const isSelected = selectedPlanId === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedPlanId(id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-foreground/20 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{name}</h3>
                        {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                      </div>
                      <span className="font-bold text-lg">
                        {price === 0 ? "Free" : `$${price.toFixed(2)}`}
                        {price > 0 && <span className="text-xs text-muted-foreground font-normal">/{period}</span>}
                      </span>
                    </div>
                    {description && <p className="text-xs text-muted-foreground mb-2">{description}</p>}
                    <div className="flex flex-wrap gap-2">
                      {features.slice(0, 3).map((f, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {typeof f === "string" ? f : String(f)}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            disabled={!selectedPlanId}
            onClick={() => setStep("details")}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold mt-6
              hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
              active:translate-y-0 disabled:opacity-40 disabled:hover:shadow-none disabled:hover:translate-y-0
              transition-all duration-200 flex items-center justify-center gap-2"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="border-t border-border/50 px-8 py-5 bg-muted/30">
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  // ===== Step 2: Account Details =====
  const selectedPlan = plans.find((p) => (p.id as number) === selectedPlanId);

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
      <div className="px-8 pt-8 pb-2">
        <button type="button" onClick={() => setStep("plan")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Change plan
        </button>
        <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {String(selectedPlan?.name || "")} Plan
          </span>
          <span className="text-xs text-muted-foreground">
            {Number(selectedPlan?.price || 0) === 0 ? "Free forever" : `$${Number(selectedPlan?.price || 0).toFixed(2)}/${selectedPlan?.period}`}
          </span>
        </div>
      </div>

      <div className="px-8 py-6">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }}
          className="flex flex-col gap-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input {...register("name")} placeholder="John Doe" autoComplete="name" className={inputClass(!!errors.name)} />
            </div>
            {errors.name && <p className="text-xs text-error pl-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input {...register("email")} type="email" placeholder="you@example.com" autoComplete="email" className={inputClass(!!errors.email)} />
            </div>
            {errors.email && <p className="text-xs text-error pl-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 chars, 1 upper, 1 number, 1 special"
                autoComplete="new-password"
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
            {errors.password && <p className="text-xs text-error pl-1">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                {...register("confirmPassword")}
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={inputClass(!!errors.confirmPassword)}
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-error pl-1">{errors.confirmPassword.message}</p>}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 cursor-pointer group mt-1">
            <div className="relative mt-0.5">
              <input type="checkbox" {...register("acceptTerms")} className="peer sr-only" />
              <div className="w-5 h-5 rounded-md border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-all duration-200 flex items-center justify-center">
                <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
              I agree to the <span className="text-primary font-medium">Terms & Conditions</span>
            </span>
          </label>
          {errors.acceptTerms && <p className="text-xs text-error pl-1 -mt-1">{errors.acceptTerms.message}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold mt-1
              hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
              active:translate-y-0 active:shadow-md
              disabled:opacity-60 disabled:hover:shadow-none disabled:hover:translate-y-0
              transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>

      <div className="border-t border-border/50 px-8 py-5 bg-muted/30">
        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
