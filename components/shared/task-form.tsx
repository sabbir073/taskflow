"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, FieldError, Select, Textarea, Btn, Badge } from "@/components/ui";
import { usePlatforms, useTaskTypes, useCreateTask } from "@/hooks/use-tasks";
import { PLATFORM_CONFIG, MUSIC_STREAM_SLUGS } from "@/lib/constants/platforms";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { getMyBalance } from "@/lib/actions/users";
import { useAssignableGroups } from "@/hooks/use-groups";
import { taskTypeNeedsAiPrompt } from "@/lib/content-task-types";
import type { TaskFormData } from "@/types";
import type { ProofType } from "@/types/database";
import { Coins, AlertCircle, X, Link2, Plus, Mail, Sparkles, Trophy } from "lucide-react";

type TaskTypeRow = {
  id: number;
  platform_id: number;
  name: string;
  slug: string;
  description?: string | null;
  required_fields: Array<{ name: string; label: string; type: string; placeholder?: string; required?: boolean }>;
  proof_type: ProofType;
  default_points: number;
  is_active: boolean;
};

const WATCH_VIDEO_DEFAULT_SEC = 30;

export function TaskForm() {
  const router = useRouter();
  const { data: platforms } = usePlatforms();
  const { data: assignableGroups } = useAssignableGroups();
  const createTask = useCreateTask();

  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(null);
  const { data: taskTypesRaw } = useTaskTypes(selectedPlatformId);
  const taskTypes = (taskTypesRaw as unknown as TaskTypeRow[] | undefined) || [];
  const [balance, setBalance] = useState<number>(0);
  const [taskImages, setTaskImages] = useState<string[]>([]);
  const [taskUrls, setTaskUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => { getMyBalance().then(setBalance); }, []);

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      point_budget: 100,
      points_per_completion: 0,
      completion_bonus: 0,
      priority: "medium",
      status: "draft",
      target_type: "all_users",
      is_recurring: false,
      images: [],
      urls: [],
      items: [],
    },
  });

  const { fields, append, remove, update, replace } = useFieldArray({ control, name: "items" });

  // useWatch instead of `watch()` so React Compiler can memoize children
  // that consume these values (RichTextEditor + the submit button stay
  // stable across keystrokes that don't move them).
  const watchPlatform = useWatch({ control, name: "platform_id" });
  const watchTargetType = useWatch({ control, name: "target_type" });
  const watchRecurring = useWatch({ control, name: "is_recurring" });
  const watchBudget = useWatch({ control, name: "point_budget" });
  const watchItems = useWatch({ control, name: "items" }) || [];
  const watchBonus = useWatch({ control, name: "completion_bonus" }) || 0;

  const isIndividual = watchTargetType === "individual";

  // Mirror the form's platform_id into local state so useTaskTypes refetches
  // when the user picks a different platform. The actual items[] clear is
  // done synchronously in the platform-Select onChange (see below) — not
  // here — so there's no brief render where items[] still references
  // task_type_ids from the old platform.
  useEffect(() => {
    if (watchPlatform && watchPlatform !== selectedPlatformId) {
      setSelectedPlatformId(watchPlatform);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchPlatform]);

  // Register platform_id so validation + form state still work, then wrap
  // its onChange to (a) clear items[] and (b) flip local selectedPlatformId
  // in the same event tick. React batches all three updates into one
  // render, so the next paint never shows items[] from the previous
  // platform OR the previous platform's checkboxes after the user picked
  // a new one.
  const platformReg = register("platform_id", { required: "Required", valueAsNumber: true });
  function handlePlatformChange(e: React.ChangeEvent<HTMLSelectElement>) {
    platformReg.onChange(e);
    replace([]);
    setSelectedPlatformId(e.target.value ? Number(e.target.value) : null);
  }

  // Per-completion cost = sum of item points + completion bonus.
  const itemsPointsSum = useMemo(
    () => (watchItems || []).reduce((s, it) => s + Number(it?.points || 0), 0),
    [watchItems]
  );
  const perCompletionCost = itemsPointsSum + Number(watchBonus || 0);

  // Keep the legacy points_per_completion mirror in sync so the rest of the
  // form (and the server) sees the right number even though the bundle is
  // the source of truth.
  useEffect(() => {
    setValue("points_per_completion", perCompletionCost);
    if (isIndividual) setValue("point_budget", perCompletionCost);
  }, [perCompletionCost, isIndividual, setValue]);

  const effectiveBudget = isIndividual ? perCompletionCost : (watchBudget || 0);
  const maxCompletions = isIndividual ? 1 : (perCompletionCost > 0 ? Math.floor((watchBudget || 0) / perCompletionCost) : 0);
  const insufficientBalance = effectiveBudget > balance;
  const showAiPrompt = (watchItems || []).some((it) => {
    const tt = taskTypes.find((t) => t.id === it?.task_type_id);
    return tt && taskTypeNeedsAiPrompt(tt.slug);
  });

  async function onSubmit(data: TaskFormData) {
    // Auto-include any URL typed but not yet "Added"
    const pendingUrl = newUrl.trim();
    const finalUrls = pendingUrl ? [...taskUrls, pendingUrl] : taskUrls;
    if (pendingUrl) { setTaskUrls(finalUrls); setNewUrl(""); }

    if (!data.items || data.items.length === 0) {
      // Surface a top-level error instead of letting Zod fail server-side.
      return;
    }

    const payload = {
      ...data,
      images: taskImages,
      urls: finalUrls,
      ai_prompt: showAiPrompt ? (data.ai_prompt?.trim() || null) : null,
      point_budget: isIndividual ? perCompletionCost : data.point_budget,
      points_per_completion: perCompletionCost,
      // The server schema keeps task_data as a back-compat fallback when
      // items[] isn't sent. The bundle path doesn't use it but we send an
      // empty object so the union accepts the payload.
      task_data: data.task_data || {},
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createTask.mutateAsync(payload as any);
    if (result.success) { getMyBalance().then(setBalance); router.push("/tasks"); }
  }

  function addUrl() {
    const v = newUrl.trim();
    if (!v) return;
    setTaskUrls([...taskUrls, v]);
    setNewUrl("");
  }

  function toggleTaskType(tt: TaskTypeRow) {
    const existingIdx = fields.findIndex((f) => Number(f.task_type_id) === tt.id);
    if (existingIdx >= 0) {
      remove(existingIdx);
    } else {
      const isWatchOrStream = tt.slug === "watch-video" || MUSIC_STREAM_SLUGS.has(tt.slug);
      // Bandcamp's "stream-full-track" defaults to 180s (full song); every
      // other watch/stream task defaults to 30s.
      const defaultDuration = tt.slug === "stream-full-track" ? 180 : WATCH_VIDEO_DEFAULT_SEC;
      append({
        task_type_id: tt.id,
        points: tt.default_points || 0,
        proof_type: tt.proof_type,
        item_data: {},
        watch_duration_sec: isWatchOrStream ? defaultDuration : null,
      });
    }
  }

  function adjustItemPoints(idx: number, delta: number) {
    const current = Number(watchItems?.[idx]?.points || 0);
    const next = Math.max(0, current + delta);
    update(idx, { ...(watchItems?.[idx] || {}), points: next });
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
            <Label>Bundle Title *</Label>
            <Input {...register("title", { required: "Title is required" })} placeholder="e.g. Instagram Growth Bundle" error={!!errors.title} />
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

          <div className="space-y-1.5">
            <Label>Platform *</Label>
            <Select
              {...platformReg}
              onChange={handlePlatformChange}
              error={!!errors.platform_id}
            >
              <option value="">Select platform</option>
              {platforms?.map((p) => <option key={p.id as number} value={p.id as number}>{PLATFORM_CONFIG[(p.slug as string) as keyof typeof PLATFORM_CONFIG]?.name || (p.name as string)}</option>)}
            </Select>
            {errors.platform_id && <FieldError>{errors.platform_id.message}</FieldError>}
          </div>
        </CardContent>
      </Card>

      {/* Bundle items picker */}
      <Card>
        <CardHeader>
          <CardTitle>Required Actions</CardTitle>
          <CardDescription>
            Pick one or more actions a worker must complete. Each action carries its own points and proof requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedPlatformId ? (
            <p className="text-sm text-muted-foreground text-center py-6">Select a platform first to see its actions</p>
          ) : taskTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No actions configured for this platform</p>
          ) : (
            <div className="space-y-3">
              {taskTypes.map((tt) => {
                const idx = fields.findIndex((f) => Number(f.task_type_id) === tt.id);
                const selected = idx >= 0;
                const isWatchVideo = tt.slug === "watch-video";
                const isMusicStream = MUSIC_STREAM_SLUGS.has(tt.slug);
                const needsDuration = isWatchVideo || isMusicStream;
                return (
                  <div key={tt.id} className={`rounded-xl border ${selected ? "border-primary/40 bg-primary/[0.03]" : "border-border/60"}`}>
                    {/* Header row — checkbox + name + points stepper */}
                    <div className="flex items-center gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTaskType(tt)}
                        className="w-4 h-4 rounded accent-primary shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{tt.name}</p>
                        {tt.description && <p className="text-[11px] text-muted-foreground truncate">{tt.description}</p>}
                      </div>
                      {selected && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => adjustItemPoints(idx, -1)}
                            className="w-7 h-7 rounded-md border border-border/60 hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition"
                            aria-label="Decrease points"
                          >−</button>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            {...register(`items.${idx}.points`, { valueAsNumber: true })}
                            className="w-16 h-9 text-center text-sm font-mono font-semibold text-primary"
                          />
                          <button
                            type="button"
                            onClick={() => adjustItemPoints(idx, 1)}
                            className="w-7 h-7 rounded-md border border-border/60 hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition"
                            aria-label="Increase points"
                          >+</button>
                          <span className="text-[11px] text-muted-foreground ml-1">pts</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded body — per-item config + required_fields */}
                    {selected && (
                      <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Proof Required</Label>
                            <Select {...register(`items.${idx}.proof_type`)} className="h-9 text-sm">
                              <option value="screenshot">Screenshot</option>
                              <option value="url">URL</option>
                              <option value="both">URL + Screenshot</option>
                              <option value="none">None (auto)</option>
                            </Select>
                          </div>
                          {needsDuration && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">{isMusicStream ? "Play Duration (seconds) *" : "Watch Duration (seconds) *"}</Label>
                              <Input
                                type="number"
                                min={1}
                                max={7200}
                                {...register(`items.${idx}.watch_duration_sec`, { valueAsNumber: true })}
                                className="h-9 text-sm"
                              />
                              <p className="text-[10px] text-muted-foreground">
                                {isMusicStream
                                  ? "Worker must keep playing for this many seconds (fullscreen lock + tab-focus reset)"
                                  : "Worker must watch this many seconds for auto-submit"}
                              </p>
                            </div>
                          )}
                        </div>

                        {tt.required_fields && tt.required_fields.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border/30">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Action data (shown to workers)</p>
                            {tt.required_fields.map((field) => {
                              const fieldPath = `items.${idx}.item_data.${field.name}` as const;
                              if (field.type === "image") {
                                // Image fields use the shared S3 multi-image
                                // uploader. Workers see thumbnails + Download
                                // buttons on the task page.
                                const current = (watchItems?.[idx]?.item_data?.[field.name] ?? []) as string | string[];
                                return (
                                  <div key={field.name}>
                                    <ImageUploadField
                                      label={field.label}
                                      value={current}
                                      onChange={(next) => setValue(fieldPath, next, { shouldDirty: true })}
                                      multiple
                                      maxImages={6}
                                      helperText="Workers can download these images from the task page."
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div key={field.name} className="space-y-1">
                                  <Label className="text-xs">{field.label}</Label>
                                  {field.type === "textarea" ? (
                                    <Textarea
                                      {...register(fieldPath)}
                                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                                      rows={3}
                                    />
                                  ) : (
                                    <Input
                                      {...register(fieldPath)}
                                      type={field.type === "url" ? "url" : field.type === "number" ? "number" : "text"}
                                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                                      className="h-9 text-sm"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {fields.length === 0 && selectedPlatformId && taskTypes.length > 0 && (
            <p className="text-xs text-error mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Select at least one action to publish this bundle.
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Prompt — shown only when any selected item is a content-generating type */}
      {showAiPrompt && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Prompt
              <span className="ml-1 text-[10px] font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">Optional</span>
            </CardTitle>
            <CardDescription>
              Give workers a ready-to-use prompt they can paste into ChatGPT or any AI tool to generate the required content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register("ai_prompt")}
              rows={4}
              placeholder="e.g. Write a friendly 2-sentence comment praising this product's ease of use without sounding like a sales pitch."
            />
          </CardContent>
        </Card>
      )}

      {/* Images & URLs (optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
          <CardDescription>Add reference images and URLs (optional)</CardDescription>
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
                <button type="button" onClick={() => setTaskUrls(taskUrls.filter((_, j) => j !== i))}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-error transition-colors">
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

      {/* Assignment */}
      <Card>
        <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Target</Label>
            <Select {...register("target_type")}><option value="all_users">All Users</option><option value="group">Specific Group</option><option value="individual">Individual User</option></Select>
          </div>
          {watchTargetType === "group" && (
            <div className="space-y-1.5">
              <Label>Select Group</Label>
              <Select {...register("target_group_id", { valueAsNumber: true })}>
                <option value="">Select a group</option>
                {(assignableGroups || []).map((g) => (
                  <option key={g.id as number} value={g.id as number}>{String(g.name)}</option>
                ))}
              </Select>
              {(!assignableGroups || assignableGroups.length === 0) && (
                <p className="text-[11px] text-muted-foreground">No active approved groups available.</p>
              )}
            </div>
          )}
          {watchTargetType === "individual" && (
            <div className="space-y-1.5">
              <Label>User Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input {...register("target_user_email")} type="email" placeholder="user@example.com" className="pl-11" />
              </div>
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

      {/* Reward summary + bonus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Reward Settings</CardTitle>
          <CardDescription>Sum of per-action points + optional completion bonus = each worker&apos;s reward.</CardDescription>
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
                placeholder="0"
              />
              <p className="text-[11px] text-muted-foreground">Extra reward when a worker completes ALL actions in the bundle</p>
            </div>
            {!isIndividual && (
              <div className="space-y-1.5">
                <Label>Total Budget (pts) *</Label>
                <Input
                  {...register("point_budget", { valueAsNumber: true, min: { value: 0.01, message: "Min 0.01" } })}
                  type="number"
                  step="0.01"
                  min={0.01}
                  error={!!errors.point_budget || insufficientBalance}
                />
                {errors.point_budget && <FieldError>{errors.point_budget.message}</FieldError>}
                {insufficientBalance && !errors.point_budget && (
                  <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Exceeds your balance ({balance.toFixed(2)})</p>
                )}
              </div>
            )}
          </div>

          {/* Live breakdown */}
          <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Selected actions</span>
              <span className="font-mono">{fields.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sum of action points</span>
              <span className="font-mono">{itemsPointsSum.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completion bonus</span>
              <span className="font-mono">+{Number(watchBonus || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border/50 pt-1.5 mt-1">
              <span className="text-muted-foreground">{isIndividual ? "Reward to user" : "Cost per completion"}</span>
              <Badge variant="primary">{perCompletionCost.toFixed(2)} pts</Badge>
            </div>
            {!isIndividual && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max completions</span>
                <span className="font-semibold">{maxCompletions}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total budget</span>
              <span className="font-bold text-warning">{effectiveBudget.toFixed(2)} pts</span>
            </div>
            {isIndividual && (
              <p className="text-[11px] text-muted-foreground pt-1">The full amount goes to the assigned user once every item is approved (incl. bonus).</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Priority</Label><Select {...register("priority")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></div>
            <div className="space-y-1.5"><Label>Deadline</Label><Input {...register("deadline")} type="datetime-local" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Btn variant="outline" onClick={() => router.back()} type="button">Cancel</Btn>
        <Btn variant="secondary" type="submit" disabled={createTask.isPending} onClick={() => setValue("status", "draft")}>Save as Draft</Btn>
        <Btn
          type="submit"
          disabled={createTask.isPending || insufficientBalance || fields.length === 0}
          isLoading={createTask.isPending}
          onClick={() => setValue("status", "pending")}
        >
          Publish Bundle
        </Btn>
      </div>
    </form>
  );
}
