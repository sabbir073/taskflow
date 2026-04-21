"use client";

import { motion } from "framer-motion";
import { UserPlus, CheckSquare, Coins, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "1. Sign up in 30 seconds",
    desc: "Create your free TaskFlow account. No credit card needed. Get 500 starter points just for joining.",
  },
  {
    icon: CheckSquare,
    title: "2. Complete easy tasks",
    desc: "Like, share, follow, or comment on other creators' posts. Each task takes 10–30 seconds. Do as many as you want.",
  },
  {
    icon: Coins,
    title: "3. Earn points instantly",
    desc: "Get points credited to your account the moment you complete a task. Watch your balance grow in real time.",
  },
  {
    icon: Rocket,
    title: "4. Promote & go viral",
    desc: "Spend points to get real humans sharing, liking and following YOUR content — so it explodes organically.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="section-box">
      <div className="mx-auto max-w-2xl text-center">
        <span className="section-label">How It Works</span>
        <h2 className="heading-lg mt-4">
          Grow in 4 simple steps — <span className="gradient-text">zero ad spend</span>
        </h2>
        <p className="mt-4 text-ink-500">
          TaskFlow is a two-way exchange: you help real creators, they help you.
          No fake followers. No bots. Just genuine humans engaging with real
          content.
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="card relative p-6"
          >
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <s.icon className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <h3 className="text-lg font-bold text-ink-900">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <a href="#pricing" className="btn-primary">
          Start Earning Free Points
        </a>
      </div>
    </section>
  );
}
