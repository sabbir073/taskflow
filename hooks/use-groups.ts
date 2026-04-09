"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyGroups, getGroupById, createGroup, deleteGroup, leaveGroup,
  addMember, addMemberByEmail, removeMember, searchUserByEmail,
  getAllGroups, approveGroup, rejectGroup,
} from "@/lib/actions/groups";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

export function useMyGroups(params?: PaginationParams) {
  return useQuery({ queryKey: ["my-groups", params], queryFn: () => getMyGroups(params) });
}

export function useGroup(groupId: number) {
  return useQuery({ queryKey: ["group", groupId], queryFn: () => getGroupById(groupId), enabled: !!groupId });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["my-groups"] }); }
      else toast.error(r.error);
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["my-groups"] }); }
      else toast.error(r.error);
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["my-groups"] }); }
      else toast.error(r.error);
    },
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: string }) => addMember(groupId, userId),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["group"] }); }
      else toast.error(r.error);
    },
  });
}

export function useAddMemberByEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, email }: { groupId: number; email: string }) => addMemberByEmail(groupId, email),
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["group"] }); }
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
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["group"] }); }
      else toast.error(r.error);
    },
  });
}

// Admin hooks
export function useAllGroups(params: PaginationParams & { approval_status?: string }) {
  return useQuery({ queryKey: ["admin-groups", params], queryFn: () => getAllGroups(params) });
}

export function useApproveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["admin-groups"] }); }
      else toast.error(r.error);
    },
  });
}

export function useRejectGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rejectGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["admin-groups"] }); }
      else toast.error(r.error);
    },
  });
}
