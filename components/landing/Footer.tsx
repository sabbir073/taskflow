"use client";

import { Send } from "lucide-react";
import type { SVGProps } from "react";
import Logo from "./Logo";

// lucide-react deprecated the brand glyphs; inline the ones we need so the
// footer's social row stays visually consistent with Platforms.tsx.
type IconProps = SVGProps<SVGSVGElement>;
const Facebook = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" /></svg>
);
const Instagram = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.2c3.2 0 3.58 0 4.85.07 1.17.06 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.36 1.06.42 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.06 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.36-2.23.42-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.06-1.8-.25-2.23-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.17-.42-.36-1.06-.42-2.23C2.2 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.06-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.36 2.23-.42C8.42 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5 0-4.74.07-1 .04-1.54.21-1.9.35-.48.18-.82.4-1.18.76-.36.36-.58.7-.76 1.18-.14.36-.31.9-.35 1.9-.07 1.24-.07 1.59-.07 4.74s0 3.5.07 4.74c.04 1 .21 1.54.35 1.9.18.48.4.82.76 1.18.36.36.7.58 1.18.76.36.14.9.31 1.9.35C8.5 20.2 8.85 20.2 12 20.2s3.5 0 4.74-.07c1-.04 1.54-.21 1.9-.35.48-.18.82-.4 1.18-.76.36-.36.58-.7.76-1.18.14-.36.31-.9.35-1.9.07-1.24.07-1.59.07-4.74s0-3.5-.07-4.74c-.04-1-.21-1.54-.35-1.9a3.2 3.2 0 0 0-.76-1.18 3.2 3.2 0 0 0-1.18-.76c-.36-.14-.9-.31-1.9-.35C15.5 4 15.15 4 12 4Zm0 3.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 1.8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5-2.2a1.12 1.12 0 1 1 0 2.25 1.12 1.12 0 0 1 0-2.25Z" /></svg>
);
const Youtube = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.13C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.47A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.13C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.47a3 3 0 0 0 2.1-2.13C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.75 15.55V8.45L15.9 12l-6.15 3.55Z" /></svg>
);
const Twitter = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.82-5.965 6.82H1.68l7.73-8.838L1.254 2.25H8.08l4.713 6.23 5.45-6.23Zm-1.16 17.52h1.833L7.084 4.126H5.117L17.084 19.77Z" /></svg>
);
const Linkedin = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M4.98 3.5A2.5 2.5 0 1 1 4.98 8.5a2.5 2.5 0 0 1 0-5Zm.02 5.5H2.5v12H5V9Zm4 0h2.4v1.64h.03c.34-.64 1.18-1.32 2.43-1.32 2.6 0 3.07 1.7 3.07 3.93V21H14.5v-5.3c0-1.26-.02-2.88-1.75-2.88-1.76 0-2.03 1.37-2.03 2.8V21H8.25V9Z" /></svg>
);

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Platforms", href: "#platforms" },
      { label: "How it works", href: "#how" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Testimonials", href: "#testimonials" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Help Center", href: "/help" },
      { label: "Community", href: "/community" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Refund Policy", href: "/refund" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

const socials = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Send, href: "#", label: "Telegram" },
];

export default function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-50/50">
      <div className="container-box py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-500">
              The world&apos;s smartest organic social media growth and content
              exchange platform. Real creators, real engagement, real viral
              reach.
            </p>

            <div className="mt-5 flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 bg-white text-ink-700 transition-all hover:border-brand-300 hover:text-brand-700"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {columns.map((c) => (
              <div key={c.title}>
                <h4 className="text-sm font-semibold text-ink-900">
                  {c.title}
                </h4>
                <ul className="mt-4 space-y-3">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-sm text-ink-500 transition-colors hover:text-brand-700"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-ink-200 pt-6 sm:flex-row">
          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} TaskFlow. All rights reserved.
          </p>
          <p className="text-xs text-ink-500">
            Built with love for creators worldwide ✦
          </p>
        </div>
      </div>
    </footer>
  );
}
