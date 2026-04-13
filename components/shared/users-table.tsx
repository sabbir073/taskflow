"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, Input, Btn, Select, Badge } from "@/components/ui";
import { Search, MoreHorizontal, Shield, UserX, UserCheck, Trash2, Coins, CreditCard, Eye, X, Trophy, Target, Flame, Calendar, Plus, Minus } from "lucide-react";
import { useUsers, useUpdateUserRole, useUpdateUserStatus, useDeleteUser, useAssignPoints } from "@/hooks/use-users";
import { getUserById } from "@/lib/actions/users";
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
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [pointsTarget, setPointsTarget] = useState<string | null>(null);
  const [pointsMode, setPointsMode] = useState<"assign" | "deduct">("assign");
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuDirection, setMenuDirection] = useState<"up" | "down">("down");
  const [planTarget, setPlanTarget] = useState<string | null>(null);
  const [viewProfile, setViewProfile] = useState<Record<string, unknown> | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  async function openProfile(userId: string) {
    setLoadingProfile(true);
    const data = await getUserById(userId);
    setViewProfile(data as Record<string, unknown> | null);
    setLoadingProfile(false);
  }

  const { data, isLoading } = useUsers({ page, pageSize: 20, search, role: roleFilter || undefined, status: statusFilter || undefined });
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const removeUser = useDeleteUser();
  const assignPts = useAssignPoints();
  const { data: plans } = usePlans();
  const assignSub = useAdminAssignSubscription();

  const users = data?.data || [];
  const totalPages = data?.totalPages || 1;

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
                  const role = row.role as UserRole;
                  const status = row.status as UserStatus;
                  const points = Number(row.total_points || 0);
                  const tasks = Number(row.tasks_completed || 0);
                  const joined = String(u?.created_at || row.created_at || "");

                  return (
                    <tr key={userId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <button onClick={() => openProfile(userId)} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">{getInitials(name)}</div>
                          <div><p className="font-medium hover:text-primary transition-colors">{name}</p><p className="text-xs text-muted-foreground">{email}</p></div>
                        </button>
                      </td>
                      <td className="px-5 py-3"><Badge variant="primary">{ROLE_LABELS[role] || role}</Badge></td>
                      <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[status] || "default"}>{status}</Badge></td>
                      <td className="px-5 py-3 font-medium">{points.toFixed(2)}</td>
                      <td className="px-5 py-3">{tasks}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(joined)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="relative inline-block">
                        <button onClick={(e) => {
                          if (openMenu === userId) { setOpenMenu(null); return; }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuDirection(rect.bottom > window.innerHeight - 300 ? "up" : "down");
                          setOpenMenu(userId);
                        }} className="p-2 rounded-lg hover:bg-muted transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu === userId && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                            <div className={`absolute right-0 w-48 bg-card rounded-xl border border-border shadow-xl z-50 py-1 ${
                              menuDirection === "up" ? "bottom-full mb-1" : "top-full mt-1"
                            }`}>
                              <button onClick={() => { openProfile(userId); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><Eye className="w-4 h-4 text-muted-foreground" /> View Profile</button>
                              <div className="border-t border-border/50 my-1" />
                              <button onClick={() => { updateRole.mutate({ userId, role: "admin" }); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><Shield className="w-4 h-4 text-muted-foreground" /> Make Admin</button>
                              <button onClick={() => { updateRole.mutate({ userId, role: "user" }); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><UserCheck className="w-4 h-4 text-muted-foreground" /> Make Member</button>
                              {status === "active" ? (
                                <button onClick={() => { updateStatus.mutate({ userId, status: "suspended" }); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><UserX className="w-4 h-4 text-muted-foreground" /> Suspend</button>
                              ) : (
                                <button onClick={() => { updateStatus.mutate({ userId, status: "active" }); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><UserCheck className="w-4 h-4 text-muted-foreground" /> Activate</button>
                              )}
                              <button onClick={() => { setPointsTarget(userId); setPointsMode("assign"); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><Plus className="w-4 h-4 text-success" /> Assign Points</button>
                              <button onClick={() => { setPointsTarget(userId); setPointsMode("deduct"); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><Minus className="w-4 h-4 text-error" /> Deduct Points</button>
                              <button onClick={() => { setPlanTarget(userId); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><CreditCard className="w-4 h-4 text-primary" /> Assign Plan</button>
                              <div className="border-t border-border/50 my-1" />
                              <button onClick={() => { setDeleteTarget(userId); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error hover:bg-error/5"><Trash2 className="w-4 h-4" /> Delete</button>
                            </div>
                          </>
                        )}
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPlanTarget(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Assign Subscription Plan
            </h3>
            <div className="space-y-3">
              {!plans || plans.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No plans available. Create plans first.</p>
              ) : (
                plans.map((plan) => {
                  const id = plan.id as number;
                  const name = String(plan.name || "");
                  const price = Number(plan.price || 0);
                  const period = String(plan.period || "");
                  const features = (plan.features || []) as string[];

                  return (
                    <div key={id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors">
                      <div>
                        <p className="font-semibold">{name}</p>
                        <p className="text-sm text-muted-foreground">
                          {price === 0 ? "Free" : `$${price.toFixed(2)}`}{price > 0 ? `/${period}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {features.slice(0, 2).map((f) => typeof f === "string" ? f : String(f)).join(" • ")}
                        </p>
                      </div>
                      <Btn size="sm" isLoading={assignSub.isPending}
                        onClick={() => {
                          assignSub.mutate({ userId: planTarget, planId: id });
                          setPlanTarget(null);
                        }}>
                        Assign
                      </Btn>
                    </div>
                  );
                })
              )}
              <div className="flex justify-end pt-2">
                <Btn variant="outline" onClick={() => setPlanTarget(null)}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
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
