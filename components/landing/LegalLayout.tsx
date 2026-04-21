import type { ReactNode } from "react";
import Link from "next/link";
import { Scale, ArrowRight } from "lucide-react";

const legalLinks = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund" },
  { label: "Cookie Policy", href: "/cookies" },
];

// Shared chrome for /terms, /privacy, /refund, /cookies.
// Hero with title + last-updated date, the long-form content, and a footer
// row linking to the other legal pages.
export default function LegalLayout({
  title,
  tagline,
  lastUpdated,
  currentHref,
  children,
}: {
  title: string;
  tagline: string;
  lastUpdated: string;
  currentHref: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="relative hero-bg">
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        <div className="container-box relative pt-28 pb-12 sm:pt-36 sm:pb-16 lg:pt-44">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label">
              <Scale className="h-3.5 w-3.5" /> Legal
            </span>
            <h1 className="heading-xl mt-6">{title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">{tagline}</p>
            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-ink-500">
              Last updated · {lastUpdated}
            </p>
          </div>
        </div>
      </section>

      <section className="container-box pb-16 pt-4 sm:pb-20">
        <article
          className={`mx-auto max-w-3xl rounded-3xl border border-ink-100 bg-white p-8 shadow-card sm:p-10 lg:p-12
            [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink-900 [&_h2:first-child]:mt-0
            [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-ink-900
            [&_p]:mt-4 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-ink-600
            [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:leading-relaxed [&_ul]:text-ink-600 [&_ul_li]:mt-1.5
            [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-sm [&_ol]:leading-relaxed [&_ol]:text-ink-600 [&_ol_li]:mt-1.5
            [&_strong]:font-semibold [&_strong]:text-ink-800
            [&_a]:text-brand-700 [&_a]:underline [&_a:hover]:text-brand-800`}
        >
          {children}
        </article>

        {/* Legal nav */}
        <div className="mx-auto mt-10 max-w-3xl">
          <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Related legal documents
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {legalLinks
                .filter((l) => l.href !== currentHref)
                .map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="group flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-medium text-ink-800 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-soft"
                  >
                    <span>{l.label}</span>
                    <ArrowRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </Link>
                ))}
            </div>
            <p className="mt-5 text-xs text-ink-500">
              Questions? Reach us at{" "}
              <a href="mailto:hello@taskflow.io" className="font-medium text-brand-700 underline">
                hello@taskflow.io
              </a>{" "}
              or via the{" "}
              <Link href="/#contact" className="font-medium text-brand-700 underline">
                contact form
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
