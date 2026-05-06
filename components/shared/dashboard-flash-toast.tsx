"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, { kind: "info" | "success" | "warning" | "error"; text: string }> = {
  plansDisabled: {
    kind: "info",
    text: "Subscription plans are currently disabled. Talk to an admin if you need access.",
  },
};

// Tiny client component that surfaces a one-time toast based on a known
// query-param flag, then strips the flag from the URL so a refresh doesn't
// re-fire the message. Mount it once on /dashboard.
export function DashboardFlashToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    for (const key of Object.keys(MESSAGES)) {
      if (searchParams.get(key)) {
        const m = MESSAGES[key];
        fired.current = true;
        toast[m.kind](m.text);
        router.replace("/dashboard");
        break;
      }
    }
  }, [searchParams, router]);

  return null;
}
