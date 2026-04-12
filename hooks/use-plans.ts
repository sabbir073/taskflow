"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPlans, getMySubscription, subscribe, adminAssignSubscription } from "@/lib/actions/plans";
import { toast } from "sonner";

export function usePlans() {
  return useQuery({ queryKey: ["plans"], queryFn: getPlans });
}

export function useMySubscription() {
  return useQuery({ queryKey: ["my-subscription"], queryFn: getMySubscription });
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
    mutationFn: ({ userId, planId }: { userId: string; planId: number }) =>
      adminAssignSubscription(userId, planId),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["users"] }); }
      else toast.error(r.error);
    },
  });
}
