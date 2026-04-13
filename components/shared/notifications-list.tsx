"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Btn } from "@/components/ui";
import { Bell, CheckCircle, XCircle, Trophy, Award, Users, Settings, CheckCheck, Trash2 } from "lucide-react";
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from "@/lib/actions/notifications";
import { EmptyState } from "./empty-state";
import { formatRelativeTime } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ElementType> = {
  task_assigned: Bell, task_approved: CheckCircle, task_rejected: XCircle, points_earned: Trophy,
  badge_earned: Award, group_invited: Users, group_joined: Users, system: Settings,
};

export function NotificationsList() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => getNotifications({ page, pageSize: 20 }),
    refetchInterval: 10000, // poll every 10s for new notifications
    refetchOnWindowFocus: true,
  });
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread-count"] });
  };
  const markRead = useMutation({ mutationFn: markAsRead, onSuccess: invalidateAll });
  const markAll = useMutation({ mutationFn: markAllAsRead, onSuccess: invalidateAll });
  const deleteOne = useMutation({ mutationFn: deleteNotification, onSuccess: invalidateAll });

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  if (!isLoading && items.length === 0) return <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Btn variant="ghost" size="sm" onClick={() => markAll.mutate()}><CheckCheck className="w-4 h-4 mr-1" /> Mark all as read</Btn></div>
      <div className="space-y-2">
        {items.map((item) => {
          const type = String(item.type || "system");
          const Icon = TYPE_ICONS[type] || Bell;
          const isRead = !!item.is_read;
          const id = item.id as number;

          return (
            <Card key={id} className={!isRead ? "border-primary/20 bg-primary/[0.03]" : ""}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${!isRead ? "bg-primary/10" : "bg-muted"}`}>
                  <Icon className={`w-4 h-4 ${!isRead ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!isRead ? "font-semibold" : "font-medium"}`}>{String(item.title || "")}</p>
                  {!!item.message && <p className="text-xs text-muted-foreground mt-0.5">{String(item.message)}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{item.created_at ? formatRelativeTime(String(item.created_at)) : ""}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isRead && <Btn variant="ghost" size="sm" onClick={() => markRead.mutate(id)}><CheckCircle className="w-4 h-4" /></Btn>}
                  <Btn variant="ghost" size="sm" onClick={() => deleteOne.mutate(id)}><Trash2 className="w-4 h-4 text-muted-foreground" /></Btn>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
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
