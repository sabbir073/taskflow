"use client";

import { useQuery } from "@tanstack/react-query";
import { getAuditLog } from "@/lib/actions/audit";
import type { PaginationParams } from "@/types";

export function useAuditLog(
  params: PaginationParams & {
    actor_search?: string;
    action?: string;
    target_type?: string;
    from?: string;
    to?: string;
  }
) {
  return useQuery({
    queryKey: ["audit-log", params],
    queryFn: () => getAuditLog(params),
    refetchInterval: 30000,
  });
}
