"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGroups, getGroupById, createGroup, deleteGroup, joinGroup, leaveGroup,
  addMember, addMemberByEmail, removeMember,
} from "@/lib/actions/groups";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

export function useGroups(params: PaginationParams & { privacy?: string }) {
  return useQuery({ queryKey: ["groups", params], queryFn: () => getGroups(params) });
}

export function useGroup(groupId: number) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroupById(groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["groups"] }); }
      else toast.error(r.error);
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["groups"] }); }
      else toast.error(r.error);
    },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: joinGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["groups"] }); }
      else toast.error(r.error);
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveGroup,
    onSuccess: (r) => {
      if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["groups"] }); }
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
