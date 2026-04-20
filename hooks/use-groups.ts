"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyGroups, getGroupById, createGroup, updateGroup, deleteGroup, leaveGroup,
  addMember, addMemberByEmail, removeMember, searchUserByEmail,
  getAllGroups, approveGroup, rejectGroup,
  suspendGroup, unsuspendGroup, requestGroupDeletion, cancelDeletionRequest,
  getAssignableGroups, getGroupTasks, notifyAssignmentToSubmit, transferLeadership,
} from "@/lib/actions/groups";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

function invalidateGroups(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["my-groups"] });
  qc.invalidateQueries({ queryKey: ["group"] });
  qc.invalidateQueries({ queryKey: ["admin-groups"] });
  qc.invalidateQueries({ queryKey: ["assignable-groups"] });
  qc.invalidateQueries({ queryKey: ["group-tasks"] });
  qc.invalidateQueries({ queryKey: ["notifications"] });
  qc.invalidateQueries({ queryKey: ["unread-count"] });
}

export function useMyGroups(params?: PaginationParams) {
  return useQuery({
    queryKey: ["my-groups", params],
    queryFn: () => getMyGroups(params),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
}

export function useGroup(groupId: number) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroupById(groupId),
    enabled: !!groupId,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
}

// Approved + active groups I belong to — drives the task-form target dropdown
export function useAssignableGroups() {
  return useQuery({
    queryKey: ["assignable-groups"],
    queryFn: getAssignableGroups,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
}

// Tasks assigned to a group (with per-assignment status). Admin/leader only.
export function useGroupTasks(groupId: number) {
  return useQuery({
    queryKey: ["group-tasks", groupId],
    queryFn: () => getGroupTasks(groupId),
    enabled: !!groupId,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: Parameters<typeof updateGroup>[1] }) =>
      updateGroup(groupId, data),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: string }) => addMember(groupId, userId),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useAddMemberByEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, email }: { groupId: number; email: string }) => addMemberByEmail(groupId, email),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useSearchUserByEmail(email: string) {
  return useQuery({
    queryKey: ["search-user", email],
    queryFn: () => searchUserByEmail(email),
    enabled: email.length > 3 && email.includes("@"),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: string }) => removeMember(groupId, userId),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useTransferLeadership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, newLeaderId }: { groupId: number; newLeaderId: string }) => transferLeadership(groupId, newLeaderId),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

// Admin hooks
export function useAllGroups(params: PaginationParams & { approval_status?: string }) {
  return useQuery({ queryKey: ["admin-groups", params], queryFn: () => getAllGroups(params), refetchInterval: 60000 });
}

export function useApproveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useRejectGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, reason }: { groupId: number; reason?: string }) => rejectGroup(groupId, reason),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useSuspendGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, reason }: { groupId: number; reason?: string }) => suspendGroup(groupId, reason),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useUnsuspendGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unsuspendGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useRequestGroupDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, reason }: { groupId: number; reason?: string }) => requestGroupDeletion(groupId, reason),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

export function useCancelDeletionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelDeletionRequest,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); invalidateGroups(qc); }
      else toast.error(r.error);
    },
  });
}

// Remind a group member to submit their task proof
export function useNotifyAssignmentToSubmit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notifyAssignmentToSubmit,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread-count"] }); }
      else toast.error(r.error);
    },
  });
}
