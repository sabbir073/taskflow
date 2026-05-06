"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { faqs } from "@/lib/landing-content";

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="section-box">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="section-label">FAQ</span>
          <h2 className="heading-lg mt-4">
            Questions? <span className="gradient-text">We&apos;ve got answers.</span>
          </h2>
          <p className="mt-4 text-ink-500">
            Everything you need to know before creating your free account.
          </p>
        </div>

        <div className="mt-12 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-ink-50/60"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-ink-900">
                    {f.q}
                  </span>
                  <span
                    className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-ink-200 transition-colors ${
                      isOpen ? "bg-brand-gradient text-white" : "bg-white text-ink-700"
                    }`}
                  >
                    {isOpen ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-sm leading-relaxed text-ink-600">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
