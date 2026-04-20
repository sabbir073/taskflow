"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Select, Textarea, Btn, FieldError } from "@/components/ui";
import { Upload, X, ImagePlus, Users } from "lucide-react";
import { useCreateGroup } from "@/hooks/use-groups";
import { GROUP_CATEGORIES } from "@/lib/constants";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import type { GroupFormData } from "@/types";

export function GroupForm() {
  const router = useRouter();
  const createGroup = useCreateGroup();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<GroupFormData>({
    defaultValues: { privacy: "public", max_members: 50, category: "Other", rules: "" },
  });

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
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }} className="max-w-2xl space-y-6">
      {/* Cover + avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Group Appearance</CardTitle>
          <CardDescription>Add a cover image and avatar (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cover */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <div className="relative rounded-xl overflow-hidden border border-border bg-gradient-to-r from-primary/10 to-accent/10 aspect-[3/1]">
              {coverUrl ? (
                <>
                  <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverUrl("")}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
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
              <div className="w-20 h-20 rounded-2xl border border-border bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden relative">
                {avatarUrl ? (
                  <>
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("")}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
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
        <CardHeader><CardTitle>Group Details</CardTitle></CardHeader>
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
              value={watch("rules") || ""}
              onChange={(html) => setValue("rules", html)}
              placeholder="Rules every member should follow..."
            />
            <p className="text-[11px] text-muted-foreground">Shown to every member on the group page.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <Input {...register("max_members", { valueAsNumber: true })} type="number" min={2} max={1000} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Btn variant="outline" type="button" onClick={() => router.back()}>Cancel</Btn>
        <Btn type="submit" isLoading={createGroup.isPending}>Create Group</Btn>
      </div>
    </form>
  );
}
