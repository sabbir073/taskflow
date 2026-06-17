"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  assignPoints,
  approveUser,
  rejectUser,
  adminSendPasswordReset,
  adminSetUserPassword,
} from "@/lib/actions/users";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

export function useUsers(params: PaginationParams & { role?: string; status?: string; approval?: "pending" | "approved" }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => getUsers(params),
    refetchInterval: 60000,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRole(userId, role),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        toast.error(result.error);
      }
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      updateUserStatus(userId, status),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        toast.error(result.error);
      }
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        toast.error(result.error);
      }
    },
  });
}

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => approveUser(userId),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["users"] });
      } else toast.error(r.error);
    },
  });
}

export function useRejectUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => rejectUser(userId),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["users"] });
      } else toast.error(r.error);
    },
  });
}

export function useAssignPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      assignPoints(userId, amount, reason),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ["users"] });
        queryClient.invalidateQueries({ queryKey: ["my-balance"] });
        queryClient.invalidateQueries({ queryKey: ["unread-count"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } else {
        toast.error(result.error);
      }
    },
  });
}

// Admin password reset — send the user the standard /forgot-password email.
// No cache invalidation (password isn't displayed anywhere); the success
// toast carries the "Link expires in 30 minutes" hint.
export function useAdminSendPasswordReset() {
  return useMutation({
    mutationFn: adminSendPasswordReset,
    onSuccess: (result) => {
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    },
  });
}

// Admin password reset — direct set. The caller is responsible for showing
// the password to the admin once after success (see PasswordResetDialog in
// users-table.tsx). The server has already emailed the user a confirmation.
export function useAdminSetUserPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      adminSetUserPassword(userId, newPassword),
    onSuccess: (result) => {
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    },
  });
}
