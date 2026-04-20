"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyTicketAccess, getMyTickets, getTicketById, createTicket,
  replyToTicket, getAllTickets, updateTicketStatus,
} from "@/lib/actions/tickets";
import { toast } from "sonner";
import type { PaginationParams } from "@/types";

export function useMyTicketAccess() {
  return useQuery({ queryKey: ["my-ticket-access"], queryFn: getMyTicketAccess, refetchInterval: 30000 });
}

export function useMyTickets(params?: PaginationParams & { status?: string }) {
  return useQuery({ queryKey: ["my-tickets", params], queryFn: () => getMyTickets(params), refetchInterval: 60000 });
}

export function useTicket(ticketId: number) {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicketById(ticketId),
    enabled: !!ticketId,
    refetchInterval: 60000,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["my-tickets"] });
        qc.invalidateQueries({ queryKey: ["all-tickets"] });
      } else toast.error(r.error);
    },
  });
}

export function useReplyToTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, message, attachments }: { ticketId: number; message: string; attachments?: string[] }) =>
      replyToTicket(ticketId, message, attachments),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["ticket"] });
        qc.invalidateQueries({ queryKey: ["all-tickets"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["unread-count"] });
      } else toast.error(r.error);
    },
  });
}

export function useAllTickets(params?: PaginationParams & { status?: string; priority?: string }) {
  return useQuery({ queryKey: ["all-tickets", params], queryFn: () => getAllTickets(params), refetchInterval: 60000 });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: number; status: string }) => updateTicketStatus(ticketId, status),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["ticket"] });
        qc.invalidateQueries({ queryKey: ["all-tickets"] });
        qc.invalidateQueries({ queryKey: ["my-tickets"] });
      } else toast.error(r.error);
    },
  });
}
