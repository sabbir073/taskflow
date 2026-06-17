"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasks, getTaskById, createTask, deleteTask, publishTask, approveTask, rejectTask, getPendingApprovalTasks, getTaskRecentSubmitters } from "@/lib/actions/tasks";
import {
  getMyTasks, acceptTask, submitProof, reviewAssignment, getPendingReviews,
  submitItemProof, reviewItemSubmission, getMyAssignmentForTaskWithItems, getPendingItemReviews,
  reverseAutoApprovedItem, getReversibleAutoApprovedItems,
} from "@/lib/actions/assignments";
import { getPlatforms, getTaskTypesByPlatform, getAllPlatformsForAdmin, setPlatformActive } from "@/lib/actions/platforms";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

export function usePlatforms() {
  return useQuery({ queryKey: ["platforms"], queryFn: getPlatforms });
}

// Admin-only: every platform including disabled ones. Used by the
// /settings Platforms toggle list.
export function useAllPlatformsForAdmin() {
  return useQuery({ queryKey: ["platforms-admin"], queryFn: getAllPlatformsForAdmin });
}

export function useSetPlatformActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ platformId, isActive }: { platformId: number; isActive: boolean }) =>
      setPlatformActive(platformId, isActive),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["platforms"] });
        qc.invalidateQueries({ queryKey: ["platforms-admin"] });
      } else toast.error(r.error);
    },
  });
}

export function useTaskTypes(platformId: number | null) {
  return useQuery({
    queryKey: ["task-types", platformId],
    queryFn: () => getTaskTypesByPlatform(platformId!),
    enabled: !!platformId,
  });
}

export function useTasks(params: PaginationParams & { status?: string; platform_id?: number; approval_status?: string; created_by?: string; category?: string }) {
  return useQuery({ queryKey: ["tasks", params], queryFn: () => getTasks(params) });
}

export function useTask(taskId: number) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTaskById(taskId),
    enabled: !!taskId,
  });
}

export function useMyTasks(params: PaginationParams & { status?: string; category?: string }) {
  return useQuery({
    queryKey: ["my-tasks", params],
    queryFn: () => getMyTasks(params),
    refetchInterval: 60000,
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
        // CRITICAL: invalidate the detail-page query so /tasks/[id] flips
        // from the "Accept this bundle" button straight to the per-item
        // proof grid. Without this, useMyAssignmentWithItems' 60s
        // staleTime (added in Entry #22) keeps the stale `status: "pending"`
        // cached and the worker is stuck on the Accept button until the
        // staleTime expires.
        qc.invalidateQueries({ queryKey: ["my-assignment"] });
        qc.invalidateQueries({ queryKey: ["my-tasks"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } else toast.error(r.error);
    },
  });
}

// Recent submitters / completion count for a task — drives the "Recent
// activity" card on /tasks/[id]. 60s staleTime balances freshness against
// the perceived speed of the page (each card load doesn't re-fetch).
export function useTaskRecentSubmitters(taskId: number) {
  return useQuery({
    queryKey: ["task-recent-submitters", taskId],
    queryFn: () => getTaskRecentSubmitters(taskId),
    enabled: !!taskId,
    staleTime: 60_000,
  });
}

// Worker's view of one task assignment + all per-item submission rows.
// Canonical fetch for the task detail page. `staleTime: 60_000` +
// `refetchOnWindowFocus: false` were added in Entry #22 — the detail page
// was re-fetching aggressively on every mount which felt slow on slow
// connections. The mutations below (useSubmitItemProof, useAcceptTask)
// invalidate the key explicitly when the data actually changes, so a 60s
// stale window doesn't risk visible drift.
export function useMyAssignmentWithItems(taskId: number) {
  return useQuery({
    queryKey: ["my-assignment", taskId],
    queryFn: () => getMyAssignmentForTaskWithItems(taskId),
    enabled: !!taskId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

// Pending bundle-item submissions for the admin Review tab.
export function usePendingItemReviews(params?: PaginationParams) {
  return useQuery({
    queryKey: ["pending-item-reviews", params],
    queryFn: () => getPendingItemReviews(params),
  });
}

// Submit one bundle item's proof. Invalidates the worker's assignment
// query (so the UI flips that row to 'submitted') along with the usual
// notification + my-tasks queries.
export function useSubmitItemProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemSubmissionId, data }: { itemSubmissionId: number; data: { proof_urls: string[]; proof_screenshots: string[]; proof_notes?: string } }) =>
      submitItemProof(itemSubmissionId, data),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["my-assignment"] });
        qc.invalidateQueries({ queryKey: ["my-tasks"] });
        // `["task"]` was previously invalidated unbounded, which cascaded
        // into every cached `useTask(id)` consumer + the entire `useTasks`
        // grid. `refetchType: "none"` marks stale (so the next navigation
        // re-fetches) without firing a background refetch on every open
        // tab — kills the perceived slowness on /tasks/[id] right after
        // submit.
        qc.invalidateQueries({ queryKey: ["task"], refetchType: "none" });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } else toast.error(r.error);
    },
  });
}

// Admin per-item approve / reject. Invalidates wallet + leaderboard so the
// submitter's points credit appears immediately in dashboard widgets.
export function useReviewItemSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemSubmissionId, action, reason }: { itemSubmissionId: number; action: "approve" | "reject"; reason?: string }) =>
      reviewItemSubmission(itemSubmissionId, action, reason),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["pending-item-reviews"] });
        qc.invalidateQueries({ queryKey: ["pending-reviews"] });
        qc.invalidateQueries({ queryKey: ["task"] });
        qc.invalidateQueries({ queryKey: ["my-assignment"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
        qc.invalidateQueries({ queryKey: ["leaderboard"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["my-tasks"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["admin-inbox"] });
        qc.invalidateQueries({ queryKey: ["admin-inbox-counts"] });
      } else toast.error(r.error);
    },
  });
}

// Legacy submit hook — kept for any client code still passing an
// assignmentId. Internally the server action resolves the right bundle
// item and routes through submitItemProof.
export function useSubmitProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: { proof_urls: string[]; proof_screenshots: string[]; proof_notes?: string } }) =>
      submitProof(assignmentId, data),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["my-assignment"] });
        qc.invalidateQueries({ queryKey: ["my-tasks"] });
        qc.invalidateQueries({ queryKey: ["task"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } else toast.error(r.error);
    },
  });
}

// Legacy review hook — assignment-level. Delegates server-side to
// reviewItemSubmission once the right item is resolved.
export function useReviewAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, action, reason }: { assignmentId: number; action: "approve" | "reject"; reason?: string }) =>
      reviewAssignment(assignmentId, action, reason),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["pending-reviews"] });
        qc.invalidateQueries({ queryKey: ["pending-item-reviews"] });
        qc.invalidateQueries({ queryKey: ["task"] });
        qc.invalidateQueries({ queryKey: ["my-assignment"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
        qc.invalidateQueries({ queryKey: ["leaderboard"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["my-tasks"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["admin-inbox"] });
        qc.invalidateQueries({ queryKey: ["admin-inbox-counts"] });
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
        qc.invalidateQueries({ queryKey: ["admin-inbox"] });
        qc.invalidateQueries({ queryKey: ["admin-inbox-counts"] });
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
        qc.invalidateQueries({ queryKey: ["admin-inbox"] });
        qc.invalidateQueries({ queryKey: ["admin-inbox-counts"] });
      } else toast.error(r.error);
    },
  });
}

// Recent music auto-approvals an admin can still reverse (24h window).
// Staff-only — server-side gated. Drives a future admin audit panel.
export function useReversibleAutoApprovedItems(params?: PaginationParams) {
  return useQuery({
    queryKey: ["reversible-auto-approved", params],
    queryFn: () => getReversibleAutoApprovedItems(params),
    refetchInterval: 60000,
  });
}

// Reverse an auto-approval (admin). Refunds task budget, debits worker.
// Invalidates the wallet + leaderboard + the auto-approve list so the row
// disappears from the reversible queue.
export function useReverseAutoApprovedItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemSubmissionId, reason }: { itemSubmissionId: number; reason: string }) =>
      reverseAutoApprovedItem(itemSubmissionId, reason),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["reversible-auto-approved"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
        qc.invalidateQueries({ queryKey: ["leaderboard"] });
        qc.invalidateQueries({ queryKey: ["pending-reviews"] });
        qc.invalidateQueries({ queryKey: ["pending-item-reviews"] });
        qc.invalidateQueries({ queryKey: ["task"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
      } else toast.error(r.error);
    },
  });
}
