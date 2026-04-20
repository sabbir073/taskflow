"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getActivePaymentMethods, getAllPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod,
  getActivePointPackages, getAllPointPackages, createPointPackage, updatePointPackage, deletePointPackage,
  submitPayment, getMyPayments, getAllPayments, reviewPayment,
} from "@/lib/actions/payments";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["payment-methods"] });
  qc.invalidateQueries({ queryKey: ["all-payment-methods"] });
  qc.invalidateQueries({ queryKey: ["point-packages"] });
  qc.invalidateQueries({ queryKey: ["all-point-packages"] });
  qc.invalidateQueries({ queryKey: ["my-payments"] });
  qc.invalidateQueries({ queryKey: ["all-payments"] });
  qc.invalidateQueries({ queryKey: ["notifications"] });
  qc.invalidateQueries({ queryKey: ["unread-count"] });
}

// ===== Payment methods =====
export function usePaymentMethods() {
  return useQuery({ queryKey: ["payment-methods"], queryFn: getActivePaymentMethods, refetchInterval: 30000 });
}
export function useAllPaymentMethods() {
  return useQuery({ queryKey: ["all-payment-methods"], queryFn: getAllPaymentMethods, refetchInterval: 30000 });
}
export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPaymentMethod,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidateAll(qc); } else toast.error(r.error); },
  });
}
export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePaymentMethod>[1] }) => updatePaymentMethod(id, data),
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidateAll(qc); } else toast.error(r.error); },
  });
}
export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidateAll(qc); } else toast.error(r.error); },
  });
}

// ===== Point packages =====
export function usePointPackages() {
  return useQuery({ queryKey: ["point-packages"], queryFn: getActivePointPackages, refetchInterval: 30000 });
}
export function useAllPointPackages() {
  return useQuery({ queryKey: ["all-point-packages"], queryFn: getAllPointPackages, refetchInterval: 30000 });
}
export function useCreatePointPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPointPackage,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidateAll(qc); } else toast.error(r.error); },
  });
}
export function useUpdatePointPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePointPackage>[1] }) => updatePointPackage(id, data),
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidateAll(qc); } else toast.error(r.error); },
  });
}
export function useDeletePointPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePointPackage,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidateAll(qc); } else toast.error(r.error); },
  });
}

// ===== Payments =====
export function useSubmitPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitPayment,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); invalidateAll(qc); } else toast.error(r.error); },
  });
}
export function useMyPayments(params?: PaginationParams) {
  return useQuery({ queryKey: ["my-payments", params], queryFn: () => getMyPayments(params), refetchInterval: 60000 });
}
export function useAllPayments(params?: PaginationParams & { status?: string; purpose?: string }) {
  return useQuery({ queryKey: ["all-payments", params], queryFn: () => getAllPayments(params), refetchInterval: 60000 });
}
export function useReviewPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, action, notes }: { paymentId: number; action: "approve" | "reject"; notes?: string }) =>
      reviewPayment(paymentId, action, notes),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        invalidateAll(qc);
        qc.invalidateQueries({ queryKey: ["my-subscription"] });
        qc.invalidateQueries({ queryKey: ["my-balance"] });
        qc.invalidateQueries({ queryKey: ["users"] });
      } else toast.error(r.error);
    },
  });
}
