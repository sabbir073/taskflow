"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyInvoices, getInvoiceById, getAllInvoices, updateInvoiceStatus } from "@/lib/actions/invoices";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

export function useMyInvoices(params?: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: ["my-invoices", params],
    queryFn: () => getMyInvoices(params),
    refetchInterval: 60000,
  });
}

export function useInvoice(paymentId: number) {
  return useQuery({
    queryKey: ["invoice", paymentId],
    queryFn: () => getInvoiceById(paymentId),
    enabled: !!paymentId,
    refetchInterval: 60000,
  });
}

export function useAllInvoices(params?: PaginationParams & { status?: string; search?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["all-invoices", params],
    queryFn: () => getAllInvoices(params),
    refetchInterval: 60000,
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, status, notes }: { paymentId: number; status: "pending" | "approved" | "rejected"; notes?: string }) =>
      updateInvoiceStatus(paymentId, status, notes),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["my-invoices"] });
        qc.invalidateQueries({ queryKey: ["all-invoices"] });
        qc.invalidateQueries({ queryKey: ["invoice"] });
        qc.invalidateQueries({ queryKey: ["all-payments"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
        qc.invalidateQueries({ queryKey: ["my-subscription"] });
      } else toast.error(r.error);
    },
  });
}
