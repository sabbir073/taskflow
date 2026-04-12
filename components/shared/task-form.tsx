"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, FieldError, Select, Textarea, Btn } from "@/components/ui";
import { usePlatforms, useTaskTypes, useCreateTask } from "@/hooks/use-tasks";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import { getMyBalance } from "@/lib/actions/users";
import { useMyGroups } from "@/hooks/use-groups";
import type { TaskFormData } from "@/types";
import { Coins, AlertCircle, Upload, X, Link2, Plus, Mail } from "lucide-react";

export function TaskForm() {
  const router = useRouter();
  const { data: platforms } = usePlatforms();
  const { data: groupsData } = useMyGroups({ page: 1, pageSize: 100 });
  const createTask = useCreateTask();

  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(null);
  const { data: taskTypes } = useTaskTypes(selectedPlatformId);
  const [balance, setBalance] = useState<number>(0);
  const [taskImages, setTaskImages] = useState<string[]>([]);
  const [taskUrls, setTaskUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { getMyBalance().then(setBalance); }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) setTaskImages((prev) => [...prev, data.url]);
      } catch { /* ignore */ }
    }
    setUploading(false);
    e.target.value = "";
  }

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: { point_budget: 100, points_per_completion: 10, proof_type: "both", priority: "medium", status: "draft", target_type: "all_users", is_recurring: false, task_data: {}, images: [], urls: [] },
  });

  const watchPlatform = watch("platform_id");
  const watchTaskType = watch("task_type_id");
  const watchTargetType = watch("target_type");
  const watchRecurring = watch("is_recurring");
  const watchBudget = watch("point_budget");
  const watchPerCompletion = watch("points_per_completion");

  useEffect(() => { if (watchPlatform) setSelectedPlatformId(watchPlatform); }, [watchPlatform]);
  useEffect(() => {
    if (watchTaskType && taskTypes) {
      const tt = taskTypes.find((t) => (t.id as number) === watchTaskType);
      if (tt) setValue("points_per_completion", tt.default_points as number);
    }
  }, [watchTaskType, taskTypes, setValue]);

  const selectedTaskType = taskTypes?.find((t) => (t.id as number) === watchTaskType);
  const requiredFields = selectedTaskType ? (selectedTaskType.required_fields as Array<{ name: string; label: string; type: string; placeholder?: string }>) : [];
  const maxCompletions = watchPerCompletion > 0 ? Math.floor(watchBudget / watchPerCompletion) : 0;
  const insufficientBalance = watchBudget > balance;

  async function onSubmit(data: TaskFormData) {
    const result = await createTask.mutateAsync({ ...data, images: taskImages, urls: taskUrls });
    if (result.success) { getMyBalance().then(setBalance); router.push("/tasks"); }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }} className="max-w-2xl space-y-6">
      {/* Wallet */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-warning/5 border border-warning/20">
        <div className="flex items-center gap-2"><Coins className="w-5 h-5 text-warning" /><span className="text-sm font-medium">Your Balance</span></div>
        <span className="text-lg font-bold text-warning">{balance.toFixed(2)} pts</span>
      </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Platform *</Label>
              <Select {...register("platform_id", { required: "Required", valueAsNumber: true })} error={!!errors.platform_id}>
                <option value="">Select platform</option>
                {platforms?.map((p) => <option key={p.id as number} value={p.id as number}>{PLATFORM_CONFIG[(p.slug as string) as keyof typeof PLATFORM_CONFIG]?.name || (p.name as string)}</option>)}
              </Select>
              {errors.platform_id && <FieldError>{errors.platform_id.message}</FieldError>}
            </div>
            <div className="space-y-1.5">
              <Label>Task Type *</Label>
              <Select {...register("task_type_id", { required: "Required", valueAsNumber: true })} disabled={!selectedPlatformId} error={!!errors.task_type_id}>
                <option value="">Select task type</option>
                {taskTypes?.map((tt) => <option key={tt.id as number} value={tt.id as number}>{String(tt.name)} ({Number(tt.default_points)} pts)</option>)}
              </Select>
              {errors.task_type_id && <FieldError>{errors.task_type_id.message}</FieldError>}
            </div>
          </div>

          {requiredFields.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-border/50">
              <p className="text-sm font-medium text-muted-foreground">Task-specific fields</p>
              {requiredFields.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <Input {...register(`task_data.${field.name}`)} type={field.type === "url" ? "url" : "text"} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Images & URLs (optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
          <CardDescription>Add reference images and URLs (optional)</CardDescription>
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
                    <button type="button" onClick={() => setTaskImages(taskImages.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-error text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                <button type="button" onClick={() => setTaskUrls(taskUrls.filter((_, j) => j !== i))}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-error transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://example.com" type="url" />
              <Btn type="button" variant="outline" size="sm" onClick={() => { if (newUrl.trim()) { setTaskUrls([...taskUrls, newUrl.trim()]); setNewUrl(""); } }}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Btn>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points Budget */}
      <Card>
        <CardHeader><CardTitle>Points Budget</CardTitle><CardDescription>Set total budget and reward per completion</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Total Budget (pts) *</Label>
              <Input {...register("point_budget", { valueAsNumber: true, min: { value: 0.01, message: "Min 0.01" } })} type="number" step="0.01" min={0.01} error={!!errors.point_budget || insufficientBalance} />
              {errors.point_budget && <FieldError>{errors.point_budget.message}</FieldError>}
              {insufficientBalance && !errors.point_budget && (
                <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Exceeds your balance ({balance.toFixed(2)})</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Points per Completion *</Label>
              <Input {...register("points_per_completion", { valueAsNumber: true, min: { value: 0.01, message: "Min 0.01" } })} type="number" step="0.01" min={0.01} error={!!errors.points_per_completion} />
              {errors.points_per_completion && <FieldError>{errors.points_per_completion.message}</FieldError>}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-muted/40 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Max completions</span><span className="font-semibold">{maxCompletions}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cost per completion</span><span className="font-semibold">{(watchPerCompletion || 0).toFixed(2)} pts</span></div>
            <div className="flex justify-between border-t border-border/50 pt-1.5 mt-1"><span className="text-muted-foreground">Total budget</span><span className="font-bold text-warning">{(watchBudget || 0).toFixed(2)} pts</span></div>
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
              <p className="text-[11px] text-muted-foreground">What proof users must submit</p>
            </div>
            <div className="space-y-1.5"><Label>Priority</Label><Select {...register("priority")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></div>
            <div className="space-y-1.5"><Label>Deadline</Label><Input {...register("deadline")} type="datetime-local" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment */}
      <Card>
        <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Target</Label>
            <Select {...register("target_type")}><option value="all_users">All Users</option><option value="group">Specific Group</option><option value="individual">Individual User</option></Select>
          </div>
          {watchTargetType === "group" && (
            <div className="space-y-1.5"><Label>Select Group</Label><Select {...register("target_group_id", { valueAsNumber: true })}><option value="">Select a group</option>{groupsData?.data?.map((g: Record<string, unknown>) => <option key={g.id as number} value={g.id as number}>{String(g.name)}</option>)}</Select></div>
          )}
          {watchTargetType === "individual" && (
            <div className="space-y-1.5">
              <Label>User Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input {...register("target_user_email")} type="email" placeholder="user@example.com" className="pl-11" />
              </div>
              <p className="text-[11px] text-muted-foreground">Enter the email of the user to assign this task to</p>
            </div>
          )}
          <div className="pt-2 border-t border-border/50">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" {...register("is_recurring")} className="w-4 h-4 rounded accent-primary" />
              <span className="text-sm font-medium">Recurring Task</span>
            </label>
          </div>
          {watchRecurring && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label>Frequency</Label><Select {...register("recurring_type")}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></Select></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input {...register("recurring_end_date")} type="date" /></div>
              <div className="space-y-1.5"><Label>Max Completions</Label><Input {...register("max_completions", { valueAsNumber: true })} type="number" min={1} placeholder="Unlimited" /></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Btn variant="outline" onClick={() => router.back()} type="button">Cancel</Btn>
        <Btn variant="secondary" type="submit" disabled={createTask.isPending} onClick={() => setValue("status", "draft")}>Save as Draft</Btn>
        <Btn type="submit" disabled={createTask.isPending || insufficientBalance} isLoading={createTask.isPending} onClick={() => setValue("status", "pending")}>Publish Task</Btn>
      </div>
    </form>
  );
}
