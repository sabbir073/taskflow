"use client";

import { useState } from "react";
import { Card, CardContent, Input, Select, Btn, Badge } from "@/components/ui";
import { Search, Users, Lock, Globe, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useMyGroups, useAllGroups, useApproveGroup, useRejectGroup, useDeleteGroup } from "@/hooks/use-groups";
import { useMyGroupAccessState } from "@/hooks/use-group-access";
import { GroupAccessGate } from "./group-access-gate";
import { EmptyState } from "./empty-state";
import { ConfirmDialog } from "./confirm-dialog";
import { getInitials, formatDate } from "@/lib/utils";
import Link from "next/link";

// ============================================================================
// Groups list — Entry #35 unification.
// Single pill-style tab row across all breakpoints (matches /tasks per
// Entry #30). Both tabs render the same responsive <GroupCard> primitive
// (matches /tasks per Entry #28); mode prop drives admin Approve/Reject/
// Delete footer.
// ============================================================================

export function GroupsList({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<"my" | "manage">("my");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Lightweight count queries — pageSize 1 so we only pay for the row count.
  const myCount = useMyGroups({ page: 1, pageSize: 1 });
  const manageCount = useAllGroups({ page: 1, pageSize: 1 });
  const access = useMyGroupAccessState();

  // Gate: a non-staff user without group access (no grant + no active
  // subscription) sees the Apply flow. If they're a MEMBER of groups (added by
  // a leader) we still show those below a compact apply banner — only a user
  // with zero groups sees the full marketing gate. Staff always have access.
  if (!isAdmin && access.data && !access.data.access) {
    const hasGroups = (myCount.data?.total ?? 0) > 0;
    if (!hasGroups) return <GroupAccessGate />;
    return (
      <div className="space-y-6">
        <GroupAccessGate compact />
        <div>
          <h2 className="text-sm font-semibold mb-3">Groups you&apos;re in</h2>
          <MyGroupsTab search={search} setSearch={setSearch} page={page} setPage={setPage} />
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "my" as const, label: "My Groups", short: "My", count: myCount.data?.total ?? 0 },
    ...(isAdmin
      ? [{ key: "manage" as const, label: "Manage Groups", short: "Manage", count: manageCount.data?.total ?? 0 }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Unified pill tabs (Entry #30 pattern). Mobile shows short labels +
          edge-bleed scroll; tablet+ shows full labels constrained to page
          padding. Active pill = brand gradient + glow. */}
      <div className="-mx-4 sm:mx-0 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-4 sm:px-0 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); setSearch(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all
                  ${isActive
                    ? "bg-linear-to-r from-primary to-accent text-white shadow-md shadow-primary/25"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"}`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
                <span className={`min-w-5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none tabular-nums
                  ${isActive ? "bg-white/25 text-white" : "bg-background text-foreground"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "my" && <MyGroupsTab search={search} setSearch={setSearch} page={page} setPage={setPage} />}
      {activeTab === "manage" && isAdmin && <ManageGroupsTab search={search} setSearch={setSearch} page={page} setPage={setPage} />}
    </div>
  );
}

// ============================================================================
// My Groups tab
// ============================================================================
function MyGroupsTab({ search, setSearch, page, setPage }: { search: string; setSearch: (v: string) => void; page: number; setPage: (v: number) => void }) {
  const { data, isLoading } = useMyGroups({ page, pageSize: 20, search });
  const groups = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search my groups..."
          className="pl-11"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent><div className="h-32 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Create a group or wait to be added to one"
          action={{ label: "Create Group", href: "/groups/create" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <GroupCard key={group.id as number} group={group} mode="my" />
          ))}
        </div>
      )}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} setPage={setPage} />}
    </div>
  );
}

// ============================================================================
// Manage Groups tab (admin)
// ============================================================================
function ManageGroupsTab({ search, setSearch, page, setPage }: { search: string; setSearch: (v: string) => void; page: number; setPage: (v: number) => void }) {
  const [approvalFilter, setApprovalFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const { data, isLoading } = useAllGroups({ page, pageSize: 20, search, approval_status: approvalFilter || undefined });
  const approve = useApproveGroup();
  const reject = useRejectGroup();
  const remove = useDeleteGroup();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      {/* Filter row — Search + TaskMOS <Select> (replaces the raw <select>
          that didn't match the dashboard styling). */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            className="pl-11"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={approvalFilter}
          onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }}
          className="sm:max-w-50"
        >
          <option value="">All statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected_by_admin">Rejected</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent><div className="h-32 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No groups found" description="No groups match the current filters" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <GroupCard
              key={item.id as number}
              group={item}
              mode="admin"
              onApprove={(id) => approve.mutate(id)}
              onReject={(id) => reject.mutate({ groupId: id })}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} setPage={setPage} />}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete group?"
        description={deleteTarget ? `This permanently removes "${deleteTarget.name}" and all its memberships. This cannot be undone.` : ""}
        confirmLabel="Delete Group"
        isLoading={remove.isPending}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// GroupCard — single responsive card used by both tabs.
// ----------------------------------------------------------------------------
// Anatomy: avatar tile + name + meta row (privacy · member count · category)
// + optional approval badge on the right · optional description · footer
// row with leader/creator + mode-specific actions.
//
// modes:
//   • "my"    → just renders the link card; no footer actions
//   • "admin" → footer shows Approve/Reject/Delete for pending groups; just
//               Delete (+ created date on sm+) for everything else
//
// Inline (single consumer for now). Promote if a second surface needs it.
type GroupCardMode = "my" | "admin";

function GroupCard({
  group,
  mode,
  onApprove,
  onReject,
  onDelete,
}: {
  group: Record<string, unknown>;
  mode: GroupCardMode;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onDelete?: (id: number, name: string) => void;
}) {
  const groupId = group.id as number;
  const name = String(group.name || "");
  const description = String(group.description || "");
  const privacy = String(group.privacy || "public");
  const category = String(group.category || "");
  const approval = String(group.approval_status || "approved");
  const leader = group.users as Record<string, unknown> | undefined;
  const leaderName = String(leader?.name || "Unknown");
  const memberCount = Number(group.member_count || 0);
  const created = group.created_at ? formatDate(String(group.created_at)) : "";
  const isPendingApproval = approval === "pending_approval";

  const approvalVariant: "warning" | "error" | "default" =
    approval === "pending_approval" ? "warning"
    : approval === "rejected_by_admin" ? "error"
    : "default";

  return (
    <Card className="overflow-hidden hover:border-foreground/15 transition flex flex-col">
      <Link href={`/groups/${groupId}`} className="block">
        <div className="p-4 sm:p-5 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-primary/25 to-accent/25 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-tight truncate hover:text-primary transition">
              {name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1 capitalize">
                {privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />} {privacy}
              </span>
              {memberCount > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
                </>
              )}
              {category && category !== "Other" && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="truncate max-w-30">{category}</span>
                </>
              )}
            </div>
          </div>
          {approval !== "approved" && (
            <Badge variant={approvalVariant} className="shrink-0 capitalize">
              {approval.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {description && (
          <p className="px-4 sm:px-5 -mt-1 mb-3 text-sm text-muted-foreground line-clamp-2 leading-snug wrap-break-word">
            {description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
          </p>
        )}
      </Link>

      {/* Footer — leader badge + mode-specific actions */}
      <div className="mt-auto px-4 sm:px-5 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {getInitials(leaderName)}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-none">{mode === "admin" ? "Created by" : "Leader"}</p>
            <p className="text-xs font-medium truncate">{leaderName}</p>
          </div>
        </div>
        {mode === "admin" && (
          isPendingApproval ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Btn size="sm" onClick={(e) => { e.preventDefault(); onApprove?.(groupId); }}>
                <CheckCircle className="w-3.5 h-3.5" />
              </Btn>
              <Btn variant="outline" size="sm" onClick={(e) => { e.preventDefault(); onReject?.(groupId); }}>
                <XCircle className="w-3.5 h-3.5" />
              </Btn>
              <Btn variant="ghost" size="sm" className="text-error" onClick={(e) => { e.preventDefault(); onDelete?.(groupId, name); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Btn>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {created && <span className="text-[10px] text-muted-foreground hidden sm:inline">{created}</span>}
              <Btn variant="ghost" size="sm" className="text-error" onClick={(e) => { e.preventDefault(); onDelete?.(groupId, name); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Btn>
            </div>
          )
        )}
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Pagination — extracted so both tabs share one implementation.
// ----------------------------------------------------------------------------
function Pagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) {
  return (
    <div className="flex justify-between items-center pt-4">
      <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
        <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
      </div>
    </div>
  );
}
