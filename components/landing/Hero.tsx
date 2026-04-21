"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Star, Users, ShieldCheck, Sparkles } from "lucide-react";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Hero() {
  return (
    <section className="relative overflow-hidden hero-bg">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <motion.div
        aria-hidden
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" as const }}
        className="pointer-events-none absolute left-[-4rem] top-24 h-40 w-40 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 opacity-30 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, 18, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" as const }}
        className="pointer-events-none absolute right-[-3rem] top-40 h-48 w-48 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 opacity-25 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, 15, 0], y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" as const }}
        className="pointer-events-none absolute bottom-10 left-1/3 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 blur-3xl"
      />
      <div className="container-box relative pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pt-44 lg:pb-32">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={item} className="flex justify-center">
            <span className="section-label">
              <Sparkles className="h-3.5 w-3.5" />
              100% Organic Social Media Growth
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="heading-xl mt-6 text-balance"
          >
            Your Content Deserves to Go{" "}
            <span className="gradient-text">Viral — Organically.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-500 sm:text-xl"
          >
            TaskFlow connects creators worldwide to exchange real engagement.
            Earn points by liking, sharing and following other creators — then
            spend those points to get{" "}
            <span className="font-semibold text-ink-800">
              real humans sharing your posts
            </span>{" "}
            on their feeds. No ads. No bots. Just real organic reach that
            actually goes viral.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <a href="/register" className="btn-primary w-full sm:w-auto">
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#how" className="btn-secondary w-full sm:w-auto">
              <Play className="h-4 w-4" />
              See How It Works
            </a>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {["/landing/avatars/1.jpg", "/landing/avatars/2.jpg", "/landing/avatars/3.jpg", "/landing/avatars/4.jpg"].map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="inline-block h-8 w-8 rounded-full border-2 border-white object-cover"
                  />
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                  <span className="ml-1 text-sm font-semibold text-ink-800">
                    4.9/5
                  </span>
                </div>
                <p className="text-xs text-ink-500">
                  from 12,000+ happy creators
                </p>
              </div>
            </div>

            <div className="hidden h-8 w-px bg-ink-200 sm:block" />

            <div className="flex items-center gap-6 text-sm text-ink-600">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-600" />
                <strong className="text-ink-900">120K+</strong> creators
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <strong className="text-ink-900">Safe</strong> &amp; secure
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={item}
            className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-2"
          >
            <span className="pill">✓ No credit card required</span>
            <span className="pill">✓ Points on every task</span>
            <span className="pill">✓ Cancel anytime</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
