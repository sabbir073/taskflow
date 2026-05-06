"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMyStatus } from "@/hooks/use-appeals";

// Real-time status watcher. Polls the user's profile status and:
// - Redirects to /suspended the moment an admin suspends them while logged in.
// - Redirects back to /dashboard the moment an admin reactivates them.
//
// mode="dashboard": mounted under (dashboard)/layout.tsx; watches for suspended.
// mode="suspended": mounted under /suspended; watches for active.
export function StatusWatcher({ mode }: { mode: "dashboard" | "suspended" }) {
  const router = useRouter();
  const { data } = useMyStatus();

  useEffect(() => {
    if (!data || !data.authed) return;

    // router.replace() already triggers a server fetch in App Router —
    // the previous `router.refresh()` afterwards caused a second roundtrip
    // and re-ran dispatchSubscriptionNotifications on every status flip.
    if (mode === "dashboard") {
      if (data.status === "suspended") {
        router.replace("/suspended");
      } else if (data.status === "banned") {
        router.replace("/login?error=AccountBlocked");
      }
    } else if (mode === "suspended") {
      if (data.status === "active") {
        router.replace("/dashboard");
      } else if (data.status === "banned") {
        router.replace("/login?error=AccountBlocked");
      }
    }
  }, [data, mode, router]);

  return null;
}
