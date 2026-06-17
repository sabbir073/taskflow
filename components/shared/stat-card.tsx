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

const ACCENT_STYLES: Record<StatAccent, string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  accent: "bg-accent/10 text-accent",
};

export function StatCard({ title, value, change, icon: Icon, format = "number", accent = "primary" }: StatCardProps) {
  const displayValue =
    format === "points" && typeof value === "number"
      ? formatPoints(value)
      : format === "percent" && typeof value === "number"
        ? `${value}%`
        : value;

  return (
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
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
        <div className={cn("p-3 rounded-xl shrink-0", ACCENT_STYLES[accent])}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}
