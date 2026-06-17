"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Select, Textarea, Btn, FieldError } from "@/components/ui";
import { Upload, X, ImagePlus, Users, Info, Image as ImageIcon, Eye, Lock, Globe, CheckCircle } from "lucide-react";
import { useCreateGroup } from "@/hooks/use-groups";
import { GROUP_CATEGORIES } from "@/lib/constants";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { SectionHeader } from "@/components/shared/section-header";
import type { GroupFormData } from "@/types";

// ============================================================================
// GroupForm — Entry #35 polish.
// Mirrors the /tasks/create pattern from Entry #34: 2-col grid on lg+,
// sticky live-preview sidebar (desktop) + mobile sticky CTA. Two main-
// column cards (Appearance, Details) wrapped with the shared
// <SectionHeader> so the chrome matches task-form.
// ============================================================================

export function GroupForm() {
  const router = useRouter();
  const createGroup = useCreateGroup();
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<GroupFormData>({
    defaultValues: { privacy: "public", max_members: 50, category: "Other", rules: "" },
  });

  // useWatch (not watch()) so the React Compiler can memoize the preview
  // card — `watch()` returns a fresh function reference each render and
  // defeats memoization.
  const watchedName = useWatch({ control, name: "name" });
  const watchedDescription = useWatch({ control, name: "description" });
  const watchedRules = useWatch({ control, name: "rules" });
  const watchedCategory = useWatch({ control, name: "category" });
  const watchedPrivacy = useWatch({ control, name: "privacy" }) || "public";
  const watchedMaxMembers = useWatch({ control, name: "max_members" });

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  async function uploadOne(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      return typeof data?.url === "string" ? data.url : null;
    } catch { return null; }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const url = await uploadOne(file);
    if (url) setAvatarUrl(url);
    setUploadingAvatar(false);
    e.target.value = "";
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const url = await uploadOne(file);
    if (url) setCoverUrl(url);
    setUploadingCover(false);
    e.target.value = "";
  }

  async function onSubmit(data: GroupFormData) {
    const result = await createGroup.mutateAsync({
      ...data,
      rules: data.rules || "",
      avatar_url: avatarUrl || null,
      cover_url: coverUrl || null,
    });
    if (result.success) router.push("/groups");
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }}
      className="max-w-6xl mx-auto"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-28 lg:pb-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Appearance */}
          <Card>
            <SectionHeader
              icon={ImageIcon}
              tint="bg-muted text-muted-foreground"
              title="Group Appearance"
              description="Add a cover image and avatar (optional)"
            />
            <CardContent className="space-y-4">
              {/* Cover */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="relative rounded-xl overflow-hidden border border-border bg-linear-to-r from-primary/10 to-accent/10 aspect-3/1">
                  {coverUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCoverUrl("")}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        aria-label="Remove cover image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-black/5 transition-colors">
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{uploadingCover ? "Uploading..." : "Upload cover image"}</span>
                      <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Avatar */}
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border border-border bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden relative shrink-0">
                    {avatarUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAvatarUrl("")}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                          aria-label="Remove avatar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <Users className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploadingAvatar ? "Uploading..." : "Upload avatar"}</span>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <SectionHeader
              icon={Info}
              tint="bg-primary/10 text-primary"
              title="Group Details"
            />
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Group Name *</Label>
                <Input {...register("name", { required: "Name is required" })} placeholder="e.g. Marketing Team" error={!!errors.name} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea {...register("description")} placeholder="What is this group about?" />
              </div>
              <div className="space-y-1.5">
                <Label>Group Rules</Label>
                <RichTextEditor
                  value={watchedRules || ""}
                  onChange={(html) => setValue("rules", html)}
                  placeholder="Rules every member should follow..."
                />
                <p className="text-[11px] text-muted-foreground">Shown to every member on the group page.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select {...register("category")}>
                    {GROUP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Privacy</Label>
                  <Select {...register("privacy")}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Max Members</Label>
                <Input
                  {...register("max_members", {
                    valueAsNumber: true,
                    min: { value: 2, message: "Minimum 2 members" },
                    max: { value: 1000, message: "Maximum 1000 members" },
                  })}
                  type="number"
                  min={2}
                  max={1000}
                  error={!!errors.max_members}
                />
                <p className="text-[11px] text-muted-foreground">Between 2 and 1000 members.</p>
                {errors.max_members && <FieldError>{errors.max_members.message}</FieldError>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* STICKY PREVIEW SIDEBAR (desktop) — non-sticky inline (mobile) */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="lg:sticky lg:top-6 space-y-4">
            <GroupPreviewCard
              name={watchedName}
              description={watchedDescription}
              category={watchedCategory}
              privacy={watchedPrivacy}
              maxMembers={watchedMaxMembers}
              avatarUrl={avatarUrl}
              coverUrl={coverUrl}
            />
            <DesktopActionButtons
              isPending={createGroup.isPending}
              onCancel={() => router.back()}
            />
          </div>
        </aside>
      </div>

      {/* MOBILE STICKY CTA BAR — visible on <lg. Sits above the dashboard's
          BottomNav (h-[68px] on <md) using bottom-17; drops to bottom-0
          on md-lg where there's no BottomNav. Same pattern as Entry #34. */}
      <div
        className="lg:hidden fixed inset-x-0 z-40 bottom-17 md:bottom-0 border-t border-border bg-card/95 backdrop-blur px-4 py-3 flex gap-2 shadow-lg"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Btn variant="outline" size="sm" type="button" onClick={() => router.back()} className="shrink-0">
          Cancel
        </Btn>
        <Btn
          size="sm"
          type="submit"
          className="flex-1"
          isLoading={createGroup.isPending}
          disabled={createGroup.isPending}
        >
          <CheckCircle className="w-4 h-4 mr-1.5" /> Create group
        </Btn>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------------
// GroupPreviewCard — live preview of how the group card will look on /groups.
// ----------------------------------------------------------------------------
// Mirrors the shape of <GroupCard> in groups-list.tsx (mini cover + avatar
// tile + name + meta row + description preview). Updates per keystroke
// via the useWatch values passed in. Mounted in the sticky sidebar on lg+
// AND inline at the bottom of the form on <lg (via the grid collapse).
function GroupPreviewCard({
  name,
  description,
  category,
  privacy,
  maxMembers,
  avatarUrl,
  coverUrl,
}: {
  name?: string;
  description?: string;
  category?: string;
  privacy: string;
  maxMembers?: number;
  avatarUrl: string;
  coverUrl: string;
}) {
  const displayName = name?.trim() || "Group name preview";
  const cleanDescription = description ? description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-primary" /> Live preview
        </CardTitle>
        <CardDescription className="text-xs">
          How members will see your group
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mini cover */}
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="w-full h-20 object-cover rounded-lg" />
        ) : (
          <div className="w-full h-20 rounded-lg bg-linear-to-r from-primary/15 to-accent/15 flex items-center justify-center">
            <ImagePlus className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}

        {/* Mini card body */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary/25 to-accent/25 flex items-center justify-center shrink-0 overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{displayName}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1 capitalize">
                {privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />} {privacy}
              </span>
              {category && category !== "Other" && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="truncate max-w-30">{category}</span>
                </>
              )}
              {maxMembers && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>up to {maxMembers}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {cleanDescription && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-snug">
            {cleanDescription}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Stacked Cancel + Create buttons that sit inside the sticky sidebar's
// third card on lg+. Mobile gets the inline sticky CTA bar at the bottom
// of the form instead.
function DesktopActionButtons({
  isPending,
  onCancel,
}: {
  isPending: boolean;
  onCancel: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Btn
          className="w-full"
          type="submit"
          isLoading={isPending}
          disabled={isPending}
        >
          <CheckCircle className="w-4 h-4 mr-2" /> Create group
        </Btn>
        <Btn variant="ghost" className="w-full" type="button" onClick={onCancel}>
          Cancel
        </Btn>
      </CardContent>
    </Card>
  );
}
