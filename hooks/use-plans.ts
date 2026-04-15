"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPlans, getAllPlans, getMySubscription, getMyQuotaUsage, getMySubscriptionStatus,
  subscribe, adminAssignSubscription, createPlan, updatePlan, deletePlan,
} from "@/lib/actions/plans";
import { toast } from "sonner";

function invalidatePlans(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["plans"] });
  qc.invalidateQueries({ queryKey: ["all-plans"] });
  qc.invalidateQueries({ queryKey: ["my-subscription"] });
}

export function usePlans() {
  return useQuery({ queryKey: ["plans"], queryFn: getPlans, refetchInterval: 20000 });
}

// Admin — includes inactive plans for management
export function useAllPlans() {
  return useQuery({ queryKey: ["all-plans"], queryFn: getAllPlans, refetchInterval: 20000 });
}

export function useMySubscription() {
  return useQuery({ queryKey: ["my-subscription"], queryFn: getMySubscription, refetchInterval: 15000 });
}

export function useMyQuotaUsage() {
  return useQuery({ queryKey: ["my-quota"], queryFn: getMyQuotaUsage, refetchInterval: 15000 });
}

export function useMySubscriptionStatus() {
  return useQuery({ queryKey: ["my-sub-status"], queryFn: getMySubscriptionStatus, refetchInterval: 15000 });
}

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: subscribe,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["my-subscription"] }); }
      else toast.error(r.error);
    },
  });
}

export function useAdminAssignSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, planId, period }: { userId: string; planId: number; period?: "monthly" | "half_yearly" | "yearly" }) =>
      adminAssignSubscription(userId, planId, period),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["users"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
      }
      else toast.error(r.error);
    },
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidatePlans(qc); }
      else toast.error(r.error);
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePlan>[1] }) => updatePlan(id, data),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidatePlans(qc); }
      else toast.error(r.error);
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidatePlans(qc); }
      else toast.error(r.error);
    },
  });
}
