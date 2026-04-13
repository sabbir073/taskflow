"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui";
import { Megaphone, ChevronDown, ChevronUp } from "lucide-react";
import { useActiveNotices } from "@/hooks/use-notices";
import { formatRelativeTime } from "@/lib/utils";

export function NoticeBoard() {
  const { data: notices, isLoading } = useActiveNotices();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading || !notices || notices.length === 0) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04]">
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Announcements</p>
              <p className="text-xs text-muted-foreground">{notices.length} active {notices.length === 1 ? "notice" : "notices"}</p>
            </div>
          </div>
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </button>

        {!collapsed && (
          <div className="mt-4 space-y-3">
            {notices.map((n) => {
              const id = n.id as number;
              const title = String(n.title || "");
              const body = String(n.body || "");
              const createdAt = n.created_at ? String(n.created_at) : "";
              return (
                <div key={id} className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{title}</p>
                    {createdAt && (
                      <span className="text-[11px] text-muted-foreground shrink-0">{formatRelativeTime(createdAt)}</span>
                    )}
                  </div>
                  {body && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1.5">{body}</p>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
