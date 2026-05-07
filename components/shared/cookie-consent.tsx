"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { Btn } from "@/components/ui";

const STORAGE_KEY = "cookie-consent";
type Choice = "accepted" | "declined";

// Lightweight consent banner. We don't load any third-party trackers today,
// so this is the baseline disclosure pattern: surface the choice, persist
// it to localStorage, and stay out of the way after a decision.
//
// Mounted once at the root layout. Server-renders nothing; the banner
// appears after hydration if no preference is stored. Pages still render
// fully behind the banner — it's fixed-bottom and doesn't capture focus.
export function CookieConsent() {
  const [choice, setChoice] = useState<Choice | null | "loading">("loading");

  // Hydrate from localStorage on mount. The lint rule warns about
  // synchronous setState in effects, but this is the canonical pattern for
  // "read browser-only state on mount" — we deliberately render nothing on
  // the server, then resolve the choice client-side.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChoice(stored === "accepted" || stored === "declined" ? stored : null);
    } catch {
      setChoice(null);
    }
  }, []);

  if (choice === "loading" || choice === "accepted" || choice === "declined") {
    return null;
  }

  function persist(value: Choice) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    setChoice(value);
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-primary/10 items-center justify-center">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">We use cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              TaskMOS uses essential cookies to keep you signed in. We don&apos;t use ad or tracking cookies.{" "}
              <Link href="/cookies" className="text-primary hover:underline font-medium">
                Learn more about our cookie policy
              </Link>
              .
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Btn size="sm" onClick={() => persist("accepted")}>Accept</Btn>
              <Btn size="sm" variant="outline" onClick={() => persist("declined")}>Decline</Btn>
            </div>
          </div>
          <button
            type="button"
            onClick={() => persist("declined")}
            aria-label="Dismiss cookie banner"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
