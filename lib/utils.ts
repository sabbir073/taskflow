import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Strip characters that break out of Supabase PostgREST filter grammar when
// user input is interpolated into `.or()` / `.ilike()` chains. Not SQL
// injection — PostgREST parses its own filter language — but unescaped
// commas/parens/quotes let a search term bleed into adjacent filters. Used
// for search boxes on admin pages (users, broadcasts, audit log).
export function escapePgLikeOr(s: string): string {
  return s.replace(/[,()*"%\\]/g, "").trim().slice(0, 100);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  // Clamp to 0 so brief clock-skew (target slightly in the future) never
  // renders "-5m ago"; we surface "just now" instead.
  const diffMs = Math.max(0, now.getTime() - target.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Plan features arrive as either a JSONB array (already string[]) or a
// stringified JSON array (legacy text column). Normalise both shapes
// into a clean string[] so call sites don't need their own try/catch.
export function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((f): f is string => typeof f === "string" && f.trim().length > 0);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((f): f is string => typeof f === "string" && f.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function formatPoints(points: number): string {
  if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
  return points.toString();
}
