"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent, Input, Label, FieldError, Select, Textarea, Btn, Badge } from "@/components/ui";
import { usePlatforms, useTaskTypes, useCreateTask } from "@/hooks/use-tasks";
import { PLATFORM_CONFIG, MUSIC_STREAM_SLUGS } from "@/lib/constants/platforms";
import { CATEGORY_LABELS_LONG } from "@/lib/constants";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { getMyBalance } from "@/lib/actions/users";
import { useAssignableGroups } from "@/hooks/use-groups";
import { taskTypeNeedsAiPrompt } from "@/lib/content-task-types";
import { actionPriority } from "@/lib/constants/action-priority";
import { SectionHeader } from "@/components/shared/section-header";
import type { TaskFormData } from "@/types";
import type { ProofType, TaskCategory } from "@/types/database";
import { Coins, AlertCircle, X, Link2, Plus, Mail, Sparkles, Trophy, Info, ListChecks, Image as ImageIcon, Users, SlidersHorizontal, CheckCircle } from "lucide-react";

// Slug shape matchers used to filter task_types when the admin picks a
// category. Engagement bundles hide the create-* / post-tweet / post-story
// rows; creation bundles show ONLY those.
function isCreationSlug(slug: string): boolean {
  return /^create-/.test(slug) || slug === "post-tweet" || slug === "post-story";
}

// `actionPriority` (the natural-flow ranking that drives both the picker
// order here AND the server-side bundle-item re-ordering at save time) is
// now imported from lib/constants/action-priority.ts so client + server
// stay in lockstep. See that module for tier documentation.

// Platform → default category. Auto-suggested when the admin picks a
// platform; they can still override the Category dropdown manually.
const PLATFORM_DEFAULT_CATEGORY: Record<string, TaskCategory> = {
  spotify: "music", tidal: "music", deezer: "music", soundcloud: "music", bandcamp: "music",
  google_business: "review", yelp: "review", trustpilot: "review", tripadvisor: "review",
  bbb: "review", g2: "review", capterra: "review", sitejabber: "review",
  glassdoor: "review", facebook_reviews: "review",
  google_maps: "maps",
};

// Long-form labels live in lib/constants/index.ts as CATEGORY_LABELS_LONG
// so the task-form, task cards, and any future admin inbox can stay in sync.

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
      category: "engagement",
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
  const watchCategory = (useWatch({ control, name: "category" }) || "engagement") as TaskCategory;

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
    const id = e.target.value ? Number(e.target.value) : null;
    setSelectedPlatformId(id);
    // Auto-suggest category from the chosen platform. Music platforms → music,
    // review platforms → review, Google Maps → maps. Admin can still override
    // by changing the Category dropdown manually after.
    if (id !== null) {
      const picked = (platforms || []).find((p) => Number((p as Record<string, unknown>).id) === id);
      const slug = picked ? String((picked as Record<string, unknown>).slug || "") : "";
      const suggested = PLATFORM_DEFAULT_CATEGORY[slug] ?? "engagement";
      setValue("category", suggested);
    }
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

  const canPublish = fields.length > 0;
  const summaryProps = {
    selectedCount: fields.length,
    itemsPointsSum,
    completionBonus: Number(watchBonus || 0),
    perCompletionCost,
    maxCompletions,
    totalBudget: effectiveBudget,
    isIndividual,
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }}
      className="max-w-6xl mx-auto"
    >
      {/* Outer 2-col grid. On <lg the right sidebar collapses BELOW the
          main column so wallet + summary stay accessible. `pb-28` reserves
          space for the mobile sticky CTA bar; cleared on lg+. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-28 lg:pb-6">
        <div className="lg:col-span-2 space-y-6">

      {/* Basic Info */}
      <Card>
        <SectionHeader icon={Info} tint="bg-primary/10 text-primary" title="Basic Information" />
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

          <div className="space-y-1.5">
            <Label>Bundle Category</Label>
            <Select {...register("category")}>
              {(Object.keys(CATEGORY_LABELS_LONG) as TaskCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABELS_LONG[k]}</option>
              ))}
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Auto-suggested from the platform. Drives the worker grid filter and which actions appear below
              (Engagement hides Create-* actions; Creation shows only Create-*).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bundle items picker */}
      <Card>
        <SectionHeader
          icon={ListChecks}
          tint="bg-accent/10 text-accent"
          title="Required Actions"
          description="Pick one or more actions a worker must complete. Each action carries its own points and proof requirements."
        >
          <p className="text-xs text-muted-foreground mt-1">
            Workers will complete these in the order shown above — step 2 unlocks once step 1 is submitted.
          </p>
          <p className="text-[11px] text-muted-foreground italic mt-2 flex items-start gap-1.5">
            <Sparkles className="w-3 h-3 text-primary shrink-0 mt-0.5" />
            <span>
              No matter what order you click these in, the saved bundle is auto-arranged in the natural worker flow
              (watch → like → save → comment → share → follow → review → create → keep alive). You don&apos;t need to
              worry about click order.
            </span>
          </p>
        </SectionHeader>
        <CardContent>
          {!selectedPlatformId ? (
            <p className="text-sm text-muted-foreground text-center py-6">Select a platform first to see its actions</p>
          ) : taskTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No actions configured for this platform</p>
          ) : (() => {
            // Filter the action list by the current category. Engagement
            // bundles deliberately hide content-creation actions (they're
            // usually big-credit items that would dwarf the engagement total);
            // creation bundles only show those. Other categories (review,
            // music, maps, other) show everything so admins keep flexibility.
            //
            // After filtering, sort by `actionPriority` so the action list
            // follows the natural worker-flow order (Stream → Like → Save →
            // Comment → Share → Follow → Review steps → Create → Keep-live).
            // The DB query returns alphabetical, which made Stream Track
            // appear AFTER Create Public Playlist — wrong nudge for admins.
            // Tie-break alphabetically so peer actions stay stable.
            const filtered = taskTypes.filter((tt) => {
              const isCreate = isCreationSlug(tt.slug);
              if (watchCategory === "engagement") return !isCreate;
              if (watchCategory === "creation") return isCreate;
              return true;
            }).sort((a, b) => {
              const pa = actionPriority(a.slug);
              const pb = actionPriority(b.slug);
              if (pa !== pb) return pa - pb;
              return a.name.localeCompare(b.name);
            });
            if (filtered.length === 0) {
              return (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No actions match the selected category. Try a different category or platform.
                </p>
              );
            }
            return (
              <div className="space-y-3">
                {filtered.map((tt) => {
                const idx = fields.findIndex((f) => Number(f.task_type_id) === tt.id);
                const selected = idx >= 0;
                const isWatchVideo = tt.slug === "watch-video";
                const isMusicStream = MUSIC_STREAM_SLUGS.has(tt.slug);
                const needsDuration = isWatchVideo || isMusicStream;
                return (
                  <div key={tt.id} className={`rounded-xl border ${selected ? "border-primary/40 bg-primary/[0.03]" : "border-border/60"}`}>
                    {/* Header row: checkbox + name (stepper inline only on sm+).
                        On mobile the stepper moves into the expanded body
                        below so the name + description aren't squeezed. */}
                    <div className="flex items-center gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTaskType(tt)}
                        className="w-4 h-4 rounded accent-primary shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{tt.name}</p>
                        {tt.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{tt.description}</p>}
                      </div>
                      {selected && (
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          <StepperControls
                            idx={idx}
                            onDec={() => adjustItemPoints(idx, -1)}
                            onInc={() => adjustItemPoints(idx, 1)}
                            register={register}
                          />
                        </div>
                      )}
                    </div>

                    {/* Expanded body — mobile stepper + per-item config + required_fields */}
                    {selected && (
                      <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-3">
                        {/* Mobile-only stepper row — full-width, breathable */}
                        <div className="flex sm:hidden items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Points</span>
                          <div className="flex items-center gap-1.5">
                            <StepperControls
                              idx={idx}
                              onDec={() => adjustItemPoints(idx, -1)}
                              onInc={() => adjustItemPoints(idx, 1)}
                              register={register}
                            />
                          </div>
                        </div>
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
            );
          })()}
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
          <SectionHeader
            icon={Sparkles}
            tint="bg-primary/10 text-primary"
            title="AI Prompt"
            description="Give workers a ready-to-use prompt they can paste into ChatGPT or any AI tool to generate the required content."
            badge="Optional"
          />
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
        <SectionHeader
          icon={ImageIcon}
          tint="bg-muted text-muted-foreground"
          title="Attachments"
          description="Add reference images and URLs (optional)"
        />
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
        <SectionHeader
          icon={Users}
          tint="bg-success/10 text-success"
          title="Assignment"
        />
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

      {/* Reward Settings */}
      <Card>
        <SectionHeader
          icon={Trophy}
          tint="bg-warning/10 text-warning"
          title="Reward Settings"
          description="Sum of per-action points + optional completion bonus = each worker's reward."
        />
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

          {/* Mobile-only live breakdown — on lg+ the same data is shown in
              the sticky sidebar's RewardSummaryCard, so we don't render it
              twice. Mobile users still see the breakdown inline. */}
          <div className="lg:hidden">
            <RewardSummaryCard {...summaryProps} />
          </div>
          {isIndividual && (
            <p className="text-[11px] text-muted-foreground">
              The full amount goes to the assigned user once every item is approved (incl. bonus).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <SectionHeader
          icon={SlidersHorizontal}
          tint="bg-muted text-muted-foreground"
          title="Settings"
        />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Priority</Label><Select {...register("priority")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></div>
            <div className="space-y-1.5"><Label>Deadline</Label><Input {...register("deadline")} type="datetime-local" /></div>
          </div>
        </CardContent>
      </Card>

        </div>

        {/* STICKY SUMMARY SIDEBAR — desktop only. On mobile/tablet this
            column appears BELOW the main column (grid collapse) and is
            non-sticky so admin still sees the wallet + summary by
            scrolling past the form. The sticky CTA bar at the bottom
            handles in-view actions. */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="lg:sticky lg:top-6 space-y-4">
            <WalletCard balance={balance} budget={effectiveBudget} />
            <div className="hidden lg:block">
              <RewardSummaryCard {...summaryProps} />
            </div>
            <DesktopActionButtons
              isPending={createTask.isPending}
              insufficientBalance={insufficientBalance}
              canPublish={canPublish}
              onCancel={() => router.back()}
              onSaveDraft={() => setValue("status", "draft")}
              onPublish={() => setValue("status", "pending")}
            />
          </div>
        </aside>
      </div>

      {/* MOBILE STICKY CTA BAR — visible on <lg. Stacks above the dashboard's
          BottomNav (h-[68px] at `md:hidden`); on md-lg (no BottomNav) sits
          at bottom-0. */}
      <div
        className="lg:hidden fixed inset-x-0 z-40 bottom-17 md:bottom-0 border-t border-border bg-card/95 backdrop-blur px-4 py-3 flex gap-2 shadow-lg"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Btn variant="outline" size="sm" type="button" onClick={() => router.back()} className="shrink-0">
          Cancel
        </Btn>
        <Btn
          variant="ghost"
          size="sm"
          type="submit"
          onClick={() => setValue("status", "draft")}
          className="shrink-0"
          disabled={createTask.isPending}
        >
          Draft
        </Btn>
        <Btn
          size="sm"
          type="submit"
          className="flex-1"
          disabled={createTask.isPending || insufficientBalance || !canPublish}
          isLoading={createTask.isPending}
          onClick={() => setValue("status", "pending")}
        >
          Publish bundle
        </Btn>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------------
// Inline helpers — kept in the same file because they're singular to the
// task-form layout. Promote to shared components only if a second surface
// needs them (per the Entry #21 / #23 "no new shared components until
// proven needed" rule).
// ----------------------------------------------------------------------------

// SectionHeader is promoted to a shared component (Entry #35) so /tasks/
// create and /groups/create can use one definition. Used to be inlined
// here; see components/shared/section-header.tsx for the implementation.

// Stepper controls for the per-action points input (extracted so the
// Required Actions card can mount the same controls in two layouts:
// inline next to the action name on sm+, OR full-width inside the
// expanded body on mobile).
function StepperControls({
  idx,
  onDec,
  onInc,
  register,
}: {
  idx: number;
  onDec: () => void;
  onInc: () => void;
  register: ReturnType<typeof useForm<TaskFormData>>["register"];
}) {
  return (
    <>
      <button
        type="button"
        onClick={onDec}
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
        onClick={onInc}
        className="w-7 h-7 rounded-md border border-border/60 hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition"
        aria-label="Increase points"
      >+</button>
      <span className="text-[11px] text-muted-foreground ml-1">pts</span>
    </>
  );
}

// Wallet card with a usage progress bar — fills as the bundle's total
// budget grows. Flips from primary→accent gradient (safe) to warning at
// 80% to error at 100% so admins see "you're about to overdraft" at a
// glance. Lives in the sticky sidebar (desktop) AND collapsed inline at
// the bottom of the page on mobile/tablet.
function WalletCard({ balance, budget }: { balance: number; budget: number }) {
  const usage = balance > 0 ? Math.min(100, (budget / balance) * 100) : 0;
  const usageColor =
    usage >= 100 ? "from-error to-error/70"
    : usage >= 80 ? "from-warning to-accent"
    : "from-primary to-accent";
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4 text-warning" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your wallet</span>
          </div>
          <span className="text-base font-bold text-foreground tabular-nums shrink-0">{balance.toFixed(2)}</span>
        </div>
        {budget > 0 && (
          <>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full bg-linear-to-r ${usageColor} transition-[width] duration-500`}
                style={{ width: `${usage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Budget: <span className="font-mono text-foreground">{budget.toFixed(2)}</span></span>
              <span>{usage.toFixed(0)}% of balance</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Live cost/budget breakdown. Mounted in the sticky sidebar on lg+ AND
// inline inside the Reward Settings card on <lg so mobile admins see the
// math next to the inputs that drive it.
function RewardSummaryCard({
  selectedCount,
  itemsPointsSum,
  completionBonus,
  perCompletionCost,
  maxCompletions,
  totalBudget,
  isIndividual,
}: {
  selectedCount: number;
  itemsPointsSum: number;
  completionBonus: number;
  perCompletionCost: number;
  maxCompletions: number;
  totalBudget: number;
  isIndividual: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-primary" /> Live summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <SummaryRow label="Selected actions" value={selectedCount} />
        <SummaryRow label="Sum of action points" value={itemsPointsSum.toFixed(2)} />
        <SummaryRow label="Completion bonus" value={`+${completionBonus.toFixed(2)}`} />
        <div className="flex justify-between items-center border-t border-border/40 pt-2">
          <span className="text-muted-foreground">{isIndividual ? "Reward / user" : "Cost / completion"}</span>
          <Badge variant="primary">{perCompletionCost.toFixed(2)} pts</Badge>
        </div>
        {!isIndividual && <SummaryRow label="Max completions" value={maxCompletions} />}
        <div className="flex justify-between pt-1">
          <span className="text-muted-foreground">Total budget</span>
          <span className="font-bold text-warning text-sm tabular-nums">{totalBudget.toFixed(2)} pts</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

// Stacked action buttons inside the sticky sidebar (desktop only). The
// mobile counterpart is the inline sticky bar at the bottom of the form.
function DesktopActionButtons({
  isPending,
  insufficientBalance,
  canPublish,
  onCancel,
  onSaveDraft,
  onPublish,
}: {
  isPending: boolean;
  insufficientBalance: boolean;
  canPublish: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Btn
          className="w-full"
          disabled={isPending || insufficientBalance || !canPublish}
          isLoading={isPending}
          type="submit"
          onClick={onPublish}
        >
          <CheckCircle className="w-4 h-4 mr-2" /> Publish bundle
        </Btn>
        <Btn
          variant="secondary"
          className="w-full"
          type="submit"
          onClick={onSaveDraft}
          disabled={isPending}
        >
          Save as draft
        </Btn>
        <Btn variant="ghost" className="w-full" type="button" onClick={onCancel}>
          Cancel
        </Btn>
      </CardContent>
    </Card>
  );
}
