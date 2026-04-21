"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getContactSubmissions,
  getContactUnreadCount,
  updateContactStatus,
  deleteContactSubmission,
} from "@/lib/actions/contact";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

export function useContactSubmissions(
  params: PaginationParams & { status?: string; search?: string }
) {
  return useQuery({
    queryKey: ["contact-submissions", params],
    queryFn: () => getContactSubmissions(params),
    refetchInterval: 60000,
  });
}

export function useContactUnreadCount() {
  return useQuery({
    queryKey: ["contact-unread-count"],
    queryFn: getContactUnreadCount,
    refetchInterval: 60000,
  });
}

export function useUpdateContactStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      admin_notes,
    }: {
      id: number;
      status: "unread" | "read" | "archived";
      admin_notes?: string;
    }) => updateContactStatus(id, status, admin_notes),
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: ["contact-submissions"] });
        qc.invalidateQueries({ queryKey: ["contact-unread-count"] });
      } else toast.error(r.error);
    },
  });
}

export function useDeleteContactSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteContactSubmission(id),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["contact-submissions"] });
        qc.invalidateQueries({ queryKey: ["contact-unread-count"] });
      } else toast.error(r.error);
    },
  });
}
