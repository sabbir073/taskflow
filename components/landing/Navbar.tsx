"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import Logo from "./Logo";

// Section hrefs on the landing page. We rewrite them based on whether the
// user is already on "/" — if not, we prefix with "/" so clicking a nav
// item from /help, /community, /status, /terms, etc. actually goes home
// AND scrolls to the right section.
const sectionLinks = [
  { hash: "#how", label: "How It Works" },
  { hash: "#features", label: "Features" },
  { hash: "#platforms", label: "Platforms" },
  { hash: "#pricing", label: "Pricing" },
  { hash: "#faq", label: "FAQ" },
  { hash: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Build the real href for each section link. On "/" we use a plain hash
  // so the browser smooth-scrolls. From any other page we prefix with "/"
  // so Next routes home and the browser resolves the hash on arrival.
  const links = useMemo(() => {
    const onHome = pathname === "/";
    return sectionLinks.map((l) => ({
      label: l.label,
      href: onHome ? l.hash : `/${l.hash}`,
    }));
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      id="top"
      // Fixed (not sticky) so the navbar overlays the hero instead of
      // pushing it down with a white band. Before any scroll it's fully
      // transparent — the hero's gradient shows straight through. On scroll
      // past 8px it fades to a frosted bar with a subtle bottom border.
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-b border-ink-100 bg-white/75 shadow-soft backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container-box flex h-16 items-center justify-between sm:h-20">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <a href="/login" className="btn-ghost">
            Log in
          </a>
          <a href="/register" className="btn-primary">
            Start Free
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 text-ink-700 lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden"
          >
            <div className="container-box space-y-1 border-t border-ink-100 bg-white/95 py-4 backdrop-blur-md">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <a
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="btn-secondary"
                >
                  Log in
                </a>
                <a
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="btn-primary"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
