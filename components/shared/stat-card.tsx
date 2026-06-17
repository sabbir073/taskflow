"use client";

import { Card, CardContent } from "@/components/ui";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatPoints } from "@/lib/utils";

type StatAccent = "primary" | "warning" | "success" | "accent";

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ElementType;
  format?: "number" | "points" | "percent";
  accent?: StatAccent;
}

// Gradient icon tiles + matching soft glow per accent — replaces the old flat
// bg-{accent}/10 tiles for a more modern, depthful look.
const ACCENT_GRADIENT: Record<StatAccent, string> = {
  primary: "bg-linear-to-br from-primary to-accent shadow-primary/30",
  warning: "bg-linear-to-br from-amber-500 to-orange-500 shadow-amber-500/30",
  success: "bg-linear-to-br from-emerald-500 to-green-500 shadow-emerald-500/30",
  accent: "bg-linear-to-br from-pink-500 to-rose-500 shadow-pink-500/30",
};

// Hover shadow tint per accent so the card lift glows in its own colour.
const ACCENT_HOVER: Record<StatAccent, string> = {
  primary: "hover:shadow-primary/15",
  warning: "hover:shadow-amber-500/15",
  success: "hover:shadow-emerald-500/15",
  accent: "hover:shadow-pink-500/15",
};

export function StatCard({ title, value, change, icon: Icon, format = "number", accent = "primary" }: StatCardProps) {
  const displayValue =
    format === "points" && typeof value === "number"
      ? formatPoints(value)
      : format === "percent" && typeof value === "number"
        ? `${value}%`
        : value;

  return (
    <Card className={cn("group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200", ACCENT_HOVER[accent])}>
      <CardContent className="flex flex-row items-start justify-between p-5">
        <div className="space-y-2 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{displayValue}</p>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", change >= 0 ? "text-success" : "text-error")}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl shrink-0 text-white shadow-md transition-transform duration-200 group-hover:scale-105", ACCENT_GRADIENT[accent])}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}
