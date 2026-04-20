"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Btn, Input, Textarea, Label, FieldError, Badge, Select } from "@/components/ui";
import { Send, Search, Users as UsersIcon, X, Loader2, Filter, UserCheck } from "lucide-react";
import { sendBroadcast, listBroadcastRecipients } from "@/lib/actions/broadcasts";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

type Recipient = { id: string; name: string; email: string; role: string; status: string };

type Mode = "selected" | "filter";

export function BroadcastView() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});

  // Picker
  const [mode, setMode] = useState<Mode>("selected");
  const [search, setSearch] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filter mode
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterApproval, setFilterApproval] = useState<"" | "pending" | "approved">("");
  const [filterAll, setFilterAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Defer the loading flip to the microtask queue so we don't cascade-render
    queueMicrotask(() => { if (!cancelled) setLoadingList(true); });
    listBroadcastRecipients(search).then((rows) => {
      if (!cancelled) {
        setRecipients(rows);
        setLoadingList(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [search]);

  const selectedList = useMemo(
    () => recipients.filter((r) => selected.has(r.id)),
    [recipients, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      recipients.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function clearSelected() {
    setSelected(new Set());
  }

  async function handleSend() {
    const nextErrors: typeof errors = {};
    if (!title.trim()) nextErrors.title = "Title is required";
    if (!message.trim()) nextErrors.message = "Message is required";
    if (mode === "selected" && selected.size === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    if (mode === "filter" && !filterAll && !filterRole && !filterStatus && !filterApproval) {
      toast.error("Pick at least one filter or check 'All users'");
      return;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSending(true);
    const payload =
      mode === "selected"
        ? { title, message, link: link || null, userIds: Array.from(selected) }
        : {
            title,
            message,
            link: link || null,
            filter: {
              role: filterRole || undefined,
              status: filterStatus || undefined,
              approval: filterApproval || undefined,
              allUsers: filterAll || undefined,
            },
          };

    const res = await sendBroadcast(payload);
    setSending(false);

    if (res.success) {
      toast.success(res.message || "Broadcast sent");
      setTitle("");
      setMessage("");
      setLink("");
      setSelected(new Set());
    } else {
      toast.error(res.error || "Failed to send");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Compose */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Compose</CardTitle>
          <CardDescription>Notification goes into the in-app feed only — no email is sent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled maintenance tonight"
              error={!!errors.title}
              maxLength={200}
            />
            {errors.title && <FieldError>{errors.title}</FieldError>}
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Short plain-text message for the user"
              rows={5}
              error={!!errors.message}
              maxLength={2000}
            />
            {errors.message && <FieldError>{errors.message}</FieldError>}
            <p className="text-[11px] text-muted-foreground mt-1">{message.length} / 2000</p>
          </div>
          <div>
            <Label>Optional link</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/dashboard, /plans, etc."
            />
            <p className="text-[11px] text-muted-foreground mt-1">Where the user lands when tapping the notification.</p>
          </div>

          <div className="pt-2">
            <Btn onClick={handleSend} disabled={sending} isLoading={sending}>
              <Send className="w-4 h-4 mr-1.5" /> Send Broadcast
            </Btn>
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4" /> Recipients
          </CardTitle>
          <CardDescription>
            {mode === "selected"
              ? `${selected.size} selected`
              : filterAll
              ? "All users (filtered)"
              : "Filtered users"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("selected")}
              className={`flex-1 text-xs font-semibold py-2 ${mode === "selected" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
            >
              Pick users
            </button>
            <button
              type="button"
              onClick={() => setMode("filter")}
              className={`flex-1 text-xs font-semibold py-2 border-l border-border ${mode === "filter" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
            >
              Filter
            </button>
          </div>

          {mode === "selected" ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or email"
                  className="pl-9"
                />
              </div>

              {selected.size > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{selected.size} selected</span>
                  <button
                    type="button"
                    onClick={clearSelected}
                    className="text-error hover:text-error/80 font-medium"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {selectedList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto">
                  {selectedList.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                    >
                      {r.name}
                      <button
                        type="button"
                        onClick={() => toggle(r.id)}
                        className="hover:bg-primary/20 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {loadingList ? "Loading..." : `${recipients.length} shown`}
                </span>
                {recipients.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Select all visible
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-auto rounded-lg border border-border divide-y divide-border">
                {loadingList ? (
                  <div className="p-6 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">No users found</div>
                ) : (
                  recipients.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {getInitials(r.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{r.email}</p>
                      </div>
                      <Badge variant="default" className="text-[9px]">{r.role}</Badge>
                    </label>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <label className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterAll}
                  onChange={(e) => setFilterAll(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <UserCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Send to every user</span>
              </label>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> Or narrow by:
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                    <option value="">Any role</option>
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super admin</option>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Any status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Approval</Label>
                  <Select
                    value={filterApproval}
                    onChange={(e) => setFilterApproval(e.target.value as "" | "pending" | "approved")}
                  >
                    <option value="">Any</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending approval</option>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
