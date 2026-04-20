"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, Input, Btn, Select, Badge } from "@/components/ui";
import { Search, History } from "lucide-react";
import { useAuditLog } from "@/hooks/use-audit";
import { formatDate, getInitials } from "@/lib/utils";

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "primary" | "success" | "warning" | "error" }> = {
  role_change: { label: "Role change", variant: "primary" },
  status_change: { label: "Status change", variant: "warning" },
  approve_user: { label: "Approve user", variant: "success" },
  reject_user: { label: "Reject user", variant: "error" },
  delete_user: { label: "Delete user", variant: "error" },
  assign_points: { label: "Assign points", variant: "primary" },
  approve_payment: { label: "Approve payment", variant: "success" },
  reject_payment: { label: "Reject payment", variant: "error" },
  approve_task: { label: "Approve task", variant: "success" },
  reject_task: { label: "Reject task", variant: "error" },
  delete_task: { label: "Delete task", variant: "error" },
  approve_group: { label: "Approve group", variant: "success" },
  reject_group: { label: "Reject group", variant: "error" },
  delete_group: { label: "Delete group", variant: "error" },
  create_plan: { label: "Create plan", variant: "primary" },
  update_plan: { label: "Update plan", variant: "default" },
  delete_plan: { label: "Delete plan", variant: "error" },
  assign_plan: { label: "Assign plan", variant: "primary" },
};

const ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([value, { label }]) => ({ value, label }));
const TARGET_OPTIONS = [
  { value: "user", label: "User" },
  { value: "payment", label: "Payment" },
  { value: "task", label: "Task" },
  { value: "group", label: "Group" },
  { value: "plan", label: "Plan" },
  { value: "subscription", label: "Subscription" },
];

export function AuditLogView() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAuditLog({
    page,
    pageSize: 25,
    actor_search: search || undefined,
    action: action || undefined,
    target_type: targetType || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const rows = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <Card>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search actor by name or email"
              className="pl-9"
            />
          </div>
          <Select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All targets</option>
            {TARGET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            placeholder="From"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            placeholder="To"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No audit entries match your filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const actor = row.users as Record<string, unknown> | undefined;
                  const actorName = actor ? String(actor.name || "Unknown") : "System";
                  const actorEmail = actor ? String(actor.email || "") : "";
                  const actionKey = String(row.action || "");
                  const meta = ACTION_LABELS[actionKey] || { label: actionKey, variant: "default" as const };
                  const targetType = row.target_type as string | null;
                  const targetId = row.target_id as string | null;
                  const metadata = row.metadata as Record<string, unknown> | null;
                  const metaSummary = metadata
                    ? Object.entries(metadata)
                        .filter(([, v]) => v !== null && v !== undefined && v !== "")
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                        .join(" • ")
                    : "";

                  return (
                    <tr key={row.id as number} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.created_at as string)}
                        <div className="text-[10px] opacity-60">
                          {new Date(row.created_at as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {getInitials(actorName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{actorName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{actorEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {targetType ? (
                          <span className="text-muted-foreground">
                            <span className="capitalize">{targetType}</span>
                            {targetId && <span className="font-mono opacity-70"> #{targetId.slice(0, 8)}</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-sm">
                        <p className="truncate" title={metaSummary}>{metaSummary || "—"}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.total || 0} entries)
          </p>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Btn>
            <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Btn>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
