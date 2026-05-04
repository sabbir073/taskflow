"use client";

import { useState } from "react";
import { Card, CardContent, Input, Btn, Badge } from "@/components/ui";
import { Search, Users, Lock, Globe, CheckCircle, XCircle, Trash2, ChevronRight } from "lucide-react";
import { useMyGroups, useAllGroups, useApproveGroup, useRejectGroup, useDeleteGroup } from "@/hooks/use-groups";
import { EmptyState } from "./empty-state";
import { ConfirmDialog } from "./confirm-dialog";
import { getInitials, formatDate } from "@/lib/utils";
import Link from "next/link";

// ============================================================================
// Groups list — dual-layout (desktop unchanged, mobile is app-style).
// Each card renders two sibling blocks toggled with `hidden sm:block` and
// `sm:hidden` so neither layout affects the other.
// ============================================================================

export function GroupsList({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<"my" | "manage">("my");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Lightweight count queries — pageSize 1 so we only pay for the row count.
  const myCount = useMyGroups({ page: 1, pageSize: 1 });
  const manageCount = useAllGroups({ page: 1, pageSize: 1 });

  const tabs = [
    { key: "my" as const, label: "My Groups", short: "My", count: myCount.data?.total ?? 0 },
    ...(isAdmin
      ? [{ key: "manage" as const, label: "Manage Groups", short: "Manage", count: manageCount.data?.total ?? 0 }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* DESKTOP TABS — original underline style, untouched */}
      <div className="hidden sm:flex gap-1 border-b border-border/50 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); setSearch(""); }}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative
              ${activeTab === tab.key ? "text-primary bg-primary/5 border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* MOBILE TABS — pill style with brand gradient on active. */}
      <div className="sm:hidden -mx-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-4 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); setSearch(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all
                  ${isActive
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/25"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted active:scale-95"}`}
              >
                <span>{tab.short}</span>
                <span className={`min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none
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
// My Groups
// ============================================================================
function MyGroupsTab({ search, setSearch, page, setPage }: { search: string; setSearch: (v: string) => void; page: number; setPage: (v: number) => void }) {
  const { data, isLoading } = useMyGroups({ page, pageSize: 20, search });
  const groups = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search my groups..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent><div className="h-20 bg-muted rounded-xl animate-pulse" /></CardContent></Card>)}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState icon={Users} title="No groups yet" description="Create a group or wait to be added to one" action={{ label: "Create Group", href: "/groups/create" }} />
      ) : (
        <>
          {/* DESKTOP — unchanged grid */}
          <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => {
              const name = String(group.name || "");
              const description = String(group.description || "");
              const privacy = String(group.privacy || "public");
              const leader = group.users as Record<string, unknown> | undefined;
              const leaderName = String(leader?.name || "Unknown");
              const groupId = group.id as number;
              const approval = String(group.approval_status || "approved");

              return (
                <Link key={groupId} href={`/groups/${groupId}`}>
                  <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
                    <CardContent className="p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{name}</h3>
                          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            {privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />} {privacy}
                          </span>
                        </div>
                      </div>
                      {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{getInitials(leaderName)}</div>
                          <span className="text-xs text-muted-foreground">{leaderName}</span>
                        </div>
                        {approval !== "approved" && <Badge variant="warning">{approval.replace(/_/g, " ")}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* MOBILE — app-style cards */}
          <div className="sm:hidden space-y-3">
            {groups.map((group) => {
              const name = String(group.name || "");
              const description = String(group.description || "");
              const privacy = String(group.privacy || "public");
              const leader = group.users as Record<string, unknown> | undefined;
              const leaderName = String(leader?.name || "Unknown");
              const groupId = group.id as number;
              const approval = String(group.approval_status || "approved");
              const memberCount = Number(group.member_count || 0);

              return (
                <Link key={groupId} href={`/groups/${groupId}`} className="block">
                  <Card className="overflow-hidden active:scale-[0.99] transition-transform">
                    <div className="px-4 pt-4 flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/25 to-accent/25 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-foreground leading-tight truncate">{name}</h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 capitalize">
                            {privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />} {privacy}
                          </span>
                          {memberCount > 0 && (
                            <>
                              <span className="text-muted-foreground/50">&middot;</span>
                              <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0 mt-1" />
                    </div>

                    {description && (
                      <p className="px-4 mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-2 px-4 py-3 border-t border-border/50 bg-muted/20">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {getInitials(leaderName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground leading-none">Leader</p>
                          <p className="text-xs font-medium text-foreground truncate">{leaderName}</p>
                        </div>
                      </div>
                      {approval !== "approved" && (
                        <Badge variant="warning" className="text-[10px]">{approval.replace(/_/g, " ")}</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Manage Groups (admin)
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

  const approvalVariant: Record<string, "success" | "warning" | "error" | "default"> = { approved: "success", pending_approval: "warning", rejected_by_admin: "error" };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search groups..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="h-11 px-4 rounded-xl border border-border bg-background text-sm" value={approvalFilter} onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected_by_admin">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent><div className="h-16 bg-muted rounded-xl animate-pulse" /></CardContent></Card>)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No groups found" description="No groups match the current filters" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const groupId = item.id as number;
            const name = String(item.name || "");
            const creator = item.users as Record<string, unknown> | undefined;
            const creatorName = String(creator?.name || "Unknown");
            const approval = String(item.approval_status || "approved");
            const privacy = String(item.privacy || "public");
            const created = item.created_at ? formatDate(String(item.created_at)) : "";

            return (
              <Card key={groupId} className="overflow-hidden">
                {/* DESKTOP — unchanged */}
                <div className="hidden sm:block">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-primary" /></div>
                      <div className="min-w-0">
                        <Link href={`/groups/${groupId}`} className="font-semibold text-sm hover:text-primary">{name}</Link>
                        <p className="text-xs text-muted-foreground">by {creatorName} &middot; {created}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={approvalVariant[approval] || "default"}>{approval.replace(/_/g, " ")}</Badge>
                      {approval === "pending_approval" && (
                        <>
                          <Btn size="sm" onClick={() => approve.mutate(groupId)}><CheckCircle className="w-3.5 h-3.5" /></Btn>
                          <Btn variant="outline" size="sm" onClick={() => reject.mutate({ groupId })}><XCircle className="w-3.5 h-3.5" /></Btn>
                        </>
                      )}
                      <Btn variant="ghost" size="sm" className="text-error" onClick={() => setDeleteTarget({ id: groupId, name })}><Trash2 className="w-3.5 h-3.5" /></Btn>
                    </div>
                  </CardContent>
                </div>

                {/* MOBILE — app-style card with all data + footer actions */}
                <div className="sm:hidden">
                  <div className="px-4 pt-4 flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/25 to-accent/25 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/groups/${groupId}`} className="block">
                        <h3 className="text-base font-bold text-foreground leading-tight truncate hover:text-primary">{name}</h3>
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 capitalize">
                          {privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />} {privacy}
                        </span>
                        <span className="text-muted-foreground/50">&middot;</span>
                        <span className="truncate">{created}</span>
                      </div>
                    </div>
                    <Badge variant={approvalVariant[approval] || "default"} className="text-[10px] shrink-0">
                      {approval.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="px-4 mt-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {getInitials(creatorName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-none">Created by</p>
                      <p className="text-xs font-medium text-foreground truncate">{creatorName}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 px-4 py-3 border-t border-border/50 bg-muted/20">
                    {approval === "pending_approval" ? (
                      <>
                        <Btn size="sm" className="flex-1" onClick={() => approve.mutate(groupId)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                        </Btn>
                        <Btn variant="outline" size="sm" className="flex-1" onClick={() => reject.mutate({ groupId })}>
                          <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                        </Btn>
                        <Btn variant="outline" size="sm" className="text-error border-error/30" onClick={() => setDeleteTarget({ id: groupId, name })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Btn>
                      </>
                    ) : (
                      <>
                        <Link href={`/groups/${groupId}`} className="flex-1">
                          <Btn variant="outline" size="sm" className="w-full">View Group</Btn>
                        </Link>
                        <Btn variant="outline" size="sm" className="text-error border-error/30" onClick={() => setDeleteTarget({ id: groupId, name })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Btn>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        </div>
      )}

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
