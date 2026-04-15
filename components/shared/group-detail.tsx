"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, Input, Textarea, Btn, Badge } from "@/components/ui";
import {
  Users, Lock, Globe, UserPlus, UserMinus, Crown, Mail, Edit2, Trash2, ShieldOff,
  ShieldCheck, AlertTriangle, Clock, CheckCircle, XCircle, Bell, ExternalLink, ListTodo, X, BookOpen,
  ChevronDown,
} from "lucide-react";
import {
  useLeaveGroup, useRemoveMember, useAddMemberByEmail, useGroup, useGroupTasks,
  useSuspendGroup, useUnsuspendGroup, useDeleteGroup, useRequestGroupDeletion,
  useCancelDeletionRequest, useNotifyAssignmentToSubmit, useApproveGroup, useRejectGroup,
} from "@/hooks/use-groups";
import { GroupEditForm } from "./group-edit-form";
import { UserProfileModal } from "./user-profile-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { getInitials, formatDate, formatRelativeTime } from "@/lib/utils";

interface Props {
  data: { group: Record<string, unknown>; members: Record<string, unknown>[]; memberCount: number };
  currentUserId: string;
  isAdmin: boolean;
}

const STATUS_COLORS: Record<string, "success" | "warning" | "error" | "accent" | "default"> = {
  pending: "default",
  in_progress: "accent",
  submitted: "warning",
  approved: "success",
  rejected: "error",
  cancelled: "default",
};

export function GroupDetail({ data: initialData, currentUserId, isAdmin }: Props) {
  // Live-polled group data so approval/suspension/deletion flags reflect in real time
  const { data: liveData } = useGroup(initialData.group.id as number);
  const data = liveData || initialData;
  const { group, members, memberCount } = data;

  const leaveGroup = useLeaveGroup();
  const removeMember = useRemoveMember();
  const addByEmail = useAddMemberByEmail();
  const suspendGroup = useSuspendGroup();
  const unsuspendGroup = useUnsuspendGroup();
  const deleteGroup = useDeleteGroup();
  const requestDeletion = useRequestGroupDeletion();
  const cancelDeletion = useCancelDeletionRequest();
  const approveGroup = useApproveGroup();
  const rejectGroup = useRejectGroup();

  const [emailToAdd, setEmailToAdd] = useState("");
  const [editing, setEditing] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [requestDialog, setRequestDialog] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (key: string) => setOpenSection((prev) => (prev === key ? null : key));

  const groupId = group.id as number;
  const name = String(group.name || "");
  const description = String(group.description || "");
  const privacy = String(group.privacy || "public");
  const category = String(group.category || "Other");
  const maxMembers = Number(group.max_members || 50);
  const rules = String(group.rules || "");
  const avatarUrl = String(group.avatar_url || "");
  const coverUrl = String(group.cover_url || "");
  const approvalStatus = String(group.approval_status || "approved");
  const status = String(group.status || "active");
  const leaderId = String(group.leader_id || "");
  const isMember = members.some((m) => { const u = m.users as Record<string, unknown> | undefined; return (u?.id || m.user_id) === currentUserId; });
  const isLeader = leaderId === currentUserId;
  const deletionRequested = group.deletion_requested === true;
  const canManage = isAdmin || isLeader;
  const canSeeSubmissions = isAdmin || isLeader;

  const isPending = approvalStatus === "pending_approval";
  const isRejected = approvalStatus === "rejected_by_admin";
  const isSuspended = status === "suspended";

  if (editing) {
    return (
      <div className="max-w-2xl">
        <GroupEditForm group={group} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banners */}
      {isPending && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5">
          <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold">Pending Approval</p>
                <p className="text-xs text-muted-foreground mt-0.5">This group is waiting for admin approval. Tasks can&apos;t be assigned until it&apos;s approved.</p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Btn size="sm" onClick={() => approveGroup.mutate(groupId)} isLoading={approveGroup.isPending}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                  </Btn>
                  <Btn size="sm" variant="outline" onClick={() => setRejectDialog(true)}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Btn>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isRejected && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-error/30 bg-error/5">
          <XCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Rejected by Admin</p>
            <p className="text-xs text-muted-foreground mt-0.5">This group was rejected. Contact an admin for details.</p>
          </div>
        </div>
      )}
      {isSuspended && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-error/30 bg-error/5">
          <ShieldOff className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Group Suspended</p>
            <p className="text-xs text-muted-foreground mt-0.5">This group is currently suspended. Tasks cannot be assigned to it.</p>
          </div>
        </div>
      )}
      {deletionRequested && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Deletion Requested</p>
              {!!group.deletion_requested_at && (
                <span className="text-[11px] text-muted-foreground">{formatRelativeTime(String(group.deletion_requested_at))}</span>
              )}
            </div>
            {!!group.deletion_request_reason && (
              <p className="text-xs text-muted-foreground mt-1">Reason: {String(group.deletion_request_reason)}</p>
            )}
            <div className="flex gap-2 mt-2">
              {isAdmin && (
                <Btn size="sm" variant="danger" onClick={() => setConfirmDelete(true)} disabled={deleteGroup.isPending}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Group
                </Btn>
              )}
              {canManage && (
                <Btn size="sm" variant="outline" onClick={() => cancelDeletion.mutate(groupId)} disabled={cancelDeletion.isPending}>
                  Cancel Request
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Group info card */}
        <Card className="overflow-hidden">
          <div
            className="h-24 bg-gradient-to-r from-primary/40 to-accent/40 relative"
            style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            <div className="absolute -bottom-8 left-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white border-4 border-card shadow-lg overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-7 h-7" />
                )}
              </div>
            </div>
          </div>
          <CardContent className="pt-12 space-y-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg">{name}</h3>
                {isSuspended && <Badge variant="error">Suspended</Badge>}
                {isPending && <Badge variant="warning">Pending</Badge>}
                {isRejected && <Badge variant="error">Rejected</Badge>}
              </div>
              <span className="text-xs text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
                {privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />} {privacy} &middot; {category}
              </span>
            </div>
            {description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="font-bold">{memberCount} / {maxMembers}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium text-sm">{group.created_at ? formatDate(String(group.created_at)) : "-"}</p>
              </div>
            </div>

            {/* Management actions */}
            {canManage && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                <Btn size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                </Btn>
                {isAdmin && !isSuspended && (
                  <Btn size="sm" variant="outline" onClick={() => setSuspendDialog(true)}>
                    <ShieldOff className="w-3.5 h-3.5 mr-1" /> Suspend
                  </Btn>
                )}
                {isAdmin && isSuspended && (
                  <Btn size="sm" variant="outline" onClick={() => unsuspendGroup.mutate(groupId)} disabled={unsuspendGroup.isPending}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Reactivate
                  </Btn>
                )}
                {isAdmin && (
                  <Btn size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Btn>
                )}
                {!isAdmin && isLeader && !deletionRequested && (
                  <Btn size="sm" variant="outline" onClick={() => setRequestDialog(true)}>
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Request Deletion
                  </Btn>
                )}
              </div>
            )}

            {isMember && !isLeader && (
              <Btn variant="outline" className="w-full" disabled={leaveGroup.isPending} onClick={() => leaveGroup.mutate(groupId)}>
                Leave Group
              </Btn>
            )}
          </CardContent>
        </Card>

        {/* Members + add member */}
        <div className="lg:col-span-2 space-y-4">
          {canManage && !isPending && (
            <Card>
              <CardContent className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium">Add Member by Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      className="pl-11"
                      value={emailToAdd}
                      onChange={(e) => setEmailToAdd(e.target.value)}
                    />
                  </div>
                </div>
                <Btn
                  disabled={!emailToAdd.trim() || addByEmail.isPending}
                  onClick={() => {
                    addByEmail.mutate({ groupId, email: emailToAdd.trim() });
                    setEmailToAdd("");
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Add
                </Btn>
              </CardContent>
            </Card>
          )}

          <Card>
            <button
              type="button"
              onClick={() => toggleSection("members")}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <CardTitle>Members ({memberCount})</CardTitle>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSection === "members" ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-out ${openSection === "members" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
            <CardContent>
              <div className="space-y-2">
                {members.map((member) => {
                  const user = member.users as Record<string, unknown> | undefined;
                  const userId = String(user?.id || member.user_id || "");
                  const memberName = String(user?.name || "Unknown");
                  const email = String(user?.email || "");
                  const isThisLeader = userId === leaderId;
                  const userStatus = String(member.user_status || "active");

                  // Admin: member name opens profile modal. User: static text.
                  const nameEl = isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setProfileUserId(userId)}
                      className="text-sm font-medium hover:text-primary transition-colors text-left"
                    >
                      {memberName}
                    </button>
                  ) : (
                    <p className="text-sm font-medium">{memberName}</p>
                  );

                  return (
                    <div key={userId} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">
                          {getInitials(memberName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {nameEl}
                            {isThisLeader && <Badge variant="warning"><Crown className="w-3 h-3 mr-1" /> Leader</Badge>}
                            {userStatus === "active" && <Badge variant="success">Active</Badge>}
                            {userStatus === "suspended" && <Badge variant="warning">Suspended</Badge>}
                            {userStatus === "banned" && <Badge variant="error">Banned</Badge>}
                          </div>
                          {/* Only show email to admin/leader */}
                          {canManage && <p className="text-xs text-muted-foreground">{email}</p>}
                        </div>
                      </div>
                      {(isAdmin || isLeader) && !isThisLeader && userId !== currentUserId && (
                        <Btn variant="ghost" size="sm" disabled={removeMember.isPending} onClick={() => removeMember.mutate({ groupId, userId })}>
                          <UserMinus className="w-4 h-4" />
                        </Btn>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
              </div>
            </div>
          </Card>

          {/* Group rules — visible to all members */}
          {rules.trim() && (
            <Card>
              <button
                type="button"
                onClick={() => toggleSection("rules")}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Group Rules
                </CardTitle>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSection === "rules" ? "rotate-180" : ""}`} />
              </button>
              <div className={`grid transition-all duration-300 ease-out ${openSection === "rules" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rules}</p>
                  </CardContent>
                </div>
              </div>
            </Card>
          )}

          {/* Group tasks — admin/leader only */}
          {canSeeSubmissions && (
            <GroupTasksSection
              groupId={groupId}
              isAdmin={isAdmin}
              isOpen={openSection === "tasks"}
              onToggle={() => toggleSection("tasks")}
            />
          )}
        </div>
      </div>

      {/* Profile modal (admin only) */}
      {isAdmin && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { deleteGroup.mutate(groupId); setConfirmDelete(false); }}
        title="Delete group?"
        description={`This permanently removes "${name}" and its memberships. This cannot be undone.`}
        confirmLabel="Delete Group"
        isLoading={deleteGroup.isPending}
      />

      {/* Suspend modal */}
      {suspendDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => setSuspendDialog(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ShieldOff className="w-5 h-5 text-error" /> Suspend Group
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3} placeholder="Why is this group being suspended?" />
              </div>
              <div className="flex gap-2 justify-end">
                <Btn variant="outline" onClick={() => setSuspendDialog(false)}>Cancel</Btn>
                <Btn
                  variant="danger"
                  isLoading={suspendGroup.isPending}
                  onClick={() => {
                    suspendGroup.mutate({ groupId, reason: suspendReason.trim() || undefined });
                    setSuspendDialog(false);
                    setSuspendReason("");
                  }}
                >
                  Suspend
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject group modal (admin) */}
      {rejectDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectDialog(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-error" /> Reject Group
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Why is this group being rejected?"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Btn variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Btn>
                <Btn
                  variant="danger"
                  isLoading={rejectGroup.isPending}
                  onClick={() => {
                    rejectGroup.mutate({ groupId, reason: rejectReason.trim() || undefined });
                    setRejectDialog(false);
                    setRejectReason("");
                  }}
                >
                  Reject
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request deletion modal (leader) */}
      {requestDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => setRequestDialog(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" /> Request Deletion
              </h3>
              <button type="button" onClick={() => setRequestDialog(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">This will notify admins to review and permanently delete the group.</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason</label>
                <Textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} rows={3} placeholder="Why should this group be deleted?" />
              </div>
              <div className="flex gap-2 justify-end">
                <Btn variant="outline" onClick={() => setRequestDialog(false)}>Cancel</Btn>
                <Btn
                  isLoading={requestDeletion.isPending}
                  onClick={() => {
                    requestDeletion.mutate({ groupId, reason: requestReason.trim() || undefined });
                    setRequestDialog(false);
                    setRequestReason("");
                  }}
                >
                  Send Request
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Group tasks section — admin + leader only
// ============================================================================
function GroupTasksSection({
  groupId,
  isAdmin,
  isOpen,
  onToggle,
}: {
  groupId: number;
  isAdmin: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { data: tasks, isLoading } = useGroupTasks(groupId);
  const notifySubmit = useNotifyAssignmentToSubmit();
  const [expanded, setExpanded] = useState<number | null>(null);

  const count = tasks?.length || 0;

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="w-4 h-4" /> Assigned Tasks {count > 0 && `(${count})`}
        </CardTitle>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
      {(isLoading ? (
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading tasks...</CardContent>
      ) : !tasks || tasks.length === 0 ? (
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">No tasks assigned to this group yet.</p>
        </CardContent>
      ) : (
      <CardContent className="space-y-2">
        {tasks.map((task) => {
          const id = task.id as number;
          const title = String(task.title || "");
          const priority = String(task.priority || "medium");
          const points = Number(task.points_per_completion || 0);
          const assignments = (task.assignments as Record<string, unknown>[]) || [];
          const counts: Record<string, number> = {};
          for (const a of assignments) {
            const s = String(a.status || "pending");
            counts[s] = (counts[s] || 0) + 1;
          }
          const taskOpen = expanded === id;

          return (
            <div key={id} className="border border-border/50 rounded-xl overflow-hidden">
              <div className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/tasks/${id}`} className="text-sm font-semibold hover:text-primary transition-colors truncate">
                      {title}
                    </Link>
                    <Badge variant={priority === "high" ? "error" : priority === "low" ? "default" : "warning"}>
                      {priority}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 text-[11px]">
                    <span className="text-muted-foreground">{points.toFixed(2)} pts</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{assignments.length} assigned</span>
                    {counts.submitted > 0 && <span className="text-warning">{counts.submitted} pending review</span>}
                    {counts.approved > 0 && <span className="text-success">{counts.approved} approved</span>}
                    {counts.rejected > 0 && <span className="text-error">{counts.rejected} rejected</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/tasks/${id}`} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" title="Open task">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExpanded(taskOpen ? null : id)}
                    className="text-xs px-3 py-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                  >
                    {taskOpen ? "Hide" : "Show"} members
                  </button>
                </div>
              </div>

              {taskOpen && (
                <div className="border-t border-border/50 bg-muted/20 p-3 space-y-2">
                  {assignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No assignments.</p>
                  ) : (
                    assignments.map((a) => {
                      const aId = a.id as number;
                      const user = a.users as Record<string, unknown> | undefined;
                      const userName = String(user?.name || "Unknown");
                      const userEmail = String(user?.email || "");
                      const aStatus = String(a.status || "pending");
                      const canNudge = ["pending", "in_progress", "rejected"].includes(aStatus);

                      return (
                        <div key={aId} className="flex items-center justify-between gap-3 bg-card rounded-lg px-3 py-2 border border-border/40">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {getInitials(userName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{userName}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={STATUS_COLORS[aStatus] || "default"}>{aStatus.replace("_", " ")}</Badge>
                            {canNudge && (
                              <Btn
                                variant="ghost"
                                size="sm"
                                disabled={notifySubmit.isPending}
                                onClick={() => notifySubmit.mutate(aId)}
                                title="Notify to submit"
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </Btn>
                            )}
                            {aStatus === "submitted" && isAdmin && (
                              <Link href={`/tasks/${id}`} className="text-[11px] text-primary hover:underline">
                                Review <CheckCircle className="w-3 h-3 inline" />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
      ))}
        </div>
      </div>
    </Card>
  );
}
