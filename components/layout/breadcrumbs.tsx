"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  tasks: "Tasks",
  groups: "Groups",
  users: "Users",
  reports: "Reports",
  settings: "Settings",
  profile: "Profile",
  notifications: "Notifications",
  "landing-editor": "Landing Editor",
  leaderboard: "Leaderboard",
  approvals: "Approvals",
  create: "Create",
  review: "Review",
};

export function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.startsWith("("));

  if (segments.length === 0) return null;

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="w-4 h-4" />
      </Link>
      {segments.map((segment, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const label = labelMap[segment] || segment;
        const isLast = i === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
