"use client";

import { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardFooter, Input, Btn, Select, Badge, Modal } from "@/components/ui";
import { Search, MoreHorizontal, Shield, UserX, UserCheck, Trash2, Coins, CreditCard, Eye, EyeOff, X, Trophy, Target, Flame, Calendar, Plus, Minus, CheckCircle, XCircle, Clock, ShieldCheck, ShieldAlert, Download, Loader2, Users as UsersIcon, KeyRound, Mail, Sparkles, Copy } from "lucide-react";
import { useUsers, useUpdateUserRole, useUpdateUserStatus, useDeleteUser, useAssignPoints, useApproveUser, useRejectUser, useAdminSendPasswordReset, useAdminSetUserPassword } from "@/hooks/use-users";
import { getUserById } from "@/lib/actions/users";
import { exportUsersCsv } from "@/lib/actions/exports";
import { toast } from "sonner";
import { usePlans, useAdminAssignSubscription } from "@/hooks/use-plans";
import { ConfirmDialog } from "./confirm-dialog";
import { getInitials, formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { UserRole, UserStatus } from "@/types/database";

const STATUS_VARIANT: Record<string, "success" | "warning" | "error"> = { active: "success", suspended: "warning", banned: "error" };

// Extracts the display fields off a profiles+users joined row. Shared by the
// desktop table row and the mobile card so the two layouts never drift.
function getUserRowFields(row: Record<string, unknown>) {
  const u = row.users as Record<string, unknown> | undefined;
  return {
    userId: (u?.id || row.user_id) as string,
    name: String(u?.name || "Unknown"),
    email: String(u?.email || ""),
    image: (u?.image as string | null | undefined) || null,
    emailVerified: !!u?.email_verified,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    isApproved: row.is_approved !== false,
    points: Number(row.total_points || 0),
    tasks: Number(row.tasks_completed || 0),
    joined: String(u?.created_at || row.created_at || ""),
  };
}

export function UsersTable({ currentUserRole }: { currentUserRole: UserRole }) {
  // Moderators cannot promote anyone to admin/super_admin (privilege
  // escalation guard) — hide that option from the per-row action menu.
  const canPromoteToAdmin = currentUserRole === "super_admin" || currentUserRole === "admin";
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
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ userId: string; role: UserRole; label: string; description: string } | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ userId: string; status: UserStatus; label: string; description: string } | null>(null);
  // Password-reset dialog target — captures the userId AND email so the
  // dialog can echo "Send reset link to <email>" without a second fetch.
  const [passwordResetTarget, setPasswordResetTarget] = useState<{ userId: string; email: string } | null>(null);
  const pointsTitleId = useId();
  const viewProfileTitleId = useId();

  async function openProfile(userId: string) {
    setLoadingProfile(true);
    const data = await getUserById(userId);
    setViewProfile(data as Record<string, unknown> | null);
    setLoadingProfile(false);
  }

  // Position + open the portal action menu. Shared by the desktop table cell
  // and the mobile card so both triggers use identical placement logic.
  function openActionMenu(e: React.MouseEvent<HTMLButtonElement>, userId: string) {
    if (openMenu === userId) { setOpenMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const MENU_WIDTH = 184;
    const MENU_HEIGHT = 360; // bumped from 320 — menu grew to ~12 items (Entry #31)
    const PAD = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const goUp = spaceBelow < MENU_HEIGHT + PAD && spaceAbove > spaceBelow;
    let top = goUp
      ? Math.max(PAD, rect.top - 4 - MENU_HEIGHT)
      : Math.min(window.innerHeight - MENU_HEIGHT - PAD, rect.bottom + 4);
    if (top < PAD) top = PAD;
    setMenuPos({
      top,
      left: Math.max(PAD, Math.min(window.innerWidth - MENU_WIDTH - PAD, rect.right - MENU_WIDTH)),
      placement: goUp ? "up" : "down",
    });
    setOpenMenu(userId);
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
      {/* Filter row — mobile: search + icon-Export on top, 3 filters in a
          2-col grid below. sm+: everything flows inline as one row. */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-3">
        <div className="flex gap-3 sm:contents">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Btn variant="outline" onClick={handleExport} disabled={exporting} className="shrink-0 sm:order-last">
            {exporting ? <Loader2 className="w-3.5 h-3.5 sm:mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 sm:mr-1" />}
            <span className="hidden sm:inline">Export CSV</span>
          </Btn>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="sm:w-44">
            <option value="">All Roles</option><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="moderator">Moderator</option><option value="group_leader">Group Leader</option><option value="user">Member</option>
          </Select>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="sm:w-44">
            <option value="">All Statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option>
          </Select>
          <Select value={approvalFilter} onChange={(e) => { setApprovalFilter(e.target.value as "" | "pending" | "approved"); setPage(1); }} className="col-span-2 sm:col-span-1 sm:w-44">
            <option value="">All Approvals</option>
            <option value="pending">Awaiting Approval</option>
            <option value="approved">Approved</option>
          </Select>
        </div>
      </div>

      {/* DESKTOP — full table (lg+). Mobile/tablet use the card list below. */}
      <Card className="hidden lg:block">
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
                  const { userId, name, email, image, emailVerified, role, status, isApproved, points, tasks, joined } = getUserRowFields(row);

                  return (
                    <tr key={userId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <button onClick={() => openProfile(userId)} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden shrink-0">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={image} alt="" className="w-full h-full rounded-lg object-cover" />
                            ) : (
                              getInitials(name)
                            )}
                          </div>
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
                          onClick={(e) => openActionMenu(e, userId)}
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

      {/* MOBILE / TABLET — stacked cards (<lg). Same row data + action menu
          as the desktop table; no horizontal scrolling. */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent><div className="h-20 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
          ))
        ) : users.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No users found</CardContent></Card>
        ) : (
          users.map((row) => {
            const { userId, name, email, image, emailVerified, role, status, isApproved, points, tasks, joined } = getUserRowFields(row);
            return (
              <Card key={userId} className="overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <button onClick={() => openProfile(userId)} className="shrink-0" aria-label={`View ${name}'s profile`}>
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(name)
                      )}
                    </div>
                  </button>
                  <button onClick={() => openProfile(userId)} className="flex-1 min-w-0 text-left">
                    <p className="font-semibold truncate flex items-center gap-1.5">
                      {name}
                      {emailVerified ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" aria-label="Email verified" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0" aria-label="Email not verified" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <Badge variant="primary">{ROLE_LABELS[role] || role}</Badge>
                      <Badge variant={STATUS_VARIANT[status] || "default"}>{status}</Badge>
                      {!isApproved && <Badge variant="warning"><Clock className="w-2.5 h-2.5 mr-0.5" /> Pending</Badge>}
                    </div>
                  </button>
                  <button onClick={(e) => openActionMenu(e, userId)} className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0" aria-label="User actions">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20 flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-warning" /> <span className="font-semibold text-foreground">{points.toFixed(2)}</span> pts</span>
                  <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-success" /> <span className="font-semibold text-foreground">{tasks}</span> tasks</span>
                  <span className="ml-auto text-muted-foreground">{formatDate(joined)}</span>
                </div>
              </Card>
            );
          })
        )}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-2">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({data?.total || 0})</p>
            <div className="flex gap-2">
              <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
              <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
            </div>
          </div>
        )}
      </div>

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
        const rowUser = row.users as Record<string, unknown> | undefined;
        const rowEmail = String(rowUser?.email || "");
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
              {canPromoteToAdmin && (
                <button onClick={() => { setRoleChangeTarget({ userId, role: "admin", label: "Make Admin", description: "Promote this user to Admin? Admins can manage users, tasks, plans, and most system settings." }); setOpenMenu(null); }} className={itemCls}><Shield className={`${iconCls} text-muted-foreground`} /> Make Admin</button>
              )}
              <button onClick={() => { setRoleChangeTarget({ userId, role: "moderator", label: "Make Moderator", description: "Promote this user to Moderator? Moderators can manage users, tasks, payments, and approve signups, but cannot change system settings." }); setOpenMenu(null); }} className={itemCls}><Shield className={`${iconCls} text-muted-foreground`} /> Make Moderator</button>
              <button onClick={() => { setRoleChangeTarget({ userId, role: "group_leader", label: "Make Group Leader", description: "Promote this user to Group Leader? Group Leaders can manage their own groups and members." }); setOpenMenu(null); }} className={itemCls}><UsersIcon className={`${iconCls} text-muted-foreground`} /> Make Group Leader</button>
              <button onClick={() => { setRoleChangeTarget({ userId, role: "user", label: "Make Member", description: "Demote this user to a regular Member? They will lose any elevated permissions." }); setOpenMenu(null); }} className={itemCls}><UserCheck className={`${iconCls} text-muted-foreground`} /> Make Member</button>
              {status === "active" ? (
                <button onClick={() => { setStatusChangeTarget({ userId, status: "suspended", label: "Suspend User", description: "Suspend this user? They will lose access until reactivated." }); setOpenMenu(null); }} className={itemCls}><UserX className={`${iconCls} text-muted-foreground`} /> Suspend</button>
              ) : (
                <button onClick={() => { setStatusChangeTarget({ userId, status: "active", label: "Activate User", description: "Activate this user? They will regain access immediately." }); setOpenMenu(null); }} className={itemCls}><UserCheck className={`${iconCls} text-muted-foreground`} /> Activate</button>
              )}
              <button onClick={() => { setPointsTarget(userId); setPointsMode("assign"); setOpenMenu(null); }} className={itemCls}><Plus className={`${iconCls} text-success`} /> Assign Points</button>
              <button onClick={() => { setPointsTarget(userId); setPointsMode("deduct"); setOpenMenu(null); }} className={itemCls}><Minus className={`${iconCls} text-error`} /> Deduct Points</button>
              <button onClick={() => { setPlanTarget(userId); setOpenMenu(null); }} className={itemCls}><CreditCard className={`${iconCls} text-primary`} /> Assign Plan</button>
              <button onClick={() => { setPasswordResetTarget({ userId, email: rowEmail }); setOpenMenu(null); }} className={itemCls}><KeyRound className={`${iconCls} text-primary`} /> Reset Password</button>
              <div className="border-t border-border/50 my-1" />
              <button onClick={() => { setDeleteTarget(userId); setOpenMenu(null); }} className={`${itemCls} text-error hover:bg-error/5`}><Trash2 className={iconCls} /> Ban &amp; Anonymize</button>
            </div>
          </>,
          document.body
        );
      })()}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) removeUser.mutate(deleteTarget); setDeleteTarget(null); }} title="Ban & Anonymize User" description="This will ban the user and anonymize their data. This action cannot be undone." confirmLabel="Ban & Anonymize" isLoading={removeUser.isPending} />

      {passwordResetTarget && (
        <PasswordResetDialog
          userId={passwordResetTarget.userId}
          email={passwordResetTarget.email}
          onClose={() => setPasswordResetTarget(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!roleChangeTarget}
        onClose={() => setRoleChangeTarget(null)}
        onConfirm={() => {
          if (roleChangeTarget) updateRole.mutate({ userId: roleChangeTarget.userId, role: roleChangeTarget.role });
          setRoleChangeTarget(null);
        }}
        title={roleChangeTarget?.label || "Change Role"}
        description={roleChangeTarget?.description || ""}
        confirmLabel={roleChangeTarget?.label || "Confirm"}
        isLoading={updateRole.isPending}
      />

      <ConfirmDialog
        isOpen={!!statusChangeTarget}
        onClose={() => setStatusChangeTarget(null)}
        onConfirm={() => {
          if (statusChangeTarget) updateStatus.mutate({ userId: statusChangeTarget.userId, status: statusChangeTarget.status });
          setStatusChangeTarget(null);
        }}
        title={statusChangeTarget?.label || "Change Status"}
        description={statusChangeTarget?.description || ""}
        confirmLabel={statusChangeTarget?.label || "Confirm"}
        isLoading={updateStatus.isPending}
      />

      <Modal
        isOpen={!!pointsTarget}
        onClose={() => setPointsTarget(null)}
        labelledBy={pointsTitleId}
        backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        panelClassName="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border"
      >
        {!!pointsTarget && (
          <>
            <h3 id={pointsTitleId} className="text-lg font-bold mb-4 flex items-center gap-2">
              {pointsMode === "assign" ? <Plus className="w-5 h-5 text-success" /> : <Minus className="w-5 h-5 text-error" />}
              {pointsMode === "assign" ? "Assign Points" : "Deduct Points"}
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount</label>
                <div className="relative">
                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" step="0.01" min="1" value={pointsAmount} onChange={(e) => setPointsAmount(e.target.value)} placeholder="e.g. 100" autoFocus className="pl-11" />
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
                  disabled={!pointsAmount || parseFloat(pointsAmount) < 1}
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
          </>
        )}
      </Modal>

      {/* Assign Plan modal */}
      {!!planTarget && (
        <AssignPlanModal
          userId={planTarget}
          plans={plans || []}
          onClose={() => setPlanTarget(null)}
        />
      )}

      {/* User Profile Modal */}
      <Modal
        isOpen={!!viewProfile || loadingProfile}
        onClose={() => setViewProfile(null)}
        labelledBy={viewProfileTitleId}
        ariaLabel={viewProfile ? undefined : "Loading user profile"}
        backdropClassName="fixed inset-0 z-50 bg-black/50 flex sm:items-center sm:justify-center sm:p-4"
        panelClassName="flex flex-col w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] bg-card sm:rounded-2xl shadow-2xl sm:border border-border overflow-hidden"
      >
        {loadingProfile ? (
          <div className="flex-1 flex items-center justify-center p-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : viewProfile ? (() => {
              const vu = viewProfile.user as Record<string, unknown>;
              const vp = viewProfile.profile as Record<string, unknown> | null;
              const vs = viewProfile.stats as Record<string, unknown> | null;
              const vName = String(vu?.name || "Unknown");
              const vEmail = String(vu?.email || "");
              const vImage = (vu?.image as string | null | undefined) || null;
              const vRole = String(vp?.role || "user") as UserRole;
              const vStatus = String(vp?.status || "active") as UserStatus;
              const vPoints = Number(vp?.total_points || 0);
              const vTasks = Number(vp?.tasks_completed || 0);
              const vStreak = Number(vp?.current_streak || 0);
              const vJoined = String(vu?.created_at || "");
              const vPhone = String(vp?.phone || "");
              const vApproved = vp?.is_approved !== false;
              const vSub = viewProfile.subscription as Record<string, unknown> | null;

              return (
                <>
                  {/* Header */}
                  <div className="h-20 bg-gradient-to-r from-primary to-accent relative flex-shrink-0">
                    <button onClick={() => setViewProfile(null)} className="absolute top-3 right-3 p-2 rounded-lg bg-black/20 text-white hover:bg-black/40 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute -bottom-8 left-5 sm:left-6">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold border-4 border-card shadow-lg overflow-hidden">
                        {vImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={vImage} alt="" className="w-full h-full rounded-[8px] object-cover" />
                        ) : (
                          getInitials(vName)
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pt-12 px-5 sm:px-6 pb-4">
                    {/* Identity row: name/email/badges on left, plan card on right (sm+) */}
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 id={viewProfileTitleId} className="text-lg font-bold break-words">{vName}</h3>
                        <p className="text-sm text-muted-foreground break-all">{vEmail}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="primary">{ROLE_LABELS[vRole] || vRole}</Badge>
                          <Badge variant={STATUS_VARIANT[vStatus] || "default"}>{vStatus}</Badge>
                          {!vApproved && <Badge variant="warning">Pending Approval</Badge>}
                        </div>
                      </div>

                      {/* Subscription / plan — compact card on the right */}
                      <div className="sm:w-56 sm:flex-shrink-0">
                        {vSub ? (() => {
                          const planName = String(vSub.planName || "Plan");
                          const period = String(vSub.periodType || "monthly") as BillingPeriod;
                          const expiresAt = vSub.expiresAt ? String(vSub.expiresAt) : null;
                          const isExpired = !!vSub.isExpired;
                          const credits = Number(vSub.includedCredits || 0);
                          const maxTasks = vSub.maxTasks as number | null;
                          const maxGroups = vSub.maxGroups as number | null;
                          return (
                            <div className={`p-3 rounded-xl border ${isExpired ? "border-warning/30 bg-warning/5" : "border-primary/30 bg-primary/5"}`}>
                              <div className="flex items-center gap-2">
                                <CreditCard className={`w-4 h-4 flex-shrink-0 ${isExpired ? "text-warning" : "text-primary"}`} />
                                <p className="text-sm font-bold truncate flex-1">{planName}</p>
                                <Badge variant={isExpired ? "warning" : "primary"}>
                                  {isExpired ? "Expired" : (PERIOD_LABEL[period] || period)}
                                </Badge>
                              </div>
                              {expiresAt && (
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  {isExpired ? "Expired" : "Renews"} {formatDate(expiresAt)}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                                <span><strong className="text-foreground">{maxTasks ?? "∞"}</strong> tasks</span>
                                <span><strong className="text-foreground">{maxGroups ?? "∞"}</strong> groups</span>
                                <span><strong className="text-foreground">{credits.toFixed(0)}</strong> credits</span>
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="p-3 rounded-xl border border-border/50 bg-muted/30">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <p className="text-sm font-medium flex-1">No active plan</p>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">Free tier</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                      {[
                        { icon: Trophy, label: "Points", value: vPoints.toFixed(2), color: "text-warning", bg: "bg-warning/10" },
                        { icon: Target, label: "Tasks", value: String(vTasks), color: "text-success", bg: "bg-success/10" },
                        { icon: Flame, label: "Streak", value: `${vStreak}d`, color: "text-accent", bg: "bg-accent/10" },
                        { icon: Calendar, label: "Joined", value: vJoined ? formatDate(vJoined) : "-", color: "text-primary", bg: "bg-primary/10" },
                      ].map((s) => (
                        <div key={s.label} className="p-3 rounded-xl bg-muted/40 text-center">
                          <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                          <p className="text-sm font-bold truncate">{s.value}</p>
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

                  </div>

                  {/* Sticky action bar — app-style bottom toolbar */}
                  <div className="flex-shrink-0 grid grid-cols-3 gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border/50 bg-card">
                    <Btn variant="outline" size="sm" onClick={() => { setPointsTarget(String(vu?.id || "")); setPointsMode("assign"); setViewProfile(null); }}>
                      <Plus className="w-3.5 h-3.5 mr-1 text-success" /> Assign
                    </Btn>
                    <Btn variant="outline" size="sm" onClick={() => { setPointsTarget(String(vu?.id || "")); setPointsMode("deduct"); setViewProfile(null); }}>
                      <Minus className="w-3.5 h-3.5 mr-1 text-error" /> Deduct
                    </Btn>
                    <Btn variant="outline" size="sm" onClick={() => { setPlanTarget(String(vu?.id || "")); setViewProfile(null); }}>
                      <CreditCard className="w-3.5 h-3.5 mr-1" /> Plan
                    </Btn>
                  </div>
                </>
              );
            })() : null}
      </Modal>
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
  const titleId = useId();

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
    <Modal
      isOpen={true}
      onClose={onClose}
      labelledBy={titleId}
      backdropClassName="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      panelClassName="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-auto"
    >
        <div className="p-5 border-b border-border/60 flex items-start justify-between gap-3">
          <div>
            <h3 id={titleId} className="text-lg font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Assign Subscription Plan</h3>
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
                      onClick={() => {
                        setSelectedPlanId(id);
                        // Auto-pick a valid period for the chosen plan so the modal
                        // never submits a period that the plan doesn't price.
                        const available: BillingPeriod[] = [];
                        if (plan.price_monthly != null) available.push("monthly");
                        if (plan.price_half_yearly != null) available.push("half_yearly");
                        if (plan.price_yearly != null) available.push("yearly");
                        if (available.length === 0) {
                          available.push((String(plan.period || "monthly") as BillingPeriod));
                        }
                        if (!available.includes(selectedPeriod)) {
                          setSelectedPeriod(available[0]);
                        }
                      }}
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
    </Modal>
  );
}

// ----------------------------------------------------------------------------
// PasswordResetDialog — admin tool to recover any user's password.
// ----------------------------------------------------------------------------
// Two modes the admin picks via a top toggle:
//   • "email"  : server creates a 30-min /forgot-password token and emails
//                the user a reset link. Admin never sees the password.
//   • "direct" : admin types or generates a password. Server hashes + saves
//                immediately and emails the user a confirmation. The new
//                password is shown ONCE in a copy-able field so the admin
//                can share it out-of-band.
// Both paths gated server-side by isStaffRole + per-actor rate limit and
// land an audit row via recordAudit.
function PasswordResetDialog({
  userId,
  email,
  onClose,
}: {
  userId: string;
  email: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"email" | "direct">("email");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [resultPw, setResultPw] = useState<string | null>(null);
  const sendReset = useAdminSendPasswordReset();
  const setDirect = useAdminSetUserPassword();

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      panelClassName="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
    >
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" /> Reset password
      </h3>
      <p className="text-xs text-muted-foreground mb-4 truncate">{email}</p>

      {/* Mode toggle — segmented control style. */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-lg mb-4">
        <button
          type="button"
          onClick={() => { setMode("email"); setResultPw(null); }}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${mode === "email" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Send reset email
        </button>
        <button
          type="button"
          onClick={() => setMode("direct")}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${mode === "direct" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Set new password
        </button>
      </div>

      {mode === "email" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We&apos;ll email a 30-minute reset link. The user picks their own password.
          </p>
          <Btn
            className="w-full"
            isLoading={sendReset.isPending}
            onClick={() => sendReset.mutate(userId, {
              onSuccess: (r) => { if (r.success) onClose(); },
            })}
          >
            <Mail className="w-4 h-4 mr-2" /> Send reset link
          </Btn>
          <Btn variant="outline" className="w-full" onClick={onClose}>Cancel</Btn>
        </div>
      ) : resultPw ? (
        // Post-set state — show the password once so the admin can copy it
        // and share it with the user out-of-band.
        <div className="space-y-3">
          <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning flex items-start gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-px" />
            <span>Copy this password now. We won&apos;t show it again.</span>
          </div>
          <div className="flex gap-2">
            <Input value={resultPw} readOnly className="font-mono text-sm" />
            <Btn
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(resultPw).then(() => toast.success("Copied"));
              }}
            >
              <Copy className="w-4 h-4" />
            </Btn>
          </div>
          <Btn variant="outline" className="w-full" onClick={onClose}>Close</Btn>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Type or generate a password. The user gets a confirmation email.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Min 8 chars · upper · digit · symbol"
                className="font-mono pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Btn variant="outline" size="sm" onClick={() => setPw(generatePassword())}>
              <Sparkles className="w-4 h-4 mr-1" /> Generate
            </Btn>
          </div>
          <Btn
            variant="primary"
            className="w-full"
            isLoading={setDirect.isPending}
            disabled={pw.length < 8}
            onClick={() => setDirect.mutate(
              { userId, newPassword: pw },
              { onSuccess: (r) => { if (r.success) setResultPw(pw); } },
            )}
          >
            <KeyRound className="w-4 h-4 mr-2" /> Set password
          </Btn>
          <Btn variant="outline" className="w-full" onClick={onClose}>Cancel</Btn>
        </div>
      )}
    </Modal>
  );
}

// Generates a 16-char password that always satisfies the complexity rule
// enforced by adminSetUserPassword (≥8 chars + upper + digit + symbol).
// Skips visually-confusable characters (I/O/l/o/0/1) so an admin reading
// the password aloud doesn't have a dispute over "was that a 0 or an O?".
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_+=?";
  const pick = (s: string, n: number) =>
    Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
  const chars = (pick(upper, 4) + pick(lower, 4) + pick(digits, 4) + pick(symbols, 4)).split("");
  // Fisher-Yates shuffle so categories don't always appear in the same order.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
