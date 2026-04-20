"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardFooter, Input, Btn, Select, Badge } from "@/components/ui";
import { Search, MoreHorizontal, Shield, UserX, UserCheck, Trash2, Coins, CreditCard, Eye, X, Trophy, Target, Flame, Calendar, Plus, Minus, CheckCircle, XCircle, Clock, ShieldCheck, ShieldAlert, Download, Loader2 } from "lucide-react";
import { useUsers, useUpdateUserRole, useUpdateUserStatus, useDeleteUser, useAssignPoints, useApproveUser, useRejectUser } from "@/hooks/use-users";
import { getUserById } from "@/lib/actions/users";
import { exportUsersCsv } from "@/lib/actions/exports";
import { toast } from "sonner";
import { usePlans, useAdminAssignSubscription } from "@/hooks/use-plans";
import { ConfirmDialog } from "./confirm-dialog";
import { getInitials, formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { UserRole, UserStatus } from "@/types/database";

const STATUS_VARIANT: Record<string, "success" | "warning" | "error"> = { active: "success", suspended: "warning", banned: "error" };

export function UsersTable() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<"" | "pending" | "approved">("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [pointsTarget, setPointsTarget] = useState<string | null>(null);
  const [pointsMode, setPointsMode] = useState<"assign" | "deduct">("assign");
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; placement: "up" | "down" } | null>(null);
  // Client-only sentinel — lazily initialised so SSR returns false, then
  // first client render is already true without a setState cascade.
  const [mounted] = useState(() => typeof window !== "undefined");

  // Reposition / close on scroll or resize so a fixed-positioned menu never drifts
  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openMenu]);
  const [planTarget, setPlanTarget] = useState<string | null>(null);
  const [viewProfile, setViewProfile] = useState<Record<string, unknown> | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  async function openProfile(userId: string) {
    setLoadingProfile(true);
    const data = await getUserById(userId);
    setViewProfile(data as Record<string, unknown> | null);
    setLoadingProfile(false);
  }

  const { data, isLoading } = useUsers({ page, pageSize: 20, search, role: roleFilter || undefined, status: statusFilter || undefined, approval: approvalFilter || undefined });
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const removeUser = useDeleteUser();
  const assignPts = useAssignPoints();
  const approveUserMut = useApproveUser();
  const rejectUserMut = useRejectUser();
  const { data: plans } = usePlans();

  const users = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await exportUsersCsv();
      if (!res.success || !res.csv) {
        toast.error(res.error || "Export failed");
      } else {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename || "users.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported");
      }
    } catch {
      toast.error("Export failed");
    }
    setExporting(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="sm:w-44">
          <option value="">All Roles</option><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="group_leader">Group Leader</option><option value="user">Member</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="sm:w-44">
          <option value="">All Statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option>
        </Select>
        <Select value={approvalFilter} onChange={(e) => { setApprovalFilter(e.target.value as "" | "pending" | "approved"); setPage(1); }} className="sm:w-44">
          <option value="">All Approvals</option>
          <option value="pending">Awaiting Approval</option>
          <option value="approved">Approved</option>
        </Select>
        <Btn variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
          Export CSV
        </Btn>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Points</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tasks</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30"><td colSpan={7} className="px-5 py-4"><div className="h-4 bg-muted rounded-lg animate-pulse" /></td></tr>
                )) : users.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No users found</td></tr>
                ) : users.map((row) => {
                  const u = row.users as Record<string, unknown> | undefined;
                  const userId = (u?.id || row.user_id) as string;
                  const name = String(u?.name || "Unknown");
                  const email = String(u?.email || "");
                  const emailVerified = !!u?.email_verified;
                  const role = row.role as UserRole;
                  const status = row.status as UserStatus;
                  const isApproved = row.is_approved !== false;
                  const points = Number(row.total_points || 0);
                  const tasks = Number(row.tasks_completed || 0);
                  const joined = String(u?.created_at || row.created_at || "");

                  return (
                    <tr key={userId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <button onClick={() => openProfile(userId)} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">{getInitials(name)}</div>
                          <div>
                            <p className="font-medium hover:text-primary transition-colors flex items-center gap-1.5">
                              {name}
                              {emailVerified ? (
                                <ShieldCheck className="w-3.5 h-3.5 text-success" aria-label="Email verified" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5 text-warning" aria-label="Email not verified" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-3"><Badge variant="primary">{ROLE_LABELS[role] || role}</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={STATUS_VARIANT[status] || "default"}>{status}</Badge>
                          {!isApproved && (
                            <Badge variant="warning"><Clock className="w-2.5 h-2.5 mr-0.5" /> Pending</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium">{points.toFixed(2)}</td>
                      <td className="px-5 py-3">{tasks}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(joined)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={(e) => {
                            if (openMenu === userId) { setOpenMenu(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const MENU_WIDTH = 184;
                            const MENU_HEIGHT = 320;
                            const PAD = 8;
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const spaceAbove = rect.top;
                            const goUp = spaceBelow < MENU_HEIGHT + PAD && spaceAbove > spaceBelow;
                            let top: number;
                            if (goUp) {
                              top = Math.max(PAD, rect.top - 4 - MENU_HEIGHT);
                            } else {
                              top = Math.min(window.innerHeight - MENU_HEIGHT - PAD, rect.bottom + 4);
                              if (top < PAD) top = PAD;
                            }
                            setMenuPos({
                              top,
                              left: Math.max(PAD, Math.min(window.innerWidth - MENU_WIDTH - PAD, rect.right - MENU_WIDTH)),
                              placement: goUp ? "up" : "down",
                            });
                            setOpenMenu(userId);
                          }}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({data?.total || 0} total)</p>
            <div className="flex gap-2">
              <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
              <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Portal-rendered action menu — escapes table overflow so it's always fully visible */}
      {mounted && openMenu && menuPos && (() => {
        const row = users.find((r) => {
          const u = r.users as Record<string, unknown> | undefined;
          const uid = (u?.id || r.user_id) as string;
          return uid === openMenu;
        });
        if (!row) return null;
        const userId = openMenu;
        const status = row.status as UserStatus;
        const rowApproved = row.is_approved !== false;
        const itemCls = "flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted";
        const iconCls = "w-3.5 h-3.5";
        return createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpenMenu(null)} />
            <div
              className="fixed w-[184px] max-h-[calc(100vh-16px)] overflow-y-auto bg-card rounded-xl border border-border shadow-xl z-[70] py-1"
              style={{ top: menuPos.top, left: menuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => { openProfile(userId); setOpenMenu(null); }} className={itemCls}><Eye className={`${iconCls} text-muted-foreground`} /> View Profile</button>
              {!rowApproved && (
                <>
                  <div className="border-t border-border/50 my-1" />
                  <button onClick={() => { approveUserMut.mutate(userId); setOpenMenu(null); }} className={`${itemCls} text-success hover:bg-success/5`}><CheckCircle className={iconCls} /> Approve Signup</button>
                  <button onClick={() => { rejectUserMut.mutate(userId); setOpenMenu(null); }} className={`${itemCls} text-error hover:bg-error/5`}><XCircle className={iconCls} /> Reject Signup</button>
                </>
              )}
              <div className="border-t border-border/50 my-1" />
              <button onClick={() => { updateRole.mutate({ userId, role: "admin" }); setOpenMenu(null); }} className={itemCls}><Shield className={`${iconCls} text-muted-foreground`} /> Make Admin</button>
              <button onClick={() => { updateRole.mutate({ userId, role: "user" }); setOpenMenu(null); }} className={itemCls}><UserCheck className={`${iconCls} text-muted-foreground`} /> Make Member</button>
              {status === "active" ? (
                <button onClick={() => { updateStatus.mutate({ userId, status: "suspended" }); setOpenMenu(null); }} className={itemCls}><UserX className={`${iconCls} text-muted-foreground`} /> Suspend</button>
              ) : (
                <button onClick={() => { updateStatus.mutate({ userId, status: "active" }); setOpenMenu(null); }} className={itemCls}><UserCheck className={`${iconCls} text-muted-foreground`} /> Activate</button>
              )}
              <button onClick={() => { setPointsTarget(userId); setPointsMode("assign"); setOpenMenu(null); }} className={itemCls}><Plus className={`${iconCls} text-success`} /> Assign Points</button>
              <button onClick={() => { setPointsTarget(userId); setPointsMode("deduct"); setOpenMenu(null); }} className={itemCls}><Minus className={`${iconCls} text-error`} /> Deduct Points</button>
              <button onClick={() => { setPlanTarget(userId); setOpenMenu(null); }} className={itemCls}><CreditCard className={`${iconCls} text-primary`} /> Assign Plan</button>
              <div className="border-t border-border/50 my-1" />
              <button onClick={() => { setDeleteTarget(userId); setOpenMenu(null); }} className={`${itemCls} text-error hover:bg-error/5`}><Trash2 className={iconCls} /> Delete</button>
            </div>
          </>,
          document.body
        );
      })()}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) removeUser.mutate(deleteTarget); setDeleteTarget(null); }} title="Delete User" description="This will ban the user and anonymize their data." confirmLabel="Delete User" isLoading={removeUser.isPending} />

      {!!pointsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPointsTarget(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              {pointsMode === "assign" ? <Plus className="w-5 h-5 text-success" /> : <Minus className="w-5 h-5 text-error" />}
              {pointsMode === "assign" ? "Assign Points" : "Deduct Points"}
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount</label>
                <div className="relative">
                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" step="0.01" min="0" value={pointsAmount} onChange={(e) => setPointsAmount(e.target.value)} placeholder="e.g. 100" autoFocus className="pl-11" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {pointsMode === "assign" ? "This amount will be added to the user's balance" : "This amount will be deducted from the user's balance"}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason</label>
                <Input value={pointsReason} onChange={(e) => setPointsReason(e.target.value)} placeholder={pointsMode === "assign" ? "Reason for assignment" : "Reason for deduction"} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Btn variant="outline" onClick={() => { setPointsTarget(null); setPointsAmount(""); setPointsReason(""); }}>Cancel</Btn>
                <Btn variant={pointsMode === "assign" ? "primary" : "danger"}
                  disabled={!pointsAmount || parseFloat(pointsAmount) <= 0}
                  isLoading={assignPts.isPending}
                  onClick={() => {
                    const amount = parseFloat(pointsAmount);
                    const finalAmount = pointsMode === "deduct" ? -Math.abs(amount) : Math.abs(amount);
                    assignPts.mutate({ userId: pointsTarget, amount: finalAmount, reason: pointsReason });
                    setPointsTarget(null);
                    setPointsAmount("");
                    setPointsReason("");
                  }}>
                  {pointsMode === "assign" ? "Assign" : "Deduct"} Points
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Plan modal */}
      {!!planTarget && (
        <AssignPlanModal
          userId={planTarget}
          plans={plans || []}
          onClose={() => setPlanTarget(null)}
        />
      )}

      {/* User Profile Modal */}
      {(viewProfile || loadingProfile) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewProfile(null)}>
          <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {loadingProfile ? (
              <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : viewProfile ? (() => {
              const vu = viewProfile.user as Record<string, unknown>;
              const vp = viewProfile.profile as Record<string, unknown> | null;
              const vs = viewProfile.stats as Record<string, unknown> | null;
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
                  {/* Header */}
                  <div className="h-20 bg-gradient-to-r from-primary to-accent relative">
                    <button onClick={() => setViewProfile(null)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/20 text-white hover:bg-black/40 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute -bottom-8 left-6">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold border-4 border-card shadow-lg">
                        {getInitials(vName)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-12 px-6 pb-6">
                    {/* Name + badges */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold">{vName}</h3>
                      <p className="text-sm text-muted-foreground">{vEmail}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="primary">{ROLE_LABELS[vRole] || vRole}</Badge>
                        <Badge variant={STATUS_VARIANT[vStatus] || "default"}>{vStatus}</Badge>
                        {!vApproved && <Badge variant="warning">Pending Approval</Badge>}
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { icon: Trophy, label: "Points", value: vPoints.toFixed(2), color: "text-warning", bg: "bg-warning/10" },
                        { icon: Target, label: "Tasks", value: String(vTasks), color: "text-success", bg: "bg-success/10" },
                        { icon: Flame, label: "Streak", value: `${vStreak}d`, color: "text-accent", bg: "bg-accent/10" },
                        { icon: Calendar, label: "Joined", value: vJoined ? formatDate(vJoined) : "-", color: "text-primary", bg: "bg-primary/10" },
                      ].map((s) => (
                        <div key={s.label} className="p-3 rounded-xl bg-muted/40 text-center">
                          <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                          <p className="text-sm font-bold">{s.value}</p>
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Details */}
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

                    {/* Quick actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                      <Btn variant="outline" size="sm" onClick={() => { setPointsTarget(String(vu?.id || "")); setPointsMode("assign"); setViewProfile(null); }}>
                        <Plus className="w-3.5 h-3.5 mr-1 text-success" /> Assign
                      </Btn>
                      <Btn variant="outline" size="sm" onClick={() => { setPointsTarget(String(vu?.id || "")); setPointsMode("deduct"); setViewProfile(null); }}>
                        <Minus className="w-3.5 h-3.5 mr-1 text-error" /> Deduct
                      </Btn>
                      <Btn variant="outline" size="sm" onClick={() => { setPlanTarget(String(vu?.id || "")); setViewProfile(null); }}>
                        <CreditCard className="w-3.5 h-3.5 mr-1" /> Plan
                      </Btn>
                      <Btn variant="ghost" size="sm" className="ml-auto" onClick={() => setViewProfile(null)}>Close</Btn>
                    </div>
                  </div>
                </>
              );
            })() : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Assign Plan modal — admin picks a plan + billing period for a user
// ============================================================================
type BillingPeriod = "monthly" | "half_yearly" | "yearly";
const PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: "Monthly",
  half_yearly: "6 Months",
  yearly: "Yearly",
};

function currencySymbol(code: string): string {
  const c = (code || "usd").toLowerCase();
  if (c === "bdt") return "৳";
  if (c === "usd") return "$";
  return code.toUpperCase() + " ";
}

function AssignPlanModal({
  userId,
  plans,
  onClose,
}: {
  userId: string;
  plans: Record<string, unknown>[];
  onClose: () => void;
}) {
  const assignSub = useAdminAssignSubscription();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("monthly");

  const selected = plans.find((p) => (p.id as number) === selectedPlanId);

  // Available tiers for the selected plan
  const tiers: { key: BillingPeriod; price: number }[] = [];
  if (selected) {
    if (selected.price_monthly != null) tiers.push({ key: "monthly", price: Number(selected.price_monthly) });
    if (selected.price_half_yearly != null) tiers.push({ key: "half_yearly", price: Number(selected.price_half_yearly) });
    if (selected.price_yearly != null) tiers.push({ key: "yearly", price: Number(selected.price_yearly) });
    if (tiers.length === 0) {
      tiers.push({ key: (String(selected.period || "monthly") as BillingPeriod), price: Number(selected.price || 0) });
    }
  }
  const currency = selected ? String(selected.currency || "usd") : "usd";
  const activeTier = tiers.find((t) => t.key === selectedPeriod) || tiers[0];

  function handleAssign() {
    if (!selectedPlanId) return;
    assignSub.mutate(
      { userId, planId: selectedPlanId, period: selectedPeriod },
      { onSuccess: () => onClose() }
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border/60 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Assign Subscription Plan</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Pick a plan + billing period. Included credits are added to the user&apos;s wallet instantly.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No plans available. Create one from Payments → Plans.</p>
          ) : (
            <>
              {/* Plan list */}
              <div className="space-y-2">
                {plans.map((plan) => {
                  const id = plan.id as number;
                  const name = String(plan.name || "");
                  const description = String(plan.description || "");
                  const maxTasks = plan.max_tasks as number | null | undefined;
                  const maxGroups = plan.max_groups as number | null | undefined;
                  const credits = Number(plan.included_credits || 0);
                  const isSelected = selectedPlanId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedPlanId(id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{name}</p>
                        {isSelected && <Badge variant="primary">Selected</Badge>}
                      </div>
                      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span><strong className="text-foreground">{maxTasks ?? "∞"}</strong> tasks</span>
                        <span><strong className="text-foreground">{maxGroups ?? "∞"}</strong> groups</span>
                        <span><strong className="text-foreground">{credits.toFixed(0)}</strong> credits</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Period picker (only once a plan is selected) */}
              {selected && tiers.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <label className="text-sm font-medium">Billing Period</label>
                  <div className="grid grid-cols-3 gap-2">
                    {tiers.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setSelectedPeriod(t.key)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          (selectedPeriod === t.key || (tiers.length === 1))
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-muted/20"
                        }`}
                      >
                        <p className="text-[11px] text-muted-foreground">{PERIOD_LABEL[t.key]}</p>
                        <p className="text-sm font-bold mt-0.5">{currencySymbol(currency)}{t.price.toFixed(0)}</p>
                      </button>
                    ))}
                  </div>
                  {activeTier && (
                    <div className="p-3 rounded-xl bg-muted/30 text-xs text-muted-foreground">
                      Total: <span className="font-semibold text-foreground">{currencySymbol(currency)}{activeTier.price.toFixed(2)}</span>
                      {" • "}Period: <span className="font-semibold text-foreground">{PERIOD_LABEL[activeTier.key]}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t border-border/60 flex gap-3 justify-end">
          <Btn variant="outline" type="button" onClick={onClose}>Cancel</Btn>
          <Btn
            type="button"
            disabled={!selectedPlanId || assignSub.isPending}
            isLoading={assignSub.isPending}
            onClick={handleAssign}
          >
            Assign Plan
          </Btn>
        </div>
      </div>
    </div>
  );
}
