"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Select, Textarea, Btn, FieldError, Badge } from "@/components/ui";
import { updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { X, Link2, Plus, Sparkles, AlertCircle, Trophy } from "lucide-react";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { ImageUploadField } from "@/components/shared/image-upload-field";

interface Props {
  task: Record<string, unknown>;
  taskId: number;
}

type BundleItemView = {
  id: number;
  task_type_id: number;
  sort_order: number;
  points: number;
  proof_type: string;
  watch_duration_sec: number | null;
  task_types?: { name?: string; slug?: string } | null;
};

type FormShape = {
  title: string;
  description: string;
  ai_prompt: string;
  priority: string;
  deadline: string;
  point_budget: number;
  completion_bonus: number;
};

export function TaskEditForm({ task, taskId }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetType = String(task.target_type || "all_users");
  const isIndividual = targetType === "individual";
  const bundleItems = ((task.task_bundle_items as BundleItemView[] | undefined) || [])
    .slice()
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const hasAnyAssignment = false; // server enforces; this hint is informational only

  const [taskImages, setTaskImages] = useState<string[]>((task.images as string[]) || []);
  const [taskUrls, setTaskUrls] = useState<string[]>((task.urls as string[]) || []);
  const [newUrl, setNewUrl] = useState("");

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<FormShape>({
    defaultValues: {
      title: String(task.title || ""),
      description: String(task.description || ""),
      ai_prompt: String(task.ai_prompt || ""),
      priority: String(task.priority || "medium"),
      deadline: task.deadline ? String(task.deadline).slice(0, 16) : "",
      point_budget: Number(task.point_budget || 0),
      completion_bonus: Number(task.completion_bonus || 0),
    },
  });

  const showAiPrompt = !!task.ai_prompt;

  const watchBudget = useWatch({ control, name: "point_budget" });
  const watchBonus = useWatch({ control, name: "completion_bonus" }) || 0;

  // Per-completion cost is fixed by the bundle items + bonus (items can't
  // be edited from this form). Display only — no input control.
  const itemsPointsSum = bundleItems.reduce((s, it) => s + Number(it.points || 0), 0);
  const perCompletionCost = itemsPointsSum + Number(watchBonus || 0);
  const effectiveBudget = isIndividual ? perCompletionCost : (watchBudget || 0);
  const maxCompletions = isIndividual ? 1 : (perCompletionCost > 0 ? Math.floor((watchBudget || 0) / perCompletionCost) : 0);

  function addUrl() {
    const v = newUrl.trim();
    if (!v) return;
    setTaskUrls([...taskUrls, v]);
    setNewUrl("");
  }

  async function onSubmit(data: FormShape) {
    setIsSubmitting(true);

    const pendingUrl = newUrl.trim();
    const finalUrls = pendingUrl ? [...taskUrls, pendingUrl] : taskUrls;
    if (pendingUrl) { setTaskUrls(finalUrls); setNewUrl(""); }

    const result = await updateTask(taskId, {
      title: data.title,
      description: data.description,
      ai_prompt: showAiPrompt ? (data.ai_prompt?.trim() || null) : null,
      priority: data.priority,
      deadline: data.deadline || null,
      // Server recomputes points_per_completion from items[] + bonus when
      // items are sent; for the meta-only edit path here we still pass the
      // mirrored sum so dashboards stay consistent.
      points_per_completion: perCompletionCost,
      point_budget: isIndividual ? perCompletionCost : Number(data.point_budget),
      completion_bonus: Number(data.completion_bonus || 0),
      images: taskImages,
      urls: finalUrls,
    });

    if (result.success) {
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["pending-approval-tasks"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
      router.push("/tasks");
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }} className="max-w-2xl space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input {...register("title", { required: "Title is required" })} placeholder="Enter task title" error={!!errors.title} />
            {errors.title && <FieldError>{errors.title.message}</FieldError>}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <RichTextEditor
              value={watch("description") || ""}
              onChange={(html) => setValue("description", html)}
              placeholder="Describe what needs to be done..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Bundle items — read-only summary. Plan §3a: items can only be
          replaced when no assignments exist; we keep this form meta-only. */}
      <Card>
        <CardHeader>
          <CardTitle>Bundle Items</CardTitle>
          <CardDescription>
            Per-action configuration is set at create time. Delete and recreate the task to change the action mix.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bundleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bundle items configured.</p>
          ) : (
            <div className="space-y-2">
              {bundleItems.map((it, idx) => (
                <div key={it.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {idx + 1} / {bundleItems.length}
                    </span>
                    <p className="text-sm font-medium truncate">{it.task_types?.name || `Item #${it.id}`}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <Badge variant="default" className="capitalize">
                      {it.proof_type === "none" ? "Auto" : it.proof_type}
                    </Badge>
                    {it.watch_duration_sec && <span className="text-muted-foreground">≥{it.watch_duration_sec}s</span>}
                    <span className="font-mono text-primary font-semibold">+{Number(it.points).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Prompt — only when the original task had one */}
      {showAiPrompt && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Prompt
              <span className="ml-1 text-[10px] font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">Optional</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register("ai_prompt")}
              rows={4}
              placeholder="Prompt that workers can copy into ChatGPT / Claude"
            />
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
          <CardDescription>Reference images and URLs (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploadField
            label="Images"
            value={taskImages}
            onChange={setTaskImages}
            multiple
            maxImages={8}
          />

          {/* URLs */}
          <div className="space-y-2">
            <Label>Reference URLs</Label>
            {taskUrls.map((url, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg text-sm truncate">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{url}</a>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskUrls(taskUrls.filter((_, j) => j !== i))}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-error transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                placeholder="https://example.com"
                type="url"
              />
              <Btn type="button" variant="outline" size="sm" onClick={addUrl}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Btn>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reward Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Reward Settings</CardTitle>
          <CardDescription>
            Per-completion = sum of bundle item points + completion bonus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Completion Bonus (pts)</Label>
              <Input
                {...register("completion_bonus", { valueAsNumber: true, min: { value: 0, message: "Min 0" } })}
                type="number"
                step="0.01"
                min={0}
              />
              <p className="text-[11px] text-muted-foreground">Extra reward when a worker completes ALL items</p>
            </div>
            {!isIndividual && (
              <div className="space-y-1.5">
                <Label>Total Budget (pts) *</Label>
                <Input {...register("point_budget", { valueAsNumber: true, min: { value: 0.01, message: "Min 0.01" } })} type="number" step="0.01" min={0.01} error={!!errors.point_budget} />
                {errors.point_budget && <FieldError>{errors.point_budget.message}</FieldError>}
              </div>
            )}
          </div>
          <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Sum of action points</span><span className="font-mono">{itemsPointsSum.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Completion bonus</span><span className="font-mono">+{Number(watchBonus || 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border/50 pt-1.5 mt-1">
              <span className="text-muted-foreground">{isIndividual ? "Reward to user" : "Cost per completion"}</span>
              <span className="font-bold">{perCompletionCost.toFixed(2)} pts</span>
            </div>
            {!isIndividual && (
              <div className="flex justify-between"><span className="text-muted-foreground">Max completions</span><span className="font-semibold">{maxCompletions}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Total budget</span><span className="font-bold text-warning">{effectiveBudget.toFixed(2)} pts</span></div>
          </div>
          {hasAnyAssignment && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Bundle items cannot be changed while assignments exist.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select {...register("priority")}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input {...register("deadline")} type="datetime-local" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Btn variant="outline" type="button" onClick={() => router.back()}>Cancel</Btn>
        <Btn type="submit" isLoading={isSubmitting}>Save Changes</Btn>
      </div>
    </form>
  );
}
