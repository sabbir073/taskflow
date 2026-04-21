"use client";

import { motion } from "framer-motion";
import {
  LayoutGrid,
  Trophy,
  Users,
  ShieldCheck,
  BarChart3,
  BellRing,
} from "lucide-react";

const features = [
  {
    icon: LayoutGrid,
    title: "Multi-Platform Tasks",
    desc: "Create and manage tasks across 10+ social media platforms from a single, unified dashboard.",
    gradient: "from-blue-500 to-cyan-400",
    ring: "ring-blue-200",
    soft: "bg-blue-50",
    text: "text-blue-600",
  },
  {
    icon: Trophy,
    title: "Gamified Experience",
    desc: "Earn points, unlock badges, and climb global leaderboards to stay motivated every single day.",
    gradient: "from-amber-500 to-yellow-400",
    ring: "ring-amber-200",
    soft: "bg-amber-50",
    text: "text-amber-600",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Organize members into groups and assign tasks to entire teams at once — perfect for agencies.",
    gradient: "from-emerald-500 to-green-400",
    ring: "ring-emerald-200",
    soft: "bg-emerald-50",
    text: "text-emerald-600",
  },
  {
    icon: ShieldCheck,
    title: "Proof Verification",
    desc: "Submit screenshots or URLs as proof of completion — every action is reviewed before reward.",
    gradient: "from-pink-500 to-rose-400",
    ring: "ring-pink-200",
    soft: "bg-pink-50",
    text: "text-pink-600",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Track performance with real-time analytics, heatmaps, and exportable CSV / PDF reports.",
    gradient: "from-brand-600 to-accent-500",
    ring: "ring-brand-200",
    soft: "bg-brand-50",
    text: "text-brand-600",
  },
  {
    icon: BellRing,
    title: "Smart Notifications",
    desc: "Stay informed with in-app, push and email notifications for every important event.",
    gradient: "from-indigo-500 to-violet-500",
    ring: "ring-indigo-200",
    soft: "bg-indigo-50",
    text: "text-indigo-600",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative overflow-hidden bg-ink-50/50">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-gradient opacity-10 blur-3xl"
      />
      <div className="section-box relative">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">Everything You Need</span>
          <h2 className="heading-lg mt-4">
            Powerful features to{" "}
            <span className="gradient-text">supercharge</span> your campaigns
          </h2>
          <p className="mt-4 text-ink-500">
            Everything you need to run organic growth campaigns — packaged into one
            beautifully simple dashboard.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              whileHover={{ y: -4 }}
              className={`group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-7 shadow-card transition-all hover:${f.ring} hover:ring-2`}
            >
              <div
                className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${f.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`}
              />
              <div
                className={`relative mb-5 inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-lg`}
              >
                <f.icon className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <h3 className="text-lg font-bold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.desc}</p>
              <div
                className={`mt-5 inline-flex items-center gap-1 rounded-full ${f.soft} px-3 py-1 text-xs font-semibold ${f.text}`}
              >
                Included in all plans
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
