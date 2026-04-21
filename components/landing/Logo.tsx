"use client";

import { usePathname } from "next/navigation";
import { Logo as SharedLogo } from "@/components/shared/logo";

export default function Logo({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const onLanding = pathname === "/";

  // On the landing page the logo smooth-scrolls to the top. From any other
  // public page (/help, /community, /status, /terms, etc.) it navigates
  // back to the home route — which was the bug: we always prevented default
  // and scrolled, so the logo never "went home".
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (onLanding) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Otherwise let the default <a href="/"> navigation run.
  }

  return <SharedLogo href="/" onClick={handleClick} compact={compact} />;
}
