"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardContent, Input, Textarea, Select, Label, Btn, FieldError, Badge } from "@/components/ui";
import { AlertTriangle, Upload, X, LogOut, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { useMyLatestAppeal, useSubmitAppeal } from "@/hooks/use-appeals";
import { StatusWatcher } from "@/components/shared/status-watcher";
import { getInitials, formatRelativeTime } from "@/lib/utils";

type Category = "mistake" | "accept_fault" | "hacked" | "other";

interface Props {
  user: { name: string | null; email: string; image: string | null };
}

export function SuspendedView({ user }: Props) {
  const { data: latestAppeal } = useMyLatestAppeal();
  const submitAppeal = useSubmitAppeal();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState<Category>("mistake");
  const [categoryOther, setCategoryOther] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const latestStatus = latestAppeal ? String(latestAppeal.status || "") : "";
  const hasPending = latestStatus === "pending";

  async function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) setEvidenceUrls((prev) => [...prev, data.url]);
      } catch { /* ignore */ }
    }
    setUploading(false);
    e.target.value = "";
  }

  function resetForm() {
    setReason("");
    setDetails("");
    setCategory("mistake");
    setCategoryOther("");
    setEvidenceUrls([]);
    setAccepted(false);
    setError("");
  }

  async function handleSubmit() {
    setError("");
    if (reason.trim().length < 10) { setError("Please explain why we should unsuspend (at least 10 characters)."); return; }
    if (details.trim().length < 10) { setError("Please describe what happened (at least 10 characters)."); return; }
    if (category === "other" && !categoryOther.trim()) { setError("Please specify the category."); return; }
    if (!accepted) { setError("You must accept the terms to submit."); return; }

    const r = await submitAppeal.mutateAsync({
      reason: reason.trim(),
      details: details.trim(),
      category,
      category_other: category === "other" ? categoryOther.trim() : "",
      evidence_urls: evidenceUrls,
      accepted_terms: true,
    });
    if (r.success) {
      setShowForm(false);
      resetForm();
    }
  }

  return (
    <>
      {/* Keep watching for reactivation so the user is bounced back the instant
          an admin approves their appeal. */}
      <StatusWatcher mode="suspended" />

      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-warning/5 via-background to-error/5">
        <div className="w-full max-w-2xl space-y-4">
          {/* Header / identity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary">
                {getInitials(user.name || user.email)}
              </div>
              <div>
                <p className="text-sm font-semibold">{user.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="w-4 h-4 mr-1" /> Sign out
            </Btn>
          </div>

          {/* Main suspension card */}
          <Card className="border-warning/30">
            <CardContent className="p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Your account is suspended</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  You currently don&apos;t have access to the dashboard. If you believe this was a mistake, you can submit an appeal and our team will review it.
                </p>
              </div>

              {latestAppeal && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Latest Appeal</p>
                    {latestStatus === "pending" && <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>}
                    {latestStatus === "approved" && <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>}
                    {latestStatus === "rejected" && <Badge variant="error"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>}
                  </div>
                  <p className="text-sm mt-2">{String(latestAppeal.reason || "")}</p>
                  {!!latestAppeal.review_notes && (
                    <p className="text-xs text-muted-foreground mt-2"><span className="font-medium">Admin note:</span> {String(latestAppeal.review_notes)}</p>
                  )}
                  {!!latestAppeal.created_at && (
                    <p className="text-[11px] text-muted-foreground mt-2">Submitted {formatRelativeTime(String(latestAppeal.created_at))}</p>
                  )}
                </div>
              )}

              <div className="pt-2">
                <Btn onClick={() => setShowForm(true)} disabled={hasPending}>
                  <Send className="w-4 h-4 mr-1.5" />
                  {hasPending ? "Appeal pending review" : "Submit Appeal"}
                </Btn>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appeal form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
          onClick={() => { setShowForm(false); resetForm(); }}
        >
          <div
            className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Submit Suspension Appeal</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tell us what happened and we&apos;ll review your case.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <Label>Why should we unsuspend this account? *</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you believe your account should be reinstated..."
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>What happened? Explain in detail *</Label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe the events that led to your suspension..."
                  rows={4}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  <option value="mistake">It was a mistake / misunderstanding</option>
                  <option value="accept_fault">I accept fault and want to amend</option>
                  <option value="hacked">My account was hacked / compromised</option>
                  <option value="other">Other (specify below)</option>
                </Select>
                {category === "other" && (
                  <Input
                    value={categoryOther}
                    onChange={(e) => setCategoryOther(e.target.value)}
                    placeholder="Briefly describe the category"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Evidence (optional)</Label>
                {evidenceUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {evidenceUrls.map((url, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-border">
                        <img src={url} alt="" className="w-full h-20 object-cover" />
                        <button
                          type="button"
                          onClick={() => setEvidenceUrls(evidenceUrls.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-5 h-5 bg-error text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Upload screenshots or documents"}</span>
                  <input type="file" accept="image/*" multiple onChange={handleEvidenceUpload} className="hidden" />
                </label>
                <p className="text-[11px] text-muted-foreground">Optional — attach any evidence that supports your appeal.</p>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary mt-0.5"
                />
                <span className="text-xs text-muted-foreground">
                  I agree to the platform&apos;s rules and regulations, and I confirm that all information provided in this appeal is authentic and accurate to the best of my knowledge.
                </span>
              </label>

              {error && <FieldError>{error}</FieldError>}
            </div>

            <div className="p-6 border-t border-border/60 flex gap-3 justify-end">
              <Btn variant="outline" type="button" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Btn>
              <Btn type="button" onClick={handleSubmit} isLoading={submitAppeal.isPending}>
                <Send className="w-4 h-4 mr-1.5" /> Submit Appeal
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
