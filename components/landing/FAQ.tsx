"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Is TaskFlow safe for my social media account?",
    a: "100%. We never ask for your passwords or use shady API tricks. You simply share public links to your posts — and real humans engage with them through their own accounts. Your account stays fully compliant with every platform's terms of service.",
  },
  {
    q: "Are the likes, shares and followers real?",
    a: "Yes. Every engagement comes from a real human creator on TaskFlow who is logged into their own account. Zero bots, zero fake engagement. That's why our results stay permanent and actually boost the algorithm.",
  },
  {
    q: "How fast will I see results?",
    a: "Most campaigns start receiving engagement within 5–15 minutes of submission. A small campaign (100 likes or shares) usually completes the same day. Larger campaigns complete within 24–72 hours.",
  },
  {
    q: "How do points work exactly?",
    a: "You earn points every time you complete a task — for example, sharing another creator's Instagram post earns you 20–50 points. You then spend those points to submit your own tasks: 100 likes might cost 200 points, 50 shares might cost 500 points. It's a balanced two-way exchange.",
  },
  {
    q: "Can I target a specific country or niche?",
    a: "Absolutely. On Pro and Business plans you can filter by country, language, age group, and niche (fitness, fashion, tech, cooking, etc.) so the engagement you receive is genuinely interested in your content.",
  },
  {
    q: "What platforms are supported?",
    a: "Facebook, Instagram, YouTube, TikTok, X (Twitter), LinkedIn, Telegram, Pinterest, and website link clicks. We add new platforms based on user requests — Snapchat and Threads support is coming soon.",
  },
  {
    q: "Can I cancel or get a refund?",
    a: "Yes. All paid plans include a 14-day money-back guarantee. You can cancel any time from your dashboard — no phone calls, no awkward questions.",
  },
  {
    q: "Will my posts really go viral?",
    a: "When real humans share your posts on their personal feeds, their friends and followers see your content — creating a ripple effect. Many of our creators have seen single posts reach 100K–1M+ organic views this way. Results depend on content quality, but TaskFlow gives you the initial push the algorithm needs.",
  },
];

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
