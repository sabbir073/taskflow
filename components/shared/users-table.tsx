"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, Input, Btn, Select, Badge } from "@/components/ui";
import { Search, MoreHorizontal, Shield, UserX, UserCheck, Trash2, Coins } from "lucide-react";
import { useUsers, useUpdateUserRole, useUpdateUserStatus, useDeleteUser, useAssignPoints } from "@/hooks/use-users";
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
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { data, isLoading } = useUsers({ page, pageSize: 20, search, role: roleFilter || undefined, status: statusFilter || undefined });
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const removeUser = useDeleteUser();
  const assignPts = useAssignPoints();

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
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">{getInitials(name)}</div>
                          <div><p className="font-medium">{name}</p><p className="text-xs text-muted-foreground">{email}</p></div>
                        </div>
                      </td>
                      <td className="px-5 py-3"><Badge variant="primary">{ROLE_LABELS[role] || role}</Badge></td>
                      <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[status] || "default"}>{status}</Badge></td>
                      <td className="px-5 py-3 font-medium">{points.toFixed(2)}</td>
                      <td className="px-5 py-3">{tasks}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(joined)}</td>
                      <td className="px-5 py-3 text-right relative">
                        <button onClick={() => setOpenMenu(openMenu === userId ? null : userId)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu === userId && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-4 top-full mt-1 w-48 bg-card rounded-xl border border-border shadow-xl z-50 py-1">
                              <button onClick={() => { updateRole.mutate({ userId, role: "admin" }); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><Shield className="w-4 h-4 text-muted-foreground" /> Make Admin</button>
                              <button onClick={() => { updateRole.mutate({ userId, role: "user" }); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><UserCheck className="w-4 h-4 text-muted-foreground" /> Make Member</button>
                              {status === "active" ? (
                                <button onClick={() => { updateStatus.mutate({ userId, status: "suspended" }); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><UserX className="w-4 h-4 text-muted-foreground" /> Suspend</button>
                              ) : (
                                <button onClick={() => { updateStatus.mutate({ userId, status: "active" }); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><UserCheck className="w-4 h-4 text-muted-foreground" /> Activate</button>
                              )}
                              <button onClick={() => { setPointsTarget(userId); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"><Coins className="w-4 h-4 text-warning" /> Assign Points</button>
                              <div className="border-t border-border/50 my-1" />
                              <button onClick={() => { setDeleteTarget(userId); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error hover:bg-error/5"><Trash2 className="w-4 h-4" /> Delete</button>
                            </div>
                          </>
                        )}
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
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Coins className="w-5 h-5 text-warning" /> Assign Points</h3>
            <div className="space-y-4">
              <div className="space-y-1.5"><label className="text-sm font-medium">Amount (negative to deduct)</label><Input type="number" step="0.01" value={pointsAmount} onChange={(e) => setPointsAmount(e.target.value)} placeholder="e.g. 100 or -50" autoFocus /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Reason</label><Input value={pointsReason} onChange={(e) => setPointsReason(e.target.value)} placeholder="Reason for assignment" /></div>
              <div className="flex gap-3 justify-end pt-2">
                <Btn variant="outline" onClick={() => { setPointsTarget(null); setPointsAmount(""); setPointsReason(""); }}>Cancel</Btn>
                <Btn disabled={!pointsAmount} isLoading={assignPts.isPending} onClick={() => { assignPts.mutate({ userId: pointsTarget, amount: parseFloat(pointsAmount), reason: pointsReason }); setPointsTarget(null); setPointsAmount(""); setPointsReason(""); }}>Assign Points</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
