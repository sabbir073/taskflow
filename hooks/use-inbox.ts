"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminInbox, getAdminInboxCounts } from "@/lib/actions/inbox";

// Sidebar nav badge — count-only, cheap. 60 s refetch matches the rest of
// the admin polling patterns.
export function useAdminInboxCounts() {
  return useQuery({
    queryKey: ["admin-inbox-counts"],
    queryFn: getAdminInboxCounts,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// Full inbox payload (counts + top-N preview rows per queue). Used only by
// the /inbox page body.
export function useAdminInbox() {
  return useQuery({
    queryKey: ["admin-inbox"],
    queryFn: getAdminInbox,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
