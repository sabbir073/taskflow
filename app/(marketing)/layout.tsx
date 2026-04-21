import type { ReactNode } from "react";
import { PopupDisplay } from "@/components/shared/popup-display";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

// Shared chrome for every public marketing page: landing, /help, /community,
// /status. Each page only needs to render its own content; the fixed navbar,
// admin-managed website popup, and footer come from here.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative overflow-hidden bg-white text-ink-900">
      <PopupDisplay target="website" />
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}
