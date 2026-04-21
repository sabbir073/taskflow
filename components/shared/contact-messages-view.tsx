"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, Input, Btn, Select, Badge } from "@/components/ui";
import { Search, Mail, Archive, Trash2, Eye, X, Clock, CheckCircle, ArchiveRestore } from "lucide-react";
import {
  useContactSubmissions,
  useUpdateContactStatus,
  useDeleteContactSubmission,
} from "@/hooks/use-contact";
import { ConfirmDialog } from "./confirm-dialog";
import { formatDate, formatRelativeTime, getInitials } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; variant: "primary" | "default" | "warning" }> = {
  unread: { label: "New", variant: "warning" },
  read: { label: "Read", variant: "primary" },
  archived: { label: "Archived", variant: "default" },
};

export function ContactMessagesView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "unread" | "read" | "archived">("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useContactSubmissions({
    page,
    pageSize: 20,
    status: statusFilter || undefined,
    search: search.trim() || undefined,
  });
  const updateStatus = useUpdateContactStatus();
  const deleteOne = useDeleteContactSubmission();

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // Opening a message marks it read automatically (server-side).
  function open(item: Record<string, unknown>) {
    setSelected(item);
    if (item.status === "unread") {
      updateStatus.mutate({ id: item.id as number, status: "read" });
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, subject..."
              className="pl-11"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            className="sm:w-44"
          >
            <option value="">All messages</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center">
                <Mail className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No messages match this filter.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {items.map((m) => {
                  const id = m.id as number;
                  const name = String(m.name || "");
                  const email = String(m.email || "");
                  const subject = String(m.subject || "");
                  const message = String(m.message || "");
                  const status = String(m.status || "unread");
                  const created = String(m.created_at || "");
                  const meta = STATUS_LABEL[status] || STATUS_LABEL.unread;
                  const isUnread = status === "unread";
                  return (
                    <li
                      key={id}
                      onClick={() => open(m)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40 ${isUnread ? "bg-warning/[0.03]" : ""}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-primary shrink-0 ${isUnread ? "bg-warning/20 text-warning" : "bg-muted/60"}`}
                      >
                        {getInitials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}>
                            {name}
                          </p>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          <span className="text-[11px] text-muted-foreground">{formatRelativeTime(created)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
                        {subject && <p className="text-sm font-medium mt-1 truncate">{subject}</p>}
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{message}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({data?.total || 0} messages)
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
      </div>

      {/* Detail modal */}
      {selected && (() => {
        const id = selected.id as number;
        const status = String(selected.status || "unread");
        const handler = selected.users as Record<string, unknown> | undefined;
        return (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold">{String(selected.name)}</h3>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-sm text-primary hover:underline flex items-center gap-1.5 mt-0.5"
                  >
                    <Mail className="w-3.5 h-3.5" /> {String(selected.email)}
                  </a>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-5 space-y-4">
                {!!selected.subject && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                    <p className="text-sm font-medium">{String(selected.subject)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Message</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{String(selected.message)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/40">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Received</p>
                    <p className="text-xs">{formatDate(String(selected.created_at))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    <Badge variant={STATUS_LABEL[status]?.variant || "default"}>
                      {STATUS_LABEL[status]?.label || status}
                    </Badge>
                  </div>
                  {!!selected.ip_address && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Source</p>
                      <p className="text-[11px] font-mono text-muted-foreground break-all">
                        IP {String(selected.ip_address)}
                      </p>
                    </div>
                  )}
                  {handler && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Last handled by</p>
                      <p className="text-xs">{String(handler.name || "")} — {String(handler.email || "")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 p-4 border-t border-border bg-muted/20">
                <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(String(selected.subject || "your message"))}`}>
                  <Btn size="sm">
                    <Mail className="w-3.5 h-3.5 mr-1.5" /> Reply by email
                  </Btn>
                </a>
                {status !== "archived" ? (
                  <Btn
                    size="sm"
                    variant="outline"
                    isLoading={updateStatus.isPending}
                    onClick={() => {
                      updateStatus.mutate(
                        { id, status: "archived" },
                        { onSuccess: () => setSelected({ ...selected, status: "archived" }) }
                      );
                    }}
                  >
                    <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive
                  </Btn>
                ) : (
                  <Btn
                    size="sm"
                    variant="outline"
                    isLoading={updateStatus.isPending}
                    onClick={() => {
                      updateStatus.mutate(
                        { id, status: "read" },
                        { onSuccess: () => setSelected({ ...selected, status: "read" }) }
                      );
                    }}
                  >
                    <ArchiveRestore className="w-3.5 h-3.5 mr-1.5" /> Unarchive
                  </Btn>
                )}
                {status === "read" && (
                  <Btn
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateStatus.mutate(
                        { id, status: "unread" },
                        { onSuccess: () => setSelected({ ...selected, status: "unread" }) }
                      );
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Mark unread
                  </Btn>
                )}
                {status === "unread" && (
                  <Btn
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateStatus.mutate(
                        { id, status: "read" },
                        { onSuccess: () => setSelected({ ...selected, status: "read" }) }
                      );
                    }}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark read
                  </Btn>
                )}
                <div className="flex-1" />
                <Btn
                  size="sm"
                  variant="danger"
                  onClick={() => setDeleteId(id)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Btn>
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId !== null) {
            deleteOne.mutate(deleteId, {
              onSuccess: () => {
                setDeleteId(null);
                setSelected(null);
              },
            });
          }
        }}
        title="Delete message?"
        description="This message will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* placeholder for unused lucide-icon so tree-shake keeps it */}
      <span className="hidden"><Clock /></span>
    </>
  );
}
