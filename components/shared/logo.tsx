"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

interface Props {
  /** Destination when the logo is clicked. Ignored if onClick is provided. */
  href?: string;
  /** Icon only, no wordmark. */
  compact?: boolean;
  /** Size preset. `md` is the default used on dashboard + auth pages. */
  size?: "sm" | "md" | "lg";
  /** Custom click handler (e.g. landing page scroll-to-top). */
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  /** Hide focus/hover cursor for display-only uses. */
  display?: boolean;
  /** Brand name to display. Defaults to "TaskFlow"; renders with a pretty
      Task / gradient-Flow split. Anything else gets the gradient applied
      to the whole name (respects the admin-editable site_name setting). */
  name?: string;
  className?: string;
}

const SIZES = {
  sm: { box: "h-7 w-7", icon: "h-3.5 w-3.5", text: "text-sm" },
  md: { box: "h-9 w-9", icon: "h-5 w-5", text: "text-lg" },
  lg: { box: "h-12 w-12", icon: "h-6 w-6", text: "text-2xl" },
};

// Shared TaskFlow logo. Used across landing, auth pages, dashboard sidebar,
// mobile nav. Wordmark uses `text-foreground` so it adapts to dark mode;
// "Flow" picks up the brand gradient.
export function Logo({
  href = "/",
  compact = false,
  size = "md",
  onClick,
  display,
  name = "TaskFlow",
  className = "",
}: Props) {
  const s = SIZES[size];
  const isTaskFlow = name === "TaskFlow";
  const body = (
    <>
      <span
        className={`relative grid ${s.box} place-items-center rounded-xl bg-brand-gradient shadow-glow transition-transform group-hover:scale-105 shrink-0`}
      >
        <Zap className={`${s.icon} text-white`} strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className={`${s.text} font-extrabold tracking-tight text-foreground`}>
          {isTaskFlow ? (
            <>
              Task<span className="gradient-text">Flow</span>
            </>
          ) : (
            <span className="gradient-text">{name}</span>
          )}
        </span>
      )}
    </>
  );

  const cls = `group flex items-center gap-2 ${className}`;

  if (display) {
    return <span className={cls}>{body}</span>;
  }

  if (onClick) {
    return (
      <a href={href} onClick={onClick} className={cls}>
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}
