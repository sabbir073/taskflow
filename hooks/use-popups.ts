"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActivePopups, getAllPopups, createPopup, updatePopup, deletePopup } from "@/lib/actions/popups";
import { toast } from "sonner";

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["popups"] });
  qc.invalidateQueries({ queryKey: ["all-popups"] });
}

export function useActivePopups(target: "website" | "dashboard") {
  return useQuery({
    queryKey: ["popups", target],
    queryFn: () => getActivePopups(target),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useAllPopups() {
  return useQuery({ queryKey: ["all-popups"], queryFn: getAllPopups, refetchInterval: 30000 });
}

export function useCreatePopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPopup,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidate(qc); } else toast.error(r.error); },
  });
}

export function useUpdatePopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePopup>[1] }) => updatePopup(id, data),
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidate(qc); } else toast.error(r.error); },
  });
}

export function useDeletePopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePopup,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidate(qc); } else toast.error(r.error); },
  });
}
