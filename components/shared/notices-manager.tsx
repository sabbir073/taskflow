"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input, Textarea, Label, Btn, Badge, FieldError } from "@/components/ui";
import { Megaphone, Plus, Edit2, Trash2, X, Save, Eye, EyeOff } from "lucide-react";
import { useAllNotices, useCreateNotice, useUpdateNotice, useDeleteNotice } from "@/hooks/use-notices";
import { formatRelativeTime } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";

export function NoticesManager() {
  const { data: notices, isLoading } = useAllNotices();
  const createNotice = useCreateNotice();
  const updateNotice = useUpdateNotice();
  const deleteNotice = useDeleteNotice();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newError, setNewError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  async function handleCreate() {
    if (!newTitle.trim()) { setNewError("Title is required"); return; }
    setNewError("");
    const r = await createNotice.mutateAsync({ title: newTitle.trim(), body: newBody.trim(), is_active: true });
    if (r.success) { setNewTitle(""); setNewBody(""); setShowNewForm(false); }
  }

  function startEdit(n: Record<string, unknown>) {
    setEditingId(n.id as number);
    setEditTitle(String(n.title || ""));
    setEditBody(String(n.body || ""));
  }

  async function handleSaveEdit(id: number) {
    if (!editTitle.trim()) return;
    const r = await updateNotice.mutateAsync({ id, data: { title: editTitle.trim(), body: editBody.trim() } });
    if (r.success) setEditingId(null);
  }

  async function handleToggleActive(id: number, currentActive: boolean) {
    await updateNotice.mutateAsync({ id, data: { is_active: !currentActive } });
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this notice? This cannot be undone.")) return;
    await deleteNotice.mutateAsync(id);
  }

  const items = notices || [];

  return (
    <div className="space-y-6">
      {/* New Notice button / form */}
      {!showNewForm ? (
        <div className="flex justify-end">
          <Btn onClick={() => setShowNewForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Notice
          </Btn>
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle>New Notice</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Enter notice title" error={!!newError} />
              {newError && <FieldError>{newError}</FieldError>}
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Write your announcement here..." rows={4} />
            </div>
            <div className="flex gap-3 justify-end">
              <Btn variant="outline" type="button" onClick={() => { setShowNewForm(false); setNewTitle(""); setNewBody(""); setNewError(""); }}>Cancel</Btn>
              <Btn type="button" onClick={handleCreate} isLoading={createNotice.isPending}>
                <Megaphone className="w-4 h-4 mr-1" /> Publish
              </Btn>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notices list */}
      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading notices...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState icon={Megaphone} title="No notices yet" description="Create your first announcement to show it on everyone's dashboard." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const id = n.id as number;
            const isActive = !!n.is_active;
            const isEditing = editingId === id;
            const creator = n.users as Record<string, unknown> | undefined;

            return (
              <Card key={id} className={isActive ? "border-primary/20" : "opacity-60"}>
                <CardContent className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Title</Label>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Message</Label>
                        <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={4} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Btn variant="outline" size="sm" type="button" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Btn>
                        <Btn size="sm" type="button" onClick={() => handleSaveEdit(id)} isLoading={updateNotice.isPending}>
                          <Save className="w-4 h-4 mr-1" /> Save
                        </Btn>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{String(n.title || "")}</h3>
                          <Badge variant={isActive ? "success" : "default"}>{isActive ? "Active" : "Inactive"}</Badge>
                        </div>
                        {!!n.body && <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{String(n.body)}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          {!!creator?.name && <span>By {String(creator.name)}</span>}
                          {!!n.created_at && <span>• {formatRelativeTime(String(n.created_at))}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Btn variant="ghost" size="sm" type="button" onClick={() => handleToggleActive(id, isActive)} title={isActive ? "Deactivate" : "Activate"}>
                          {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Btn>
                        <Btn variant="ghost" size="sm" type="button" onClick={() => startEdit(n)}>
                          <Edit2 className="w-4 h-4" />
                        </Btn>
                        <Btn variant="ghost" size="sm" type="button" onClick={() => handleDelete(id)}>
                          <Trash2 className="w-4 h-4 text-error" />
                        </Btn>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
