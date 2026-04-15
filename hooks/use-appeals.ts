"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyStatus, getMyLatestAppeal, submitAppeal, getAppeals, reviewAppeal } from "@/lib/actions/appeals";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

// Polled every 5s so suspension / reactivation takes effect in real time
export function useMyStatus() {
  return useQuery({
    queryKey: ["my-status"],
    queryFn: getMyStatus,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });
}

export function useMyLatestAppeal() {
  return useQuery({
    queryKey: ["my-latest-appeal"],
    queryFn: getMyLatestAppeal,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
}

export function useSubmitAppeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitAppeal,
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["my-latest-appeal"] });
      } else toast.error(r.error);
    },
  });
}

export function useAppeals(params?: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: ["appeals", params],
    queryFn: () => getAppeals(params),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
}

export function useReviewAppeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appealId, action, notes }: { appealId: number; action: "approve" | "reject"; notes?: string }) =>
      reviewAppeal(appealId, action, notes),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["appeals"] });
        qc.invalidateQueries({ queryKey: ["users"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
      } else toast.error(r.error);
    },
  });
}
