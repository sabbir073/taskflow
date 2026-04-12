"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Textarea, Btn, Badge } from "@/components/ui";
import { CheckCircle, XCircle, Clock, Upload, ExternalLink, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAcceptTask, useSubmitProof, useReviewAssignment } from "@/hooks/use-tasks";
import { getMyAssignmentForTask } from "@/lib/actions/assignments";
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
  const proofType = String(task.proof_type || taskType?.proof_type || "both");

  const myAssignment = assignments.find((a) => {
    // Check both user_id directly and nested users.id from join
    if (String(a.user_id) === String(currentUserId)) return true;
    const user = a.users as Record<string, unknown> | undefined;
    if (String(user?.id || "") === String(currentUserId)) return true;
    return false;
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

        {/* Show proof section for anyone who has an assignment */}
        <MyProofSection taskId={task.id as number} proofType={proofType} />

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

// Client-side component that fetches the user's assignment and renders ProofSection
function MyProofSection({ taskId, proofType }: { taskId: number; proofType: string }) {
  const [assignment, setAssignment] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    getMyAssignmentForTask(taskId).then((data) => {
      setAssignment(data);
      setLoading(false);
    });
  }, [taskId, refreshKey]);

  if (loading) return (
    <Card><CardContent className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
  );

  if (!assignment) return null; // User has no assignment for this task

  return <ProofSection assignment={assignment} proofType={proofType} onRefresh={() => setRefreshKey((k) => k + 1)} />;
}

function ProofSection({ assignment, proofType, onRefresh }: { assignment: Record<string, unknown>; proofType: string; onRefresh?: () => void }) {
  const status = String(assignment.status);
  const acceptTask = useAcceptTask();
  const submitProof = useSubmitProof();
  const [proofUrls, setProofUrls] = useState<string[]>((assignment.proof_urls as string[]) || []);
  const [proofScreenshots, setProofScreenshots] = useState<string[]>((assignment.proof_screenshots as string[]) || []);
  const [proofNotes, setProofNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setProofScreenshots((prev) => [...prev, data.url]);
    } catch { /* */ }
    setUploading(false);
    e.target.value = "";
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
      <Btn onClick={() => acceptTask.mutate(assignment.id as number, { onSuccess: () => onRefresh?.() })} isLoading={acceptTask.isPending}>Accept Task</Btn>
    </CardContent></Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Proof</CardTitle>
        {status === "rejected" && <CardDescription className="text-error">Rejected: {String(assignment.rejection_reason || "No reason")}. Please resubmit.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Multiple URLs */}
        {(proofType === "url" || proofType === "both") && (
          <div className="space-y-2">
            <Label>Proof URLs</Label>
            {proofUrls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <Input value={url} onChange={(e) => { const copy = [...proofUrls]; copy[i] = e.target.value; setProofUrls(copy); }} placeholder="https://..." />
                <Btn variant="ghost" size="sm" onClick={() => setProofUrls(proofUrls.filter((_, j) => j !== i))}>x</Btn>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Add URL..." type="url" />
              <Btn variant="outline" size="sm" onClick={() => { if (newUrl) { setProofUrls([...proofUrls, newUrl]); setNewUrl(""); } }}>Add</Btn>
            </div>
          </div>
        )}

        {/* Multiple Screenshots */}
        {(proofType === "screenshot" || proofType === "both") && (
          <div className="space-y-2">
            <Label>Screenshots</Label>
            {proofScreenshots.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {proofScreenshots.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                    <button onClick={() => setProofScreenshots(proofScreenshots.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-error text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                  </div>
                ))}
              </div>
            )}
            <label className="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Click to upload screenshot"}</p>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        <div className="space-y-1.5"><Label>Notes (optional)</Label><Textarea value={proofNotes} onChange={(e) => setProofNotes(e.target.value)} placeholder="Any additional context..." /></div>
        <Btn className="w-full" isLoading={submitProof.isPending} onClick={() => submitProof.mutate({
          assignmentId: assignment.id as number,
          data: { proof_urls: proofUrls, proof_screenshots: proofScreenshots, proof_notes: proofNotes || undefined },
        }, { onSuccess: () => onRefresh?.() })}>Submit Proof</Btn>
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

      {(((assignment.proof_urls as string[]) || []).length > 0 || ((assignment.proof_screenshots as string[]) || []).length > 0) && (
        <div className="flex gap-3 flex-wrap">
          {((assignment.proof_urls as string[]) || []).map((url, i) => (
            <a key={`u${i}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" /> URL {i + 1}</a>
          ))}
          {((assignment.proof_screenshots as string[]) || []).map((url, i) => (
            <a key={`s${i}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ImageIcon className="w-3 h-3" /> Screenshot {i + 1}</a>
          ))}
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
