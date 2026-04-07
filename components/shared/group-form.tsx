"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card, CardContent, Input, Label, Select, Textarea, Btn, FieldError } from "@/components/ui";
import { useCreateGroup } from "@/hooks/use-groups";
import { GROUP_CATEGORIES } from "@/lib/constants";
import type { GroupFormData } from "@/types";

export function GroupForm() {
  const router = useRouter();
  const createGroup = useCreateGroup();
  const { register, handleSubmit, formState: { errors } } = useForm<GroupFormData>({
    defaultValues: { privacy: "public", max_members: 50, category: "Other" },
  });

  async function onSubmit(data: GroupFormData) {
    const result = await createGroup.mutateAsync(data);
    if (result.success) router.push("/groups");
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }} className="max-w-lg space-y-6">
      <Card>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Category</Label><Select {...register("category")}>{GROUP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>Privacy</Label><Select {...register("privacy")}><option value="public">Public</option><option value="private">Private</option></Select></div>
          </div>
          <div className="space-y-1.5"><Label>Max Members</Label><Input {...register("max_members", { valueAsNumber: true })} type="number" min={2} max={1000} /></div>
        </CardContent>
      </Card>
      <div className="flex gap-3 justify-end">
        <Btn variant="outline" type="button" onClick={() => router.back()}>Cancel</Btn>
        <Btn type="submit" isLoading={createGroup.isPending}>Create Group</Btn>
      </div>
    </form>
  );
}
