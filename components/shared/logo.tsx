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
  /** Brand name to display. Defaults to "TaskMOS"; renders with a pretty
      Task / gradient-Flow split. Anything else gets the gradient applied
      to the whole name (respects the admin-editable site_name setting). */
  name?: string;
  className?: string;
  /** Override the wordmark text color when the default `text-foreground`
      doesn't have enough contrast against the surrounding surface (e.g.
      on the branded purple/dark gradient used by the auth pages). */
  wordmarkClassName?: string;
}

const SIZES = {
  sm: { box: "h-7 w-7", icon: "h-3.5 w-3.5", text: "text-sm" },
  md: { box: "h-9 w-9", icon: "h-5 w-5", text: "text-lg" },
  lg: { box: "h-12 w-12", icon: "h-6 w-6", text: "text-2xl" },
};

// Shared TaskMOS logo. Used across landing, auth pages, dashboard sidebar,
// mobile nav. Wordmark uses `text-foreground` so it adapts to dark mode;
// "Flow" picks up the brand gradient.
export function Logo({
  href = "/",
  compact = false,
  size = "md",
  onClick,
  display,
  name = "TaskMOS",
  className = "",
  wordmarkClassName = "text-foreground",
}: Props) {
  const s = SIZES[size];
  const isTaskMOS = name === "TaskMOS";
  const body = (
    <>
      <span
        className={`relative grid ${s.box} place-items-center rounded-xl bg-brand-gradient shadow-glow transition-transform group-hover:scale-105 shrink-0`}
      >
        <Zap className={`${s.icon} text-white`} strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className={`${s.text} font-extrabold tracking-tight ${wordmarkClassName}`}>
          {isTaskMOS ? (
            <>
              Task<span className="gradient-text">MOS</span>
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
