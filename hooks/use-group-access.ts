"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMyGroupAccessState,
  applyForGroupAccess,
  payForGroupApplication,
  getGroupApplications,
  reviewGroupApplication,
} from "@/lib/actions/group-access";
import type { PaginationParams } from "@/types";

// User-side: current access + latest application + pricing (drives the gate UI).
export function useMyGroupAccessState() {
  return useQuery({
    queryKey: ["group-access-state"],
    queryFn: getMyGroupAccessState,
    staleTime: 30_000,
  });
}

function invalidateState(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["group-access-state"] });
  qc.invalidateQueries({ queryKey: ["my-groups"] });
}

export function useApplyForGroupAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: applyForGroupAccess,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateState(qc); }
      else toast.error(r.error);
    },
  });
}

export function usePayForGroupApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, methodId, transactionId }: { appId: number; methodId: number; transactionId: string }) =>
      payForGroupApplication(appId, methodId, transactionId),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateState(qc); }
      else toast.error(r.error);
    },
  });
}

// Admin-side: list + review.
export function useGroupApplications(params?: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: ["group-applications", params],
    queryFn: () => getGroupApplications(params),
    refetchInterval: 60_000,
  });
}

export function useReviewGroupApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, action, opts }: {
      appId: number;
      action: "quote" | "approve" | "reject";
      opts?: { price?: number; granted_groups?: number; granted_members?: number; granted_tasks?: number; notes?: string };
    }) => reviewGroupApplication(appId, action, opts),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["group-applications"] });
        qc.invalidateQueries({ queryKey: ["group-access-state"] });
        qc.invalidateQueries({ queryKey: ["admin-inbox"] });
        qc.invalidateQueries({ queryKey: ["admin-inbox-counts"] });
      } else toast.error(r.error);
    },
  });
}
