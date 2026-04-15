"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Input, Select, Btn, Badge } from "@/components/ui";
import { Search, CheckCircle, XCircle, Users, Trash2, User as UserIcon } from "lucide-react";
import { getAllGroups, approveGroup, rejectGroup, deleteGroup } from "@/lib/actions/groups";
import { EmptyState } from "./empty-state";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export function ManageGroupsView() {
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-groups", page, search, approvalFilter],
    queryFn: () => getAllGroups({ page, pageSize: 20, search, approval_status: approvalFilter || undefined }),
  });

  const approve = useMutation({
    mutationFn: approveGroup,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["admin-groups"] }); } else toast.error(r.error); },
  });

  const reject = useMutation({
    mutationFn: (groupId: number) => rejectGroup(groupId),
    onSuccess: (r) => { if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["admin-groups"] }); } else toast.error(r.error); },
  });

  const remove = useMutation({
    mutationFn: deleteGroup,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["admin-groups"] }); } else toast.error(r.error); },
  });

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const approvalVariant: Record<string, "success" | "warning" | "error" | "default"> = {
    approved: "success", pending_approval: "warning", rejected_by_admin: "error",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search groups..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={approvalFilter} onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }} className="sm:w-52">
          <option value="">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected_by_admin">Rejected</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent><div className="h-16 bg-muted rounded-xl animate-pulse" /></CardContent></Card>)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No groups found" description="No groups match the current filters" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const groupId = item.id as number;
            const name = String(item.name || "");
            const description = String(item.description || "");
            const privacy = String(item.privacy || "public");
            const category = String(item.category || "");
            const creator = item.users as Record<string, unknown> | undefined;
            const approval = String(item.approval_status || "approved");
            const maxMembers = Number(item.max_members || 50);

            return (
              <Card key={groupId}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <Link href={`/groups/${groupId}`} className="font-semibold hover:text-primary transition-colors">{name}</Link>
                        <p className="text-xs text-muted-foreground">{privacy} &middot; {category} &middot; max {maxMembers} members</p>
                        {description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{description}</p>}
                      </div>
                    </div>
                    <Badge variant={approvalVariant[approval] || "default"}>{approval.replace(/_/g, " ")}</Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> Created by {String(creator?.name || "Unknown")} ({String(creator?.email || "")})</span>
                    <span>{item.created_at ? formatDate(String(item.created_at)) : ""}</span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border/50">
                    {approval === "pending_approval" && (
                      <>
                        <Btn size="sm" onClick={() => approve.mutate(groupId)} disabled={approve.isPending}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </Btn>
                        <Btn variant="outline" size="sm" onClick={() => reject.mutate(groupId)} disabled={reject.isPending}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Btn>
                      </>
                    )}
                    <Btn variant="ghost" size="sm" className="ml-auto text-error" onClick={() => remove.mutate(groupId)} disabled={remove.isPending}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Btn>
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
