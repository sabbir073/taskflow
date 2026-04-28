"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  ShieldCheck,
  Globe2,
  Gauge,
  Sparkles,
  DollarSign,
  Target,
  Infinity as InfinityIcon,
} from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    title: "Real Algorithm Boost",
    desc: "Every share, like, and comment is from a real human account — so Facebook, Instagram, YouTube, and TikTok reward you with wider reach.",
  },
  {
    icon: Users,
    title: "100% Real Humans",
    desc: "No bots, no fake engagement. Every action on TaskFlow comes from a verified creator, which protects your account and multiplies your organic reach.",
  },
  {
    icon: Globe2,
    title: "Viral Through Real Shares",
    desc: "When real people share your post on their personal feeds, their followers see it too — triggering a viral ripple that no paid ad can replicate.",
  },
  {
    icon: DollarSign,
    title: "$0 Ad Spend",
    desc: "Stop burning money on Meta and Google ads. Earn points by engaging, then spend them to grow. Totally free to start.",
  },
  {
    icon: Target,
    title: "Niche-Targeted Growth",
    desc: "Filter tasks by niche, country, or platform — so the engagement you get is from people who actually care about your content.",
  },
  {
    icon: ShieldCheck,
    title: "Account-Safe Forever",
    desc: "No password sharing. No shady API hacks. TaskFlow uses external sharing links, so your accounts always stay 100% safe and compliant.",
  },
  {
    icon: Gauge,
    title: "Instant Results",
    desc: "See likes, shares and followers arrive within minutes, not weeks. Perfect for launch day or seasonal campaigns.",
  },
  {
    icon: InfinityIcon,
    title: "Unlimited Potential",
    desc: "Run as many campaigns as you want. One post, five posts, fifty — there's no cap on how far your content can travel.",
  },
  {
    icon: Sparkles,
    title: "Built For Every Creator",
    desc: "Whether you're a solo influencer, small business, or agency — TaskFlow scales with you, from first follower to first million.",
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="section-box">
      <div className="mx-auto max-w-2xl text-center">
        <span className="section-label">Why TaskFlow</span>
        <h2 className="heading-lg mt-4">
          The growth hack creators{" "}
          <span className="gradient-text">can&apos;t stop talking about</span>
        </h2>
        <p className="mt-4 text-ink-500">
          Ads run out of budget. Bots get banned. TaskFlow is different — it&apos;s a
          community of creators helping each other win, backed by real engagement
          that stays permanent on your profile.
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
            className="card p-6"
          >
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-500/10 text-brand-600">
                <b.icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-900">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                  {b.desc}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mt-14 overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-brand-600 via-accent-500 to-orange-400 p-6 text-white sm:p-10 lg:p-12"
      >
        <div className="grid items-center gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold sm:text-3xl">
              Your post. Real humans. Viral reach.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
              When you promote a post on TaskFlow, real creators share it on
              their own Facebook, Instagram, Twitter, LinkedIn, and Telegram
              feeds — exposing you to millions of new people who genuinely
              discover your content organically.
            </p>
          </div>
          {/* Stats: 3-column row on mobile + tablet (compact), single column
              vertical only at lg+ where the heading takes 2/3 of the row.
              `min-w-0` lets the inner number truncate gracefully if a future
              admin pushes a 7-digit metric in there. */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1 lg:gap-4">
            <div className="min-w-0 rounded-2xl bg-white/15 p-3 backdrop-blur sm:p-4">
              <div className="text-xl font-extrabold leading-none sm:text-2xl">10K+</div>
              <div className="mt-1 text-[11px] leading-snug text-white/80 sm:text-xs">active users</div>
            </div>
            <div className="min-w-0 rounded-2xl bg-white/15 p-3 backdrop-blur sm:p-4">
              <div className="text-xl font-extrabold leading-none sm:text-2xl">500K+</div>
              <div className="mt-1 text-[11px] leading-snug text-white/80 sm:text-xs">tasks completed</div>
            </div>
            <div className="min-w-0 rounded-2xl bg-white/15 p-3 backdrop-blur sm:p-4">
              <div className="text-xl font-extrabold leading-none sm:text-2xl">99.9%</div>
              <div className="mt-1 text-[11px] leading-snug text-white/80 sm:text-xs">uptime &middot; 24/7</div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
