"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent, Input, Label, Select, Textarea, Btn, FieldError } from "@/components/ui";
import { updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";

interface Props {
  task: Record<string, unknown>;
  taskId: number;
}

export function TaskEditForm({ task, taskId }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: String(task.title || ""),
      description: String(task.description || ""),
      proof_type: String(task.proof_type || "both"),
      priority: String(task.priority || "medium"),
      deadline: task.deadline ? String(task.deadline).slice(0, 16) : "",
      points_per_completion: Number(task.points_per_completion || 0),
    },
  });

  async function onSubmit(data: Record<string, unknown>) {
    setIsSubmitting(true);
    const result = await updateTask(taskId, {
      title: data.title,
      description: data.description,
      proof_type: data.proof_type,
      priority: data.priority,
      deadline: data.deadline || null,
      points_per_completion: Number(data.points_per_completion),
      points: Number(data.points_per_completion),
    });
    if (result.success) {
      toast.success(result.message);
      router.push("/tasks");
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Task Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input {...register("title", { required: "Required" })} error={!!errors.title} />
            {errors.title && <FieldError>{errors.title.message}</FieldError>}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea {...register("description")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Proof Required</Label>
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

          <div className="space-y-1.5">
            <Label>Points per Completion</Label>
            <Input {...register("points_per_completion", { valueAsNumber: true })} type="number" step="0.01" min={0.01} />
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
