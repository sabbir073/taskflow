"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Select, Textarea, Btn, FieldError } from "@/components/ui";
import { useTaskTypes } from "@/hooks/use-tasks";
import { updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { Upload, X, Link2, Plus } from "lucide-react";

interface Props {
  task: Record<string, unknown>;
  taskId: number;
}

type FormShape = {
  title: string;
  description: string;
  proof_type: string;
  priority: string;
  deadline: string;
  points_per_completion: number;
  point_budget: number;
  task_data: Record<string, string>;
};

export function TaskEditForm({ task, taskId }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetType = String(task.target_type || "all_users");
  const isIndividual = targetType === "individual";
  const platformId = task.platform_id as number | undefined;
  const { data: taskTypes } = useTaskTypes(platformId || null);
  const selectedTaskType = taskTypes?.find((t) => (t.id as number) === (task.task_type_id as number));
  const requiredFields = (selectedTaskType?.required_fields as Array<{ name: string; label: string; type: string; placeholder?: string }>) || [];

  const [taskImages, setTaskImages] = useState<string[]>((task.images as string[]) || []);
  const [taskUrls, setTaskUrls] = useState<string[]>((task.urls as string[]) || []);
  const [newUrl, setNewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormShape>({
    defaultValues: {
      title: String(task.title || ""),
      description: String(task.description || ""),
      proof_type: String(task.proof_type || "both"),
      priority: String(task.priority || "medium"),
      deadline: task.deadline ? String(task.deadline).slice(0, 16) : "",
      points_per_completion: Number(task.points_per_completion || 0),
      point_budget: Number(task.point_budget || 0),
      task_data: (task.task_data as Record<string, string>) || {},
    },
  });

  const watchBudget = watch("point_budget");
  const watchPerCompletion = watch("points_per_completion");

  useEffect(() => {
    if (isIndividual) setValue("point_budget", watchPerCompletion || 0);
  }, [isIndividual, watchPerCompletion, setValue]);

  const effectiveBudget = isIndividual ? (watchPerCompletion || 0) : (watchBudget || 0);
  const maxCompletions = isIndividual ? 1 : (watchPerCompletion > 0 ? Math.floor(watchBudget / watchPerCompletion) : 0);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) setTaskImages((prev) => [...prev, data.url]);
      } catch { /* */ }
    }
    setUploading(false);
    e.target.value = "";
  }

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
      proof_type: data.proof_type,
      priority: data.priority,
      deadline: data.deadline || null,
      points_per_completion: Number(data.points_per_completion),
      points: Number(data.points_per_completion),
      point_budget: isIndividual ? Number(data.points_per_completion) : Number(data.point_budget),
      task_data: data.task_data || {},
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
            <Textarea {...register("description")} placeholder="Describe what needs to be done..." />
          </div>

          {requiredFields.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-border/50">
              <p className="text-sm font-medium text-muted-foreground">Task-specific fields</p>
              {requiredFields.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <Input
                    {...register(`task_data.${field.name}` as const)}
                    type={field.type === "url" ? "url" : "text"}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
          <CardDescription>Reference images and URLs (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Images */}
          <div className="space-y-2">
            <Label>Images</Label>
            {taskImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {taskImages.map((url, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-border">
                    <img src={url} alt="" className="w-full h-20 object-cover" />
                    <button
                      type="button"
                      onClick={() => setTaskImages(taskImages.filter((_, j) => j !== i))}
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
              <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload images"}</span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

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

      {/* Points Budget */}
      <Card>
        <CardHeader>
          <CardTitle>Points Budget</CardTitle>
          <CardDescription>
            {isIndividual
              ? "The full reward goes to the single assigned user"
              : "Total budget and reward per completion"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`grid grid-cols-1 gap-4 ${isIndividual ? "" : "sm:grid-cols-2"}`}>
            {!isIndividual && (
              <div className="space-y-1.5">
                <Label>Total Budget (pts) *</Label>
                <Input {...register("point_budget", { valueAsNumber: true, min: { value: 0.01, message: "Min 0.01" } })} type="number" step="0.01" min={0.01} error={!!errors.point_budget} />
                {errors.point_budget && <FieldError>{errors.point_budget.message}</FieldError>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{isIndividual ? "Reward for User (pts) *" : "Points per Completion *"}</Label>
              <Input {...register("points_per_completion", { valueAsNumber: true, min: { value: 0.01, message: "Min 0.01" } })} type="number" step="0.01" min={0.01} error={!!errors.points_per_completion} />
              {errors.points_per_completion && <FieldError>{errors.points_per_completion.message}</FieldError>}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-muted/40 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Max completions</span><span className="font-semibold">{maxCompletions}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{isIndividual ? "Reward to user" : "Cost per completion"}</span><span className="font-semibold">{(watchPerCompletion || 0).toFixed(2)} pts</span></div>
            <div className="flex justify-between border-t border-border/50 pt-1.5 mt-1"><span className="text-muted-foreground">Total budget</span><span className="font-bold text-warning">{effectiveBudget.toFixed(2)} pts</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Proof Required *</Label>
              <Select {...register("proof_type")}>
                <option value="both">URL + Screenshot</option>
                <option value="url">URL Only</option>
                <option value="screenshot">Screenshot Only</option>
              </Select>
            </div>
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
