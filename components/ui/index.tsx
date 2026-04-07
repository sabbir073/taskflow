/**
 * Custom styled UI primitives for TaskFlow.
 * These replace HeroUI's unstyled components with consistent, modern styling.
 */

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ===== CARD =====

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pt-6 pb-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-bold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground mt-0.5", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-4 border-t border-border/50 bg-muted/30", className)} {...props} />;
}

// ===== INPUT =====

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full h-11 px-4 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/60",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200",
        error ? "border-error ring-1 ring-error/20" : "border-border hover:border-foreground/20",
        props.disabled && "bg-muted/50 text-muted-foreground cursor-not-allowed hover:border-border",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ===== TEXTAREA =====

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-4 py-3 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/60 min-h-[80px] resize-y",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200",
        error ? "border-error ring-1 ring-error/20" : "border-border hover:border-foreground/20",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

// ===== SELECT =====

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  ({ className, error, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full h-11 px-4 rounded-xl border bg-background text-sm appearance-none",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717A%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10",
        error ? "border-error ring-1 ring-error/20" : "border-border hover:border-foreground/20",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";

// ===== LABEL =====

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}

// ===== FIELD ERROR =====

export function FieldError({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-error pl-1", className)} {...props}>{children}</p>;
}

// ===== BUTTON =====

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0",
  secondary: "bg-muted text-foreground hover:bg-muted/80",
  outline: "border border-border bg-card hover:bg-muted",
  ghost: "hover:bg-muted",
  danger: "bg-error text-white hover:bg-error/90",
};

const buttonSizes: Record<string, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm",
};

export function Btn({ variant = "primary", size = "md", isLoading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200",
        "disabled:opacity-60 disabled:pointer-events-none",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ===== BADGE =====

type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "accent";

const badgeStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  accent: "bg-accent/10 text-accent",
};

export function Badge({ variant = "default", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", badgeStyles[variant], className)} {...props} />;
}

// ===== SEPARATOR =====

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t border-border/50", className)} {...props} />;
}

// ===== ICON INPUT WRAPPER =====

export function IconInput({
  icon: Icon,
  error,
  className,
  children,
}: {
  icon: React.ElementType;
  error?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative group", className)}>
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
      {children}
    </div>
  );
}
