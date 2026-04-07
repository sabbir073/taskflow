"use client";

import { Card, CardContent } from "@/components/ui";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatPoints } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ElementType;
  format?: "number" | "points" | "percent";
}

export function StatCard({ title, value, change, icon: Icon, format = "number" }: StatCardProps) {
  const displayValue =
    format === "points" && typeof value === "number"
      ? formatPoints(value)
      : format === "percent" && typeof value === "number"
        ? `${value}%`
        : value;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex flex-row items-start justify-between p-5">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{displayValue}</p>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", change >= 0 ? "text-success" : "text-error")}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
