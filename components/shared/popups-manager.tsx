"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Textarea, Select, Label, Btn, Badge, FieldError } from "@/components/ui";
import { Plus, Edit2, Trash2, X, Save, Eye, EyeOff, Globe, LayoutDashboard, ExternalLink, ImagePlus } from "lucide-react";
import { useAllPopups, useCreatePopup, useUpdatePopup, useDeletePopup } from "@/hooks/use-popups";
import { EmptyState } from "./empty-state";
import { ConfirmDialog } from "./confirm-dialog";

export function PopupsManager() {
  const { data: popups, isLoading } = useAllPopups();
  const createPopup = useCreatePopup();
  const updatePopup = useUpdatePopup();
  const deletePopup = useDeletePopup();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    title: "",
    image_url: "",
    text_content: "",
    text_position: "bottom" as "top" | "bottom",
    target: "dashboard" as "website" | "dashboard",
    link_url: "",
    display_order: 0,
  });
  const [error, setError] = useState("");

  function resetForm() {
    setForm({ title: "", image_url: "", text_content: "", text_position: "bottom", target: "dashboard", link_url: "", display_order: 0 });
    setError("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(p: Record<string, unknown>) {
    setEditingId(p.id as number);
    setForm({
      title: String(p.title || ""),
      image_url: String(p.image_url || ""),
      text_content: String(p.text_content || ""),
      text_position: (String(p.text_position || "bottom") as "top" | "bottom"),
      target: (String(p.target || "dashboard") as "website" | "dashboard"),
      link_url: String(p.link_url || ""),
      display_order: Number(p.display_order || 0),
    });
    setShowForm(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setForm((prev) => ({ ...prev, image_url: data.url }));
    } catch { /* */ }
    setUploadingImage(false);
    e.target.value = "";
  }

  async function handleSave() {
    if (!form.image_url && !form.text_content) { setError("Add an image or text content"); return; }
    setError("");
    const payload = {
      title: form.title.trim(),
      image_url: form.image_url || null,
      text_content: form.text_content.trim() || null,
      text_position: form.text_position,
      target: form.target,
      link_url: form.link_url.trim() || null,
      is_active: true,
      display_order: Number(form.display_order) || 0,
    };
    const r = editingId
      ? await updatePopup.mutateAsync({ id: editingId, data: payload })
      : await createPopup.mutateAsync(payload);
    if (r.success) resetForm();
  }

  const list = popups || [];
  const websitePopups = list.filter((p) => p.target === "website");
  const dashboardPopups = list.filter((p) => p.target === "dashboard");

  return (
    <div className="space-y-6">
      {/* Create / Edit form */}
      {!showForm ? (
        <div className="flex justify-end">
          <Btn onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Popup</Btn>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Popup" : "New Popup"}</CardTitle>
            <CardDescription>Upload an image banner and optionally add text above or below it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title (internal label)</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Promo" />
              </div>
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
              </div>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label>Popup Image *</Label>
              {form.image_url ? (
                <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20 max-w-md">
                  <img src={form.image_url} alt="" className="w-full h-auto" />
                  <button type="button" onClick={() => setForm({ ...form, image_url: "" })}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 px-5 py-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors max-w-md">
                  <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{uploadingImage ? "Uploading..." : "Click to upload popup image"}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG or GIF. This is the main banner shown in the popup.</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Text content */}
            <div className="space-y-1.5">
              <Label>Text Content (optional)</Label>
              <Textarea
                value={form.text_content}
                onChange={(e) => setForm({ ...form, text_content: e.target.value })}
                rows={3}
                placeholder="Optional text shown above or below the image..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Text Position</Label>
                <Select value={form.text_position} onChange={(e) => setForm({ ...form, text_position: e.target.value as "top" | "bottom" })}>
                  <option value="top">Above image</option>
                  <option value="bottom">Below image</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Show On *</Label>
                <Select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as "website" | "dashboard" })}>
                  <option value="dashboard">User Dashboard</option>
                  <option value="website">Public Website</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Click URL (optional)</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." type="url" />
              </div>
            </div>

            {error && <FieldError>{error}</FieldError>}

            <div className="flex gap-3 justify-end">
              <Btn variant="outline" type="button" onClick={resetForm}>Cancel</Btn>
              <Btn type="button" onClick={handleSave} isLoading={createPopup.isPending || updatePopup.isPending}>
                <Save className="w-4 h-4 mr-1" /> {editingId ? "Save Changes" : "Create Popup"}
              </Btn>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : list.length === 0 ? (
        <EmptyState icon={ImagePlus} title="No popups yet" description="Create a popup to show announcements or promotions to users." />
      ) : (
        <div className="space-y-6">
          {/* Website popups */}
          {websitePopups.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Website Popups ({websitePopups.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {websitePopups.map((p) => (
                  <PopupCard key={p.id as number} popup={p} onEdit={startEdit} onDelete={(id, title) => setDeleteTarget({ id, title })}
                    onToggle={(id, active) => updatePopup.mutate({ id, data: { is_active: !active } })} />
                ))}
              </div>
            </div>
          )}

          {/* Dashboard popups */}
          {dashboardPopups.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Dashboard Popups ({dashboardPopups.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardPopups.map((p) => (
                  <PopupCard key={p.id as number} popup={p} onEdit={startEdit} onDelete={(id, title) => setDeleteTarget({ id, title })}
                    onToggle={(id, active) => updatePopup.mutate({ id, data: { is_active: !active } })} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deletePopup.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete popup?"
        description={`This will permanently remove "${deleteTarget?.title || "this popup"}".`}
        confirmLabel="Delete"
        isLoading={deletePopup.isPending}
      />
    </div>
  );
}

function PopupCard({
  popup,
  onEdit,
  onDelete,
  onToggle,
}: {
  popup: Record<string, unknown>;
  onEdit: (p: Record<string, unknown>) => void;
  onDelete: (id: number, title: string) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const id = popup.id as number;
  const title = String(popup.title || "Untitled");
  const imageUrl = String(popup.image_url || "");
  const text = String(popup.text_content || "");
  const isActive = !!popup.is_active;
  const target = String(popup.target || "dashboard");
  const linkUrl = String(popup.link_url || "");

  return (
    <Card className={isActive ? "" : "opacity-60"}>
      {imageUrl && (
        <div className="relative aspect-video bg-muted overflow-hidden rounded-t-xl">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{title}</p>
            {text && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{text}</p>}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={isActive ? "success" : "default"}>{isActive ? "Active" : "Off"}</Badge>
            <Badge variant={target === "website" ? "accent" : "primary"}>{target === "website" ? "Website" : "Dashboard"}</Badge>
          </div>
        </div>

        {linkUrl && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
            {linkUrl.slice(0, 40)}... <ExternalLink className="w-3 h-3" />
          </a>
        )}

        <div className="flex items-center gap-1 pt-2 border-t border-border/40">
          <Btn variant="ghost" size="sm" onClick={() => onToggle(id, isActive)} title={isActive ? "Deactivate" : "Activate"}>
            {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => onEdit(popup)}><Edit2 className="w-4 h-4" /></Btn>
          <Btn variant="ghost" size="sm" onClick={() => onDelete(id, title)}><Trash2 className="w-4 h-4 text-error" /></Btn>
        </div>
      </CardContent>
    </Card>
  );
}
