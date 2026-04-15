"use client";

import { useEffect, useState } from "react";
import { Badge, Btn } from "@/components/ui";
import { Trophy, Target, Flame, Calendar, X, Mail, Sparkles, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { getUserById } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { getInitials, formatDate } from "@/lib/utils";
import type { UserRole, UserStatus } from "@/types/database";

const STATUS_VARIANT: Record<string, "success" | "warning" | "error"> = {
  active: "success",
  suspended: "warning",
  banned: "error",
};

const PERIOD_LABEL: Record<string, string> = {
  monthly: "Monthly",
  half_yearly: "6 Months",
  yearly: "Yearly",
  forever: "Forever",
};

interface Props {
  userId: string | null;
  onClose: () => void;
}

// Read-only profile modal — used by admins viewing a user from anywhere
// (users table, group detail, etc).
export function UserProfileModal({ userId, onClose }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setData(null); return; }
    setLoading(true);
    getUserById(userId).then((d) => {
      setData(d as Record<string, unknown> | null);
      setLoading(false);
    });
  }, [userId]);

  if (!userId) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !data ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (() => {
          const vu = data.user as Record<string, unknown>;
          const vp = data.profile as Record<string, unknown> | null;
          const vs = data.stats as Record<string, unknown> | null;
          const vName = String(vu?.name || "Unknown");
          const vEmail = String(vu?.email || "");
          const vRole = String(vp?.role || "user") as UserRole;
          const vStatus = String(vp?.status || "active") as UserStatus;
          const vPoints = Number(vp?.total_points || 0);
          const vTasks = Number(vp?.tasks_completed || 0);
          const vStreak = Number(vp?.current_streak || 0);
          const vJoined = String(vu?.created_at || "");
          const vPhone = String(vp?.phone || "");
          const vApproved = vp?.is_approved !== false;

          return (
            <>
              <div className="h-20 bg-gradient-to-r from-primary to-accent relative">
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/20 text-white hover:bg-black/40 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute -bottom-8 left-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold border-4 border-card shadow-lg">
                    {getInitials(vName)}
                  </div>
                </div>
              </div>

              <div className="pt-12 px-6 pb-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold">{vName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {vEmail}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="primary">{ROLE_LABELS[vRole] || vRole}</Badge>
                    <Badge variant={STATUS_VARIANT[vStatus] || "default"}>{vStatus}</Badge>
                    {!vApproved && <Badge variant="warning">Pending Approval</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { icon: Trophy, label: "Points", value: vPoints.toFixed(2), color: "text-warning" },
                    { icon: Target, label: "Tasks", value: String(vTasks), color: "text-success" },
                    { icon: Flame, label: "Streak", value: `${vStreak}d`, color: "text-accent" },
                    { icon: Calendar, label: "Joined", value: vJoined ? formatDate(vJoined) : "-", color: "text-primary" },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-xl bg-muted/40 text-center">
                      <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                      <p className="text-sm font-bold">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Subscription */}
                {(() => {
                  const sub = data.subscription as Record<string, unknown> | null | undefined;
                  if (!sub) {
                    return (
                      <div className="p-3 rounded-xl border border-dashed border-border/60 bg-muted/20 flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">No active subscription</p>
                      </div>
                    );
                  }
                  const planName = String(sub.planName || "—");
                  const periodType = String(sub.periodType || "");
                  const expiresAt = sub.expiresAt as string | null;
                  const isExpired = sub.isExpired === true;
                  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
                  return (
                    <div className={`rounded-xl border p-3 mb-4 ${isExpired ? "border-error/40 bg-error/[0.04]" : daysLeft != null && daysLeft <= 7 ? "border-warning/40 bg-warning/[0.04]" : "border-primary/30 bg-primary/[0.03]"}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles className="w-4 h-4 text-primary shrink-0" />
                          <p className="text-sm font-semibold truncate">{planName}</p>
                          {periodType && <Badge variant="primary">{PERIOD_LABEL[periodType] || periodType}</Badge>}
                        </div>
                        {isExpired ? (
                          <Badge variant="error"><AlertTriangle className="w-3 h-3 mr-1" /> Expired</Badge>
                        ) : daysLeft != null && daysLeft <= 7 ? (
                          <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> {daysLeft}d left</Badge>
                        ) : (
                          <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>
                        )}
                      </div>
                      {expiresAt && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          {isExpired ? "Expired on" : "Renews on"} <span className="font-medium text-foreground">{formatDate(expiresAt)}</span>
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-2 text-sm">
                  {vPhone && (
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{vPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-muted-foreground">Groups</span>
                    <span className="font-medium">{Number(vs?.groupCount || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Task Assignments</span>
                    <span className="font-medium">{Number(vs?.taskCount || 0)}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t border-border/50">
                  <Btn variant="outline" size="sm" onClick={onClose}>Close</Btn>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
