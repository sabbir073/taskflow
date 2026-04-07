"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Textarea, Btn, Badge } from "@/components/ui";
import { CheckCircle, XCircle, Clock, Upload, ExternalLink, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAcceptTask, useSubmitProof, useReviewAssignment } from "@/hooks/use-tasks";
import { formatDate, getInitials } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";

interface Props {
  data: { task: Record<string, unknown>; assignments: Record<string, unknown>[] };
  currentUserId: string;
  isAdmin: boolean;
}

export function TaskDetail({ data, currentUserId, isAdmin }: Props) {
  const { task, assignments } = data;
  const platform = task.platforms as Record<string, unknown> | undefined;
  const taskType = task.task_types as Record<string, unknown> | undefined;
  const platformSlug = String(platform?.slug || "");
  const platformConfig = PLATFORM_CONFIG[platformSlug as keyof typeof PLATFORM_CONFIG];
  const proofType = String(taskType?.proof_type || "url");

  const myAssignment = assignments.find((a) => {
    const user = a.users as Record<string, unknown> | undefined;
    return (user?.id || a.user_id) === currentUserId;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: platformConfig?.color || "#666" }}>
                {String(platform?.name || "?").charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{String(platform?.name || "")}</p>
                <p className="text-sm text-muted-foreground">{String(taskType?.name || "")}</p>
              </div>
            </div>

            {!!task.description && <p className="text-sm text-muted-foreground">{String(task.description)}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50">
              <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Points/Task</p><p className="font-bold text-primary">{Number(task.points_per_completion || task.points || 0).toFixed(2)}</p></div>
              <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Priority</p><p className="font-semibold capitalize">{String(task.priority)}</p></div>
              <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Deadline</p><p className="font-medium">{task.deadline ? formatDate(String(task.deadline)) : "None"}</p></div>
              <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Budget</p><p className="font-bold text-warning">{Number(task.point_budget || 0).toFixed(2)} pts</p></div>
            </div>
          </CardContent>
        </Card>

        {!isAdmin && myAssignment && <ProofSection assignment={myAssignment} proofType={proofType} />}

        {isAdmin && (
          <Card>
            <CardHeader><CardTitle>Submissions ({assignments.length})</CardTitle></CardHeader>
            <CardContent>
              {assignments.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No submissions yet</p> : (
                <div className="space-y-3">{assignments.map((a) => <AssignmentRow key={a.id as number} assignment={a} />)}</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent>
            <h4 className="text-sm font-semibold mb-3">Task Data</h4>
            {Object.entries((task.task_data as Record<string, string>) || {}).map(([key, value]) => (
              <div key={key} className="py-2 border-b border-border/30 last:border-0">
                <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                <p className="text-sm break-all mt-0.5">{value}</p>
              </div>
            ))}
            {Object.keys((task.task_data as Record<string, string>) || {}).length === 0 && <p className="text-sm text-muted-foreground">No additional data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h4 className="text-sm font-semibold mb-1">Proof Required</h4>
            <Badge variant="primary" className="mt-1 capitalize">{proofType}</Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {proofType === "url" && "Submit the URL of your completed action"}
              {proofType === "screenshot" && "Upload a screenshot as proof"}
              {proofType === "both" && "Submit both a URL and screenshot"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProofSection({ assignment, proofType }: { assignment: Record<string, unknown>; proofType: string }) {
  const status = String(assignment.status);
  const acceptTask = useAcceptTask();
  const submitProof = useSubmitProof();
  const [proofUrl, setProofUrl] = useState(String(assignment.proof_url || ""));
  const [proofScreenshotUrl, setProofScreenshotUrl] = useState(String(assignment.proof_screenshot_url || ""));
  const [proofNotes, setProofNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try { const res = await fetch("/api/upload", { method: "POST", body: formData }); const data = await res.json(); if (data.url) setProofScreenshotUrl(data.url); } catch { /* */ }
    setUploading(false);
  }

  if (status === "approved") return (
    <Card className="border-success/30 bg-success/[0.03]">
      <CardContent className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-success/10"><CheckCircle className="w-6 h-6 text-success" /></div>
        <div><p className="font-semibold text-success">Task Approved!</p><p className="text-sm text-muted-foreground">You earned {Number(assignment.points_awarded || 0).toFixed(2)} points</p></div>
      </CardContent>
    </Card>
  );

  if (status === "submitted") return (
    <Card className="border-accent/30 bg-accent/[0.03]">
      <CardContent className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-accent/10"><Clock className="w-6 h-6 text-accent" /></div>
        <div><p className="font-semibold text-accent">Awaiting Review</p><p className="text-sm text-muted-foreground">Your proof has been submitted</p></div>
      </CardContent>
    </Card>
  );

  if (status === "pending") return (
    <Card><CardContent className="text-center py-8">
      <p className="text-sm text-muted-foreground mb-4">Accept this task to get started</p>
      <Btn onClick={() => acceptTask.mutate(assignment.id as number)} isLoading={acceptTask.isPending}>Accept Task</Btn>
    </CardContent></Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Proof</CardTitle>
        {status === "rejected" && <CardDescription className="text-error">Rejected: {String(assignment.rejection_reason || "No reason")}. Please resubmit.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {(proofType === "url" || proofType === "both") && (
          <div className="space-y-1.5"><Label>Proof URL</Label><Input type="url" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." /></div>
        )}
        {(proofType === "screenshot" || proofType === "both") && (
          <div className="space-y-1.5">
            <Label>Screenshot</Label>
            <label className="block border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors">
              {proofScreenshotUrl ? (
                <div className="space-y-2"><img src={proofScreenshotUrl} alt="Proof" className="max-h-48 mx-auto rounded-lg" /><p className="text-xs text-success">Uploaded</p></div>
              ) : (
                <><Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload"}</p></>
              )}
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
        <div className="space-y-1.5"><Label>Notes (optional)</Label><Textarea value={proofNotes} onChange={(e) => setProofNotes(e.target.value)} placeholder="Any additional context..." /></div>
        <Btn className="w-full" isLoading={submitProof.isPending} onClick={() => submitProof.mutate({ assignmentId: assignment.id as number, data: { proof_url: proofUrl || undefined, proof_screenshot_url: proofScreenshotUrl || undefined, proof_notes: proofNotes || undefined } })}>Submit Proof</Btn>
      </CardContent>
    </Card>
  );
}

function AssignmentRow({ assignment }: { assignment: Record<string, unknown> }) {
  const review = useReviewAssignment();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const user = assignment.users as Record<string, unknown> | undefined;
  const status = String(assignment.status);
  const name = String(user?.name || "Unknown");

  return (
    <div className="border border-border/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">{getInitials(name)}</div>
          <div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{String(user?.email || "")}</p></div>
        </div>
        <Badge variant={status === "approved" ? "success" : status === "rejected" ? "error" : status === "submitted" ? "accent" : "default"}>
          {status.replace("_", " ")}
        </Badge>
      </div>

      {!!(assignment.proof_url || assignment.proof_screenshot_url) && (
        <div className="flex gap-3 flex-wrap">
          {!!assignment.proof_url && <a href={String(assignment.proof_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" /> URL</a>}
          {!!assignment.proof_screenshot_url && <a href={String(assignment.proof_screenshot_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ImageIcon className="w-3 h-3" /> Screenshot</a>}
        </div>
      )}

      {!!assignment.proof_notes && <p className="text-xs text-muted-foreground">{String(assignment.proof_notes)}</p>}

      {status === "submitted" && (
        <div className="flex gap-2 pt-2 border-t border-border/50">
          <Btn size="sm" onClick={() => review.mutate({ assignmentId: assignment.id as number, action: "approve" })} disabled={review.isPending}><CheckCircle className="w-3 h-3 mr-1" /> Approve</Btn>
          {!showReject ? (
            <Btn variant="outline" size="sm" onClick={() => setShowReject(true)}><XCircle className="w-3 h-3 mr-1" /> Reject</Btn>
          ) : (
            <div className="flex-1 flex gap-2">
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." className="h-9 text-xs" />
              <Btn variant="danger" size="sm" disabled={!rejectReason || review.isPending} onClick={() => { review.mutate({ assignmentId: assignment.id as number, action: "reject", reason: rejectReason }); setShowReject(false); setRejectReason(""); }}>Confirm</Btn>
            </div>
          )}
        </div>
      )}

      {status === "rejected" && !!assignment.rejection_reason && <p className="text-xs text-error">Reason: {String(assignment.rejection_reason)}</p>}
    </div>
  );
}
