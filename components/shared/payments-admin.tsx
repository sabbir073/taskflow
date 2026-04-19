"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Textarea, Select, Label, Btn, Badge, FieldError } from "@/components/ui";
import {
  Plus, Edit2, Trash2, Upload, X, Save, Eye, EyeOff, CheckCircle, XCircle, Clock, Wallet, Package, ExternalLink, Sparkles,
} from "lucide-react";
import {
  useAllPaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod,
  useAllPointPackages, useCreatePointPackage, useUpdatePointPackage, useDeletePointPackage,
  useAllPayments, useReviewPayment,
} from "@/hooks/use-payments";
import { useAllPlans, useCreatePlan, useUpdatePlan, useDeletePlan } from "@/hooks/use-plans";
import { EmptyState } from "./empty-state";
import { ConfirmDialog } from "./confirm-dialog";
import { getInitials, formatRelativeTime } from "@/lib/utils";

type Tab = "plans" | "methods" | "packages" | "submissions";

export function PaymentsAdmin() {
  const [tab, setTab] = useState<Tab>("plans");

  // Count badges
  const plansCount = useAllPlans();
  const methodsCount = useAllPaymentMethods();
  const packagesCount = useAllPointPackages();
  const submissionsCount = useAllPayments({ page: 1, pageSize: 1, status: "pending" });

  const tabs = [
    { key: "plans" as const, label: "Plans", count: plansCount.data?.length ?? 0 },
    { key: "methods" as const, label: "Payment Methods", count: methodsCount.data?.length ?? 0 },
    { key: "packages" as const, label: "Point Packages", count: packagesCount.data?.length ?? 0 },
    { key: "submissions" as const, label: "Review Submissions", count: submissionsCount.data?.total ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border/50 pb-px overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              tab === t.key
                ? "text-primary bg-primary/5 border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === "plans" && <PlansTab />}
      {tab === "methods" && <MethodsTab />}
      {tab === "packages" && <PackagesTab />}
      {tab === "submissions" && <SubmissionsTab />}
    </div>
  );
}

// ============================================================================
// PLANS TAB
// ============================================================================
function PlansTab() {
  const { data: plans, isLoading } = useAllPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: 0,
    currency: "bdt" as "usd" | "bdt",
    period: "monthly" as "monthly" | "yearly" | "forever",
    price_monthly: "" as string,
    price_half_yearly: "" as string,
    price_yearly: "" as string,
    description: "",
    max_tasks: "" as string,
    max_groups: "" as string,
    included_credits: 0,
    support_level: "none" as "none" | "community" | "priority",
    support_ticket_access: "none" as "none" | "medium" | "high",
    features: "",
    display_order: 0,
  });
  const [error, setError] = useState("");

  function resetForm() {
    setForm({
      name: "",
      price: 0,
      currency: "bdt",
      period: "monthly",
      price_monthly: "",
      price_half_yearly: "",
      price_yearly: "",
      description: "",
      max_tasks: "",
      max_groups: "",
      included_credits: 0,
      support_level: "none",
      support_ticket_access: "none",
      features: "",
      display_order: 0,
    });
    setError("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(p: Record<string, unknown>) {
    setEditingId(p.id as number);
    const featuresArr = Array.isArray(p.features) ? (p.features as string[]) : typeof p.features === "string" ? (() => { try { const x = JSON.parse(String(p.features)); return Array.isArray(x) ? x : []; } catch { return []; } })() : [];
    const numOrEmpty = (v: unknown) => (v === null || v === undefined ? "" : String(v));
    setForm({
      name: String(p.name || ""),
      price: Number(p.price || 0),
      currency: (String(p.currency || "bdt") as "usd" | "bdt"),
      period: (String(p.period || "monthly") as "monthly" | "yearly" | "forever"),
      price_monthly: numOrEmpty(p.price_monthly),
      price_half_yearly: numOrEmpty(p.price_half_yearly),
      price_yearly: numOrEmpty(p.price_yearly),
      description: String(p.description || ""),
      max_tasks: numOrEmpty(p.max_tasks),
      max_groups: numOrEmpty(p.max_groups),
      included_credits: Number(p.included_credits || 0),
      support_level: (String(p.support_level || "none") as "none" | "community" | "priority"),
      support_ticket_access: (String(p.support_ticket_access || "none") as "none" | "medium" | "high"),
      features: featuresArr.join("\n"),
      display_order: Number(p.display_order || 0),
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.price < 0) { setError("Price cannot be negative"); return; }
    setError("");
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      currency: form.currency,
      period: form.period,
      price_monthly: form.price_monthly === "" ? null : Number(form.price_monthly),
      price_half_yearly: form.price_half_yearly === "" ? null : Number(form.price_half_yearly),
      price_yearly: form.price_yearly === "" ? null : Number(form.price_yearly),
      description: form.description,
      features: form.features
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0),
      max_tasks: form.max_tasks === "" ? null : Number(form.max_tasks),
      max_groups: form.max_groups === "" ? null : Number(form.max_groups),
      included_credits: Number(form.included_credits),
      support_level: form.support_level,
      support_ticket_access: form.support_ticket_access,
      is_active: true,
      display_order: Number(form.display_order) || 0,
    };
    const r = editingId
      ? await updatePlan.mutateAsync({ id: editingId, data: payload })
      : await createPlan.mutateAsync(payload);
    if (r.success) resetForm();
  }

  const list = plans || [];

  return (
    <div className="space-y-4">
      {!showForm ? (
        <div className="flex justify-end">
          <Btn onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Plan</Btn>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Plan" : "New Plan"}</CardTitle>
            <CardDescription>Limits and perks shown to users on the plans page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Basic" error={!!error} />
                {error && <FieldError>{error}</FieldError>}
              </div>
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Base Price *</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "usd" | "bdt" })}>
                  <option value="bdt">BDT</option>
                  <option value="usd">USD</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default Period</Label>
                <Select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value as "monthly" | "yearly" | "forever" })}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="forever">Forever</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Billing Tier Prices</Label>
              <p className="text-[11px] text-muted-foreground">Leave a tier blank to hide it on the plans page.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Monthly</Label>
                  <Input type="number" step="0.01" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} placeholder="199" />
                </div>
                <div className="space-y-1.5">
                  <Label>6 Months</Label>
                  <Input type="number" step="0.01" value={form.price_half_yearly} onChange={(e) => setForm({ ...form, price_half_yearly: e.target.value })} placeholder="1074" />
                </div>
                <div className="space-y-1.5">
                  <Label>Yearly</Label>
                  <Input type="number" step="0.01" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: e.target.value })} placeholder="1910" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Max Tasks</Label>
                <Input type="number" value={form.max_tasks} onChange={(e) => setForm({ ...form, max_tasks: e.target.value })} placeholder="Unlimited" />
              </div>
              <div className="space-y-1.5">
                <Label>Max Groups</Label>
                <Input type="number" value={form.max_groups} onChange={(e) => setForm({ ...form, max_groups: e.target.value })} placeholder="Unlimited" />
              </div>
              <div className="space-y-1.5">
                <Label>Included Credits</Label>
                <Input type="number" step="0.01" value={form.included_credits} onChange={(e) => setForm({ ...form, included_credits: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Support Level</Label>
                <Select value={form.support_level} onChange={(e) => setForm({ ...form, support_level: e.target.value as "none" | "community" | "priority" })}>
                  <option value="none">No support</option>
                  <option value="community">Community</option>
                  <option value="priority">Priority</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Support Ticket Access</Label>
              <Select value={form.support_ticket_access} onChange={(e) => setForm({ ...form, support_ticket_access: e.target.value as "none" | "medium" | "high" })}>
                <option value="none">No access — users on this plan can&apos;t create tickets</option>
                <option value="medium">Medium priority — tickets default to Medium</option>
                <option value="high">High priority — tickets default to High</option>
              </Select>
              <p className="text-[11px] text-muted-foreground">Controls whether users on this plan can see the Support page and what priority their tickets get.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Features (one per line)</Label>
              <Textarea
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                rows={4}
                placeholder={"10 tasks\n3 groups\n50 credits"}
              />
              <p className="text-[11px] text-muted-foreground">Free-form bullet list shown on the plans page.</p>
            </div>

            <div className="flex gap-3 justify-end">
              <Btn variant="outline" type="button" onClick={resetForm}>Cancel</Btn>
              <Btn type="button" onClick={handleSave} isLoading={createPlan.isPending || updatePlan.isPending}>
                <Save className="w-4 h-4 mr-1" /> {editingId ? "Save Changes" : "Add Plan"}
              </Btn>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : list.length === 0 ? (
        <EmptyState icon={Sparkles} title="No plans yet" description="Create the first subscription plan." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((p) => {
            const id = p.id as number;
            const isActive = !!p.is_active;
            const currency = String(p.currency || "usd").toUpperCase();
            const price = Number(p.price || 0);
            const features = Array.isArray(p.features) ? (p.features as string[]) : typeof p.features === "string" ? (() => { try { const x = JSON.parse(String(p.features)); return Array.isArray(x) ? x : []; } catch { return []; } })() : [];
            const support = String(p.support_level || "none");
            return (
              <Card key={id} className={isActive ? "" : "opacity-60"}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-lg">{String(p.name || "")}</p>
                      {!!p.description && <p className="text-xs text-muted-foreground">{String(p.description)}</p>}
                    </div>
                    <Badge variant={isActive ? "success" : "default"}>{isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">{price.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">{currency}/{String(p.period || "")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-muted/40">
                      <p className="text-muted-foreground">Max Tasks</p>
                      <p className="font-semibold">{p.max_tasks == null ? "Unlimited" : String(p.max_tasks)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <p className="text-muted-foreground">Max Groups</p>
                      <p className="font-semibold">{p.max_groups == null ? "Unlimited" : String(p.max_groups)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <p className="text-muted-foreground">Credits</p>
                      <p className="font-semibold">{Number(p.included_credits || 0).toFixed(0)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <p className="text-muted-foreground">Support</p>
                      <p className="font-semibold capitalize">{support === "none" ? "—" : support}</p>
                    </div>
                  </div>
                  {features.length > 0 && (
                    <ul className="space-y-1 text-xs">
                      {features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle className="w-3 h-3 text-success shrink-0 mt-0.5" />
                          <span>{typeof f === "string" ? f : String(f)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-1 pt-2 border-t border-border/40">
                    <Btn
                      variant="ghost"
                      size="sm"
                      title={isActive ? "Deactivate" : "Activate"}
                      onClick={() => updatePlan.mutate({ id, data: { is_active: !isActive } })}
                    >
                      {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={() => startEdit(p)}><Edit2 className="w-4 h-4" /></Btn>
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget({ id, name: String(p.name || "") })}
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </Btn>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deletePlan.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Delete plan?"
        description={`This will permanently delete "${deleteTarget?.name || ""}". Any existing subscriptions on this plan will be removed and affected users will lose access. This cannot be undone.`}
        confirmLabel="Delete Plan"
        isLoading={deletePlan.isPending}
      />
    </div>
  );
}

// ============================================================================
// PAYMENT METHODS TAB
// ============================================================================
function MethodsTab() {
  const { data: methods, isLoading } = useAllPaymentMethods();
  const createMethod = useCreatePaymentMethod();
  const updateMethod = useUpdatePaymentMethod();
  const deleteMethod = useDeletePaymentMethod();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    logo_url: "",
    currency: "usd" as "usd" | "bdt",
    qr_code_url: "",
    instruction: "",
    display_order: 0,
  });
  const [error, setError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);

  async function uploadOne(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      return typeof data?.url === "string" ? data.url : null;
    } catch { return null; }
  }

  function resetForm() {
    setForm({ name: "", logo_url: "", currency: "usd", qr_code_url: "", instruction: "", display_order: 0 });
    setError("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(m: Record<string, unknown>) {
    setEditingId(m.id as number);
    setForm({
      name: String(m.name || ""),
      logo_url: String(m.logo_url || ""),
      currency: (String(m.currency || "usd") as "usd" | "bdt"),
      qr_code_url: String(m.qr_code_url || ""),
      instruction: String(m.instruction || ""),
      display_order: Number(m.display_order || 0),
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setError("");
    const payload = {
      name: form.name.trim(),
      logo_url: form.logo_url || null,
      currency: form.currency,
      qr_code_url: form.qr_code_url || null,
      instruction: form.instruction,
      is_active: true,
      display_order: Number(form.display_order) || 0,
    };
    const r = editingId
      ? await updateMethod.mutateAsync({ id: editingId, data: payload })
      : await createMethod.mutateAsync(payload);
    if (r.success) resetForm();
  }

  const list = methods || [];

  return (
    <div className="space-y-4">
      {!showForm ? (
        <div className="flex justify-end">
          <Btn onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Method</Btn>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Payment Method" : "New Payment Method"}</CardTitle>
            <CardDescription>Users will see the logo, name, QR code, and instructions when paying.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. bKash" error={!!error} />
                {error && <FieldError>{error}</FieldError>}
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "usd" | "bdt" })}>
                  <option value="usd">USD</option>
                  <option value="bdt">BDT</option>
                </Select>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-border bg-muted/40 flex items-center justify-center overflow-hidden relative">
                  {form.logo_url ? (
                    <>
                      <img src={form.logo_url} alt="" className="w-full h-full object-contain" />
                      <button type="button" onClick={() => setForm({ ...form, logo_url: "" })} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <Wallet className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploadingLogo ? "Uploading..." : "Upload logo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploadingLogo(true);
                      const url = await uploadOne(f);
                      if (url) setForm((prev) => ({ ...prev, logo_url: url }));
                      setUploadingLogo(false);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* QR code */}
            <div className="space-y-2">
              <Label>QR Code</Label>
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 rounded-xl border border-border bg-muted/40 flex items-center justify-center overflow-hidden relative">
                  {form.qr_code_url ? (
                    <>
                      <img src={form.qr_code_url} alt="" className="w-full h-full object-contain" />
                      <button type="button" onClick={() => setForm({ ...form, qr_code_url: "" })} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No QR</span>
                  )}
                </div>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploadingQR ? "Uploading..." : "Upload QR code"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploadingQR(true);
                      const url = await uploadOne(f);
                      if (url) setForm((prev) => ({ ...prev, qr_code_url: url }));
                      setUploadingQR(false);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Instructions</Label>
              <Textarea
                value={form.instruction}
                onChange={(e) => setForm({ ...form, instruction: e.target.value })}
                placeholder="e.g. Send the amount to +880XXXXXXXXXX and paste the transaction ID below."
                rows={4}
              />
            </div>

            <div className="space-y-1.5 max-w-[140px]">
              <Label>Display Order</Label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
            </div>

            <div className="flex gap-3 justify-end">
              <Btn variant="outline" type="button" onClick={resetForm}>Cancel</Btn>
              <Btn type="button" onClick={handleSave} isLoading={createMethod.isPending || updateMethod.isPending}>
                <Save className="w-4 h-4 mr-1" /> {editingId ? "Save Changes" : "Add Method"}
              </Btn>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : list.length === 0 ? (
        <EmptyState icon={Wallet} title="No payment methods" description="Add at least one method so users can pay." />
      ) : (
        <div className="space-y-3">
          {list.map((m) => {
            const id = m.id as number;
            const isActive = !!m.is_active;
            return (
              <Card key={id} className={isActive ? "" : "opacity-60"}>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
                      {m.logo_url ? <img src={String(m.logo_url)} alt="" className="w-full h-full object-contain" /> : <Wallet className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{String(m.name || "")}</p>
                        <Badge variant="primary">{String(m.currency || "").toUpperCase()}</Badge>
                        <Badge variant={isActive ? "success" : "default"}>{isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                      {!!m.instruction && <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1 line-clamp-3">{String(m.instruction)}</p>}
                      {!!m.qr_code_url && (
                        <a href={String(m.qr_code_url)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-1">
                          View QR code <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Btn
                      variant="ghost"
                      size="sm"
                      title={isActive ? "Deactivate" : "Activate"}
                      onClick={() => updateMethod.mutate({ id, data: { is_active: !isActive } })}
                    >
                      {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={() => startEdit(m)}><Edit2 className="w-4 h-4" /></Btn>
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget({ id, name: String(m.name || "") })}
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </Btn>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMethod.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Delete payment method?"
        description={`This will remove "${deleteTarget?.name || ""}" from the list of accepted payment methods. Existing payments that referenced it will keep their records.`}
        confirmLabel="Delete Method"
        isLoading={deleteMethod.isPending}
      />
    </div>
  );
}

// ============================================================================
// POINT PACKAGES TAB
// ============================================================================
function PackagesTab() {
  const { data: packages, isLoading } = useAllPointPackages();
  const createPkg = useCreatePointPackage();
  const updatePkg = useUpdatePointPackage();
  const deletePkg = useDeletePointPackage();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    points: 100,
    price: 10,
    currency: "usd" as "usd" | "bdt",
    description: "",
    display_order: 0,
  });
  const [error, setError] = useState("");

  function resetForm() {
    setForm({ name: "", points: 100, price: 10, currency: "usd", description: "", display_order: 0 });
    setError("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(p: Record<string, unknown>) {
    setEditingId(p.id as number);
    setForm({
      name: String(p.name || ""),
      points: Number(p.points || 0),
      price: Number(p.price || 0),
      currency: (String(p.currency || "usd") as "usd" | "bdt"),
      description: String(p.description || ""),
      display_order: Number(p.display_order || 0),
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.points <= 0 || form.price <= 0) { setError("Points and price must be greater than 0"); return; }
    setError("");
    const payload = {
      name: form.name.trim(),
      points: Number(form.points),
      price: Number(form.price),
      currency: form.currency,
      description: form.description || null,
      is_active: true,
      display_order: Number(form.display_order) || 0,
    };
    const r = editingId
      ? await updatePkg.mutateAsync({ id: editingId, data: payload })
      : await createPkg.mutateAsync(payload);
    if (r.success) resetForm();
  }

  const list = packages || [];

  return (
    <div className="space-y-4">
      {!showForm ? (
        <div className="flex justify-end">
          <Btn onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Package</Btn>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Point Package" : "New Point Package"}</CardTitle>
            <CardDescription>Users buy points using these packages from the plan page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Starter Bundle" error={!!error} />
              {error && <FieldError>{error}</FieldError>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Points *</Label>
                <Input type="number" step="0.01" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Price *</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "usd" | "bdt" })}>
                  <option value="usd">USD</option>
                  <option value="bdt">BDT</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5 max-w-[140px]">
              <Label>Display Order</Label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
            </div>
            <div className="flex gap-3 justify-end">
              <Btn variant="outline" type="button" onClick={resetForm}>Cancel</Btn>
              <Btn type="button" onClick={handleSave} isLoading={createPkg.isPending || updatePkg.isPending}>
                <Save className="w-4 h-4 mr-1" /> {editingId ? "Save Changes" : "Add Package"}
              </Btn>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : list.length === 0 ? (
        <EmptyState icon={Package} title="No point packages" description="Add point packages users can buy from the plans page." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((p) => {
            const id = p.id as number;
            const isActive = !!p.is_active;
            return (
              <Card key={id} className={isActive ? "" : "opacity-60"}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{String(p.name || "")}</p>
                    <Badge variant={isActive ? "success" : "default"}>{isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary">{Number(p.points || 0).toFixed(0)} pts</span>
                    <span className="text-sm text-muted-foreground">
                      for {Number(p.price || 0).toFixed(2)} {String(p.currency || "").toUpperCase()}
                    </span>
                  </div>
                  {!!p.description && <p className="text-xs text-muted-foreground">{String(p.description)}</p>}
                  <div className="flex items-center gap-1 pt-2 border-t border-border/40">
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => updatePkg.mutate({ id, data: { is_active: !isActive } })}
                    >
                      {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={() => startEdit(p)}><Edit2 className="w-4 h-4" /></Btn>
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget({ id, name: String(p.name || "") })}
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </Btn>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deletePkg.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Delete point package?"
        description={`This will permanently delete "${deleteTarget?.name || ""}". Users won't be able to buy this package anymore.`}
        confirmLabel="Delete Package"
        isLoading={deletePkg.isPending}
      />
    </div>
  );
}

// ============================================================================
// SUBMISSIONS TAB (admin review queue)
// ============================================================================
function SubmissionsTab() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [approveNotes, setApproveNotes] = useState<Record<number, string>>({});

  const { data, isLoading } = useAllPayments({ page, pageSize: 20, status: statusFilter || undefined });
  const review = useReviewPayment();

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-44">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No payments" description="No payment submissions match this filter." />
      ) : (
        <div className="space-y-3">
          {items.map((payment) => {
            const id = payment.id as number;
            const user = payment.users as Record<string, unknown> | undefined;
            const method = payment.payment_methods as Record<string, unknown> | undefined;
            const plan = payment.plans as Record<string, unknown> | undefined;
            const pkg = payment.point_packages as Record<string, unknown> | undefined;
            const userName = String(user?.name || "Unknown");
            const userEmail = String(user?.email || "");
            const purpose = String(payment.purpose || "");
            const status = String(payment.status || "pending");
            const amount = Number(payment.amount || 0);
            const currency = String(payment.currency || "usd");
            const txId = String(payment.transaction_id || "");

            return (
              <Card key={id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary">
                        {getInitials(userName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{userName}</p>
                        <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {status === "pending" && <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>}
                      {status === "approved" && <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>}
                      {status === "rejected" && <Badge variant="error"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>}
                      {!!payment.created_at && (
                        <span className="text-[11px] text-muted-foreground">{formatRelativeTime(String(payment.created_at))}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase text-muted-foreground">Purpose</p>
                      <p className="font-medium capitalize">{purpose}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-muted-foreground">Amount</p>
                      <p className="font-medium">{amount.toFixed(2)} {currency.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-muted-foreground">Method</p>
                      <p className="font-medium">{String(method?.name || "—")}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-muted-foreground">Transaction ID</p>
                      <p className="font-medium break-all">{txId}</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {purpose === "points" && pkg && <span>Package: <span className="font-medium text-foreground">{String(pkg.name || "")}</span> ({Number(pkg.points || 0).toFixed(0)} pts)</span>}
                    {(purpose === "subscription" || purpose === "signup") && plan && <span>Plan: <span className="font-medium text-foreground">{String(plan.name || "")}</span></span>}
                  </div>

                  {!!payment.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">{String(payment.notes)}</p>
                  )}

                  {!!payment.review_notes && (
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
                      <span className="font-medium">Admin note:</span> {String(payment.review_notes)}
                    </p>
                  )}

                  {status === "pending" && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      {rejectTarget === id ? (
                        <div className="space-y-2">
                          <Input
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder="Reason for rejection (required)"
                          />
                          <div className="flex gap-2 justify-end">
                            <Btn variant="ghost" size="sm" onClick={() => { setRejectTarget(null); setRejectNotes(""); }}>Cancel</Btn>
                            <Btn
                              variant="danger"
                              size="sm"
                              disabled={!rejectNotes.trim() || review.isPending}
                              onClick={() => {
                                review.mutate(
                                  { paymentId: id, action: "reject", notes: rejectNotes.trim() },
                                  { onSuccess: () => { setRejectTarget(null); setRejectNotes(""); } }
                                );
                              }}
                            >
                              Confirm Reject
                            </Btn>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Textarea
                            rows={2}
                            value={approveNotes[id] || ""}
                            onChange={(e) => setApproveNotes({ ...approveNotes, [id]: e.target.value })}
                            placeholder="Optional note for the user on approval"
                          />
                          <div className="flex gap-2 justify-end">
                            <Btn variant="outline" size="sm" onClick={() => { setRejectTarget(id); setRejectNotes(""); }}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Btn>
                            <Btn
                              size="sm"
                              isLoading={review.isPending}
                              onClick={() => review.mutate({ paymentId: id, action: "approve", notes: approveNotes[id]?.trim() || undefined })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Btn>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({data?.total || 0} total)</p>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
