"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";

export default function CTA() {
  return (
    <section className="section-box">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-700 via-accent-600 to-orange-500 p-8 text-white shadow-glow sm:p-12 lg:p-16"
      >
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-yellow-300/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.2))]"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Join the movement
          </span>

          <h2 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Ready to Transform Your{" "}
            <span className="bg-gradient-to-r from-yellow-200 via-orange-200 to-pink-200 bg-clip-text text-transparent">
              Social Media Strategy?
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base text-white/90 sm:text-lg">
            Join thousands of teams already using TaskFlow to amplify their
            social media presence — 100% organically, with zero ad spend.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-brand-700 shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl sm:w-auto sm:text-base"
            >
              Start Free Today
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 sm:w-auto sm:text-base"
            >
              See How It Works
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-4 w-4" /> Setup in 30 seconds
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Points on every task
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
