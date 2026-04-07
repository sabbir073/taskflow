"use client";

import { useState } from "react";
import { Card, CardContent, Input, Select, Btn, Badge } from "@/components/ui";
import { Search, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { useTasks, useMyTasks } from "@/hooks/use-tasks";
import { EmptyState } from "./empty-state";
import { formatDate } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import Link from "next/link";

const STATUS_BADGE: Record<string, { variant: "default" | "primary" | "success" | "warning" | "error" | "accent"; icon: typeof Clock }> = {
  draft: { variant: "default", icon: Clock },
  pending: { variant: "warning", icon: Clock },
  in_progress: { variant: "primary", icon: Send },
  submitted: { variant: "accent", icon: Send },
  approved: { variant: "success", icon: CheckCircle },
  rejected: { variant: "error", icon: XCircle },
};

export function TasksView({ isAdmin }: { isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const adminQuery = useTasks({ page, pageSize: 20, search, status: statusFilter || undefined });
  const userQuery = useMyTasks({ page, pageSize: 20, search, status: statusFilter || undefined });

  const query = isAdmin ? adminQuery : userQuery;
  const items = query.data?.data || [];
  const totalPages = query.data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="sm:w-48">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          {isAdmin && <option value="draft">Draft</option>}
        </Select>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent><div className="h-24 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Clock} title="No tasks found" description={isAdmin ? "Create your first task" : "No tasks assigned to you yet"} action={isAdmin ? { label: "Create Task", href: "/tasks/create" } : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const task = isAdmin ? item : (item.tasks as Record<string, unknown>) || item;
            const taskId = isAdmin ? (item.id as number) : (task.id as number);
            const assignmentId = !isAdmin ? (item.id as number) : undefined;
            const title = String(task.title || "Untitled");
            const platform = task.platforms as Record<string, unknown> | undefined;
            const taskType = task.task_types as Record<string, unknown> | undefined;
            const points = Number(task.points_per_completion || task.points || 0);
            const priority = String(task.priority || "medium");
            const deadline = task.deadline as string | null;
            const status = isAdmin ? String(task.status) : String(item.status);
            const platformSlug = String(platform?.slug || "");
            const platformConfig = PLATFORM_CONFIG[platformSlug as keyof typeof PLATFORM_CONFIG];
            const badge = STATUS_BADGE[status] || STATUS_BADGE.pending;
            const StatusIcon = badge.icon;

            return (
              <Link key={`${taskId}-${assignmentId || ""}`} href={`/tasks/${taskId}`}>
                <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: platformConfig?.color || "#666" }}>
                          {String(platform?.name || "?").charAt(0)}
                        </div>
                        <span className="text-xs text-muted-foreground">{String(taskType?.name || "Task")}</span>
                      </div>
                      <Badge variant={badge.variant}><StatusIcon className="w-3 h-3 mr-1" />{status.replace("_", " ")}</Badge>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2">{title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border/50">
                      <span className="font-semibold text-primary">{points.toFixed(2)} pts</span>
                      <span className={`capitalize ${priority === "high" ? "text-error" : priority === "medium" ? "text-warning" : ""}`}>{priority}</span>
                      {deadline && <span>{formatDate(deadline)}</span>}
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
