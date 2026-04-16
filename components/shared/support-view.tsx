"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Select, Textarea, Label, Btn, Badge, FieldError } from "@/components/ui";
import { Plus, MessageCircle, Clock, CheckCircle, XCircle, AlertCircle, Search, Lock } from "lucide-react";
import { useMyTicketAccess, useMyTickets, useCreateTicket, useAllTickets, useUpdateTicketStatus } from "@/hooks/use-tickets";
import { EmptyState } from "./empty-state";
import { formatRelativeTime, getInitials } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "primary" | "success" | "warning" | "error" | "accent"> = {
  open: "warning",
  in_progress: "accent",
  resolved: "success",
  closed: "default",
};
const PRIORITY_VARIANT: Record<string, "default" | "warning" | "error"> = {
  low: "default",
  medium: "warning",
  high: "error",
  urgent: "error",
};
const CATEGORY_LABEL: Record<string, string> = {
  general: "General",
  billing: "Billing",
  technical: "Technical",
  account: "Account",
  feature_request: "Feature Request",
  other: "Other",
};

export function SupportView({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) return <AdminTicketView />;
  return <UserTicketView />;
}

// ============================================================================
// USER VIEW
// ============================================================================
function UserTicketView() {
  const { data: access, isLoading: accessLoading } = useMyTicketAccess();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useMyTickets({ page, pageSize: 20, status: statusFilter || undefined });

  const createTicket = useCreateTicket();
  const [form, setForm] = useState({ subject: "", description: "", category: "general" });
  const [error, setError] = useState("");

  if (accessLoading) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>;

  if (!access || access.access === "none") {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="py-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Support not available on your plan</p>
            <p className="text-sm text-muted-foreground mt-1">Upgrade to Standard or Premium to access support tickets.</p>
          </div>
          <Link href="/plans"><Btn size="sm">Upgrade Plan</Btn></Link>
        </CardContent>
      </Card>
    );
  }

  const priority = access.access === "high" ? "High" : "Medium";
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  async function handleCreate() {
    if (!form.subject.trim()) { setError("Subject is required"); return; }
    if (form.description.trim().length < 10) { setError("Description must be at least 10 characters"); return; }
    setError("");
    const r = await createTicket.mutateAsync({
      subject: form.subject.trim(),
      description: form.description.trim(),
      category: form.category as "general",
    });
    if (r.success) { setShowCreate(false); setForm({ subject: "", description: "", category: "general" }); }
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      {!showCreate ? (
        <div className="flex justify-end">
          <Btn onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Ticket</Btn>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Create Support Ticket</CardTitle>
            <CardDescription>Your ticket priority: <Badge variant={access.access === "high" ? "error" : "warning"}>{priority}</Badge> (based on your {access.planName} plan)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary of your issue" error={!!error && !form.subject.trim()} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
                <option value="feature_request">Feature Request</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Describe your issue in detail..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-[11px] text-muted-foreground uppercase">Priority</p>
                <p className="font-semibold text-sm">{priority}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-[11px] text-muted-foreground uppercase">Plan</p>
                <p className="font-semibold text-sm">{access.planName || "—"}</p>
              </div>
            </div>
            {error && <FieldError>{error}</FieldError>}
            <div className="flex gap-3 justify-end">
              <Btn variant="outline" onClick={() => { setShowCreate(false); setForm({ subject: "", description: "", category: "general" }); setError(""); }}>Cancel</Btn>
              <Btn onClick={handleCreate} isLoading={createTicket.isPending}>Submit Ticket</Btn>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + list */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} ticket{(data?.total ?? 0) !== 1 ? "s" : ""}</p>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-44">
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No tickets" description="You haven't submitted any support tickets yet" />
      ) : (
        <div className="space-y-3">
          {items.map((t) => <TicketCard key={t.id as number} ticket={t} />)}
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

// ============================================================================
// ADMIN VIEW
// ============================================================================
function AdminTicketView() {
  const [statusFilter, setStatusFilter] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAllTickets({ page, pageSize: 20, status: statusFilter || undefined, priority: priorityFilter || undefined, search });
  const updateStatus = useUpdateTicketStatus();

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="sm:w-44">
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </Select>
        <Select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="sm:w-36">
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No tickets" description="No tickets match these filters" />
      ) : (
        <div className="space-y-3">
          {items.map((t) => {
            const id = t.id as number;
            const user = t.users as Record<string, unknown> | undefined;
            const userName = String(user?.name || "Unknown");
            const userEmail = String(user?.email || "");
            const status = String(t.status || "open");

            return (
              <Card key={id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {getInitials(userName)}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/support/${id}`} className="font-semibold text-sm hover:text-primary transition-colors truncate block">
                          {String(t.subject || "")}
                        </Link>
                        <p className="text-xs text-muted-foreground">{userName} &middot; {userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={PRIORITY_VARIANT[String(t.priority || "")] || "default"}>{String(t.priority || "")}</Badge>
                      <Badge variant={STATUS_VARIANT[status] || "default"}>{status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{CATEGORY_LABEL[String(t.category || "")] || String(t.category || "")}</span>
                      {!!t.updated_at && <span>{formatRelativeTime(String(t.updated_at))}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {status === "open" && (
                        <Btn size="sm" variant="outline" onClick={() => updateStatus.mutate({ ticketId: id, status: "in_progress" })}>
                          Start
                        </Btn>
                      )}
                      {(status === "open" || status === "in_progress") && (
                        <Btn size="sm" variant="outline" onClick={() => updateStatus.mutate({ ticketId: id, status: "resolved" })}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
                        </Btn>
                      )}
                      <Link href={`/support/${id}`}><Btn size="sm" variant="ghost">View</Btn></Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({data?.total ?? 0} total)</p>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared ticket card
function TicketCard({ ticket }: { ticket: Record<string, unknown> }) {
  const id = ticket.id as number;
  const status = String(ticket.status || "open");
  const priority = String(ticket.priority || "medium");
  return (
    <Link href={`/support/${id}`}>
      <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{String(ticket.subject || "")}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span>{CATEGORY_LABEL[String(ticket.category || "")] || String(ticket.category || "")}</span>
                {!!ticket.updated_at && <span>&middot; {formatRelativeTime(String(ticket.updated_at))}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={PRIORITY_VARIANT[priority] || "default"}>{priority}</Badge>
              <Badge variant={STATUS_VARIANT[status] || "default"}>{status.replace("_", " ")}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
