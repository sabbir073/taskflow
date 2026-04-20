"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveNotices, getAllNotices, createNotice, updateNotice, deleteNotice } from "@/lib/actions/notices";
import { toast } from "sonner";

export function useActiveNotices() {
  return useQuery({
    queryKey: ["active-notices"],
    queryFn: getActiveNotices,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
}

export function useAllNotices() {
  return useQuery({
    queryKey: ["all-notices"],
    queryFn: getAllNotices,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["active-notices"] });
  qc.invalidateQueries({ queryKey: ["all-notices"] });
}

export function useCreateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNotice,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateAll(qc); }
      else toast.error(r.error);
    },
  });
}

export function useUpdateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; body?: string; is_active?: boolean } }) =>
      updateNotice(id, data),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateAll(qc); }
      else toast.error(r.error);
    },
  });
}

export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNotice,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateAll(qc); }
      else toast.error(r.error);
    },
  });
}
