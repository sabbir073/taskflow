"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasks, getTaskById, createTask, deleteTask, publishTask, approveTask, rejectTask, getPendingApprovalTasks } from "@/lib/actions/tasks";
import { getMyTasks, acceptTask, submitProof, reviewAssignment, getPendingReviews } from "@/lib/actions/assignments";
import { getPlatforms, getTaskTypesByPlatform } from "@/lib/actions/platforms";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

export function usePlatforms() {
  return useQuery({ queryKey: ["platforms"], queryFn: getPlatforms });
}

export function useTaskTypes(platformId: number | null) {
  return useQuery({
    queryKey: ["task-types", platformId],
    queryFn: () => getTaskTypesByPlatform(platformId!),
    enabled: !!platformId,
  });
}

export function useTasks(params: PaginationParams & { status?: string; platform_id?: number; approval_status?: string; created_by?: string }) {
  return useQuery({ queryKey: ["tasks", params], queryFn: () => getTasks(params) });
}

export function useTask(taskId: number) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTaskById(taskId),
    enabled: !!taskId,
  });
}

export function useMyTasks(params: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: ["my-tasks", params],
    queryFn: () => getMyTasks(params),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
}

export function usePendingReviews(params?: PaginationParams) {
  return useQuery({ queryKey: ["pending-reviews", params], queryFn: () => getPendingReviews(params) });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
      } else toast.error(r.error);
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
      } else toast.error(r.error);
    },
  });
}

export function usePublishTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishTask,
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
      } else toast.error(r.error);
    },
  });
}

export function useAcceptTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptTask,
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["my-tasks"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } else toast.error(r.error);
    },
  });
}

export function useSubmitProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: { proof_urls: string[]; proof_screenshots: string[]; proof_notes?: string } }) =>
      submitProof(assignmentId, data),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["my-tasks"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } else toast.error(r.error);
    },
  });
}

export function useReviewAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, action, reason }: { assignmentId: number; action: "approve" | "reject"; reason?: string }) =>
      reviewAssignment(assignmentId, action, reason),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["pending-reviews"] });
        qc.invalidateQueries({ queryKey: ["task"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["my-tasks"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
      } else toast.error(r.error);
    },
  });
}

export function usePendingApprovalTasks(params?: PaginationParams) {
  return useQuery({ queryKey: ["pending-approval-tasks", params], queryFn: () => getPendingApprovalTasks(params) });
}

export function useApproveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveTask,
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["pending-approval-tasks"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
      } else toast.error(r.error);
    },
  });
}

export function useRejectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, reason }: { taskId: number; reason?: string }) => rejectTask(taskId, reason),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["pending-approval-tasks"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
      } else toast.error(r.error);
    },
  });
}
