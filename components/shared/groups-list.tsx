"use client";

import { useState } from "react";
import { Card, CardContent, Input, Btn, Badge } from "@/components/ui";
import { Search, Users, Lock, Globe } from "lucide-react";
import { useMyGroups, useAllGroups, useApproveGroup, useRejectGroup, useDeleteGroup } from "@/hooks/use-groups";
import { EmptyState } from "./empty-state";
import { getInitials, formatDate } from "@/lib/utils";
import Link from "next/link";
import { CheckCircle, XCircle, Trash2 } from "lucide-react";

export function GroupsList({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<"my" | "manage">("my");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Lightweight count queries — pageSize 1 so we only pay for the row count.
  const myCount = useMyGroups({ page: 1, pageSize: 1 });
  const manageCount = useAllGroups({ page: 1, pageSize: 1 });

  const tabs = [
    { key: "my" as const, label: "My Groups", count: myCount.data?.total ?? 0 },
    ...(isAdmin ? [{ key: "manage" as const, label: "Manage Groups", count: manageCount.data?.total ?? 0 }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
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

      {activeTab === "my" && <MyGroupsTab search={search} setSearch={setSearch} page={page} setPage={setPage} />}
      {activeTab === "manage" && isAdmin && <ManageGroupsTab search={search} setSearch={setSearch} page={page} setPage={setPage} />}
    </div>
  );
}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

function ManageGroupsTab({ search, setSearch, page, setPage }: { search: string; setSearch: (v: string) => void; page: number; setPage: (v: number) => void }) {
  const [approvalFilter, setApprovalFilter] = useState("");
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
            const approval = String(item.approval_status || "approved");

            return (
              <Card key={groupId}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-primary" /></div>
                    <div className="min-w-0">
                      <Link href={`/groups/${groupId}`} className="font-semibold text-sm hover:text-primary">{name}</Link>
                      <p className="text-xs text-muted-foreground">by {String(creator?.name || "Unknown")} &middot; {item.created_at ? formatDate(String(item.created_at)) : ""}</p>
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
                    <Btn variant="ghost" size="sm" className="text-error" onClick={() => remove.mutate(groupId)}><Trash2 className="w-3.5 h-3.5" /></Btn>
                  </div>
                </CardContent>
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
    </div>
  );
}
