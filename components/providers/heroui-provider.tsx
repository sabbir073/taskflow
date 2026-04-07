"use client";

import type { ReactNode } from "react";

// HeroUI v3 doesn't require a global provider - components work standalone.
// This wrapper exists for future extensibility (e.g., global theme overrides).
export function HeroUIAppProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
