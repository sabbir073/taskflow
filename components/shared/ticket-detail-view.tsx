"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Textarea, Btn, Badge, Select } from "@/components/ui";
import { ArrowLeft, Send, Upload, X, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useTicket, useReplyToTicket, useUpdateTicketStatus } from "@/hooks/use-tickets";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import Link from "next/link";

const STATUS_VARIANT: Record<string, "default" | "primary" | "success" | "warning" | "error" | "accent"> = {
  open: "warning", in_progress: "accent", resolved: "success", closed: "default",
};
const PRIORITY_VARIANT: Record<string, "default" | "warning" | "error"> = {
  low: "default", medium: "warning", high: "error", urgent: "error",
};
const CATEGORY_LABEL: Record<string, string> = {
  general: "General", billing: "Billing", technical: "Technical",
  account: "Account", feature_request: "Feature Request", other: "Other",
};

interface Props {
  ticketId: number;
  currentUserId: string;
  isAdmin: boolean;
}

export function TicketDetailView({ ticketId, currentUserId, isAdmin }: Props) {
  const { data, isLoading } = useTicket(ticketId);
  const reply = useReplyToTicket();
  const updateStatus = useUpdateTicketStatus();

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (d.url) setAttachments((prev) => [...prev, d.url]);
      } catch { /* */ }
    }
    setUploading(false);
    e.target.value = "";
  }

  function handleSend() {
    if (!message.trim()) return;
    reply.mutate(
      { ticketId, message: message.trim(), attachments: attachments.length > 0 ? attachments : undefined },
      { onSuccess: () => { setMessage(""); setAttachments([]); } }
    );
  }

  if (isLoading) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>;
  if (!data) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Ticket not found</CardContent></Card>;

  const { ticket, messages } = data;
  const user = ticket.users as Record<string, unknown> | undefined;
  const status = String(ticket.status || "open");
  const priority = String(ticket.priority || "medium");
  const isClosed = status === "closed";

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/support" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to tickets
      </Link>

      {/* Ticket header */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">{String(ticket.subject || "")}</h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                {user && <span className="font-medium text-foreground">{String(user.name || "")}</span>}
                <span>{CATEGORY_LABEL[String(ticket.category || "")] || String(ticket.category || "")}</span>
                {!!ticket.created_at && <span>{formatRelativeTime(String(ticket.created_at))}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Badge variant={PRIORITY_VARIANT[priority] || "default"}>{priority}</Badge>
              <Badge variant={STATUS_VARIANT[status] || "default"}>{status.replace("_", " ")}</Badge>
            </div>
          </div>

          {!!ticket.description && (
            <div className="pt-3 border-t border-border/40">
              <p className="text-sm whitespace-pre-wrap">{String(ticket.description)}</p>
            </div>
          )}

          {/* Admin status controls */}
          {isAdmin && !isClosed && (
            <div className="flex items-center gap-2 pt-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Select
                value={status}
                onChange={(e) => updateStatus.mutate({ ticketId, status: e.target.value })}
                className="w-36 h-8 text-xs"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages thread */}
      <Card>
        <CardHeader><CardTitle>Conversation ({messages.length})</CardTitle></CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No replies yet</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const msgUser = msg.users as Record<string, unknown> | undefined;
                const msgName = String(msgUser?.name || "Unknown");
                const isAdminReply = msg.is_admin_reply === true;
                const isSelf = String(msg.user_id) === currentUserId;
                const msgAttachments = (msg.attachments as string[]) || [];

                return (
                  <div
                    key={msg.id as number}
                    className={`flex gap-3 ${isSelf ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isAdminReply
                        ? "bg-gradient-to-br from-primary to-accent text-white"
                        : "bg-gradient-to-br from-primary/20 to-accent/20 text-primary"
                    }`}>
                      {getInitials(msgName)}
                    </div>
                    <div className={`max-w-[80%] ${isSelf ? "text-right" : ""}`}>
                      <div className={`rounded-xl p-3 ${
                        isAdminReply
                          ? "bg-primary/5 border border-primary/20"
                          : "bg-muted/40 border border-border/40"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-semibold">{msgName}</p>
                          {isAdminReply && <Badge variant="primary">Admin</Badge>}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{String(msg.message || "")}</p>
                        {msgAttachments.length > 0 && (
                          <div className="flex gap-2 flex-wrap mt-2">
                            {msgAttachments.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline bg-primary/5 px-2 py-1 rounded-lg">
                                <ImageIcon className="w-3 h-3" /> Attachment {i + 1} <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      {!!msg.created_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(String(msg.created_at))}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply form */}
      {!isClosed ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Type your reply..."
            />
            {attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {attachments.map((url, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 rounded-lg text-xs">
                    <ImageIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">File {i + 1}</span>
                    <button type="button" onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-error"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Attach files"}
                <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
              </label>
              <Btn onClick={handleSend} isLoading={reply.isPending} disabled={!message.trim()}>
                <Send className="w-4 h-4 mr-1" /> Send Reply
              </Btn>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            This ticket is closed. No further replies can be added.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
