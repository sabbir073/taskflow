import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play, Star, Users, ShieldCheck, Sparkles } from "lucide-react";

// Hero is intentionally a server component now: framer-motion entrance
// animations on the lead heading + paragraph were gating LCP (the <p>
// rendered with opacity:0 at SSR until JS hydrated framer-motion ~2.5s
// later, costing 9 mobile-perf points). Static SSR markup paints the
// LCP element at first paint instead.
//
// The decorative floating-blob animations moved into globals.css as
// pure CSS keyframes — same visual, no JS gating.
export default function Hero() {
  return (
    <section className="relative overflow-hidden hero-bg">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-4rem] top-24 h-40 w-40 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 opacity-30 blur-3xl animate-hero-float-a"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-3rem] top-40 h-48 w-48 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 opacity-25 blur-3xl animate-hero-float-b"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-1/3 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 blur-3xl animate-hero-float-c"
      />
      <div className="container-box relative pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pt-44 lg:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex justify-center">
            <span className="section-label">
              <Sparkles className="h-3.5 w-3.5" />
              100% Organic Social Media Growth
            </span>
          </div>

          <h1 className="heading-xl mt-6 text-balance">
            Your Content Deserves to Go{" "}
            <span className="gradient-text">Viral — Organically.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-500 sm:text-xl">
            TaskMOS connects creators worldwide to exchange real engagement.
            Earn points by liking, sharing and following other creators — then
            spend those points to get{" "}
            <span className="font-semibold text-ink-800">
              real humans sharing your posts
            </span>{" "}
            on their feeds. No ads. No bots. Just real organic reach that
            actually goes viral.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" prefetch className="btn-primary w-full sm:w-auto">
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how" className="btn-secondary w-full sm:w-auto">
              <Play className="h-4 w-4" />
              See How It Works
            </a>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {["/landing/avatars/1.jpg", "/landing/avatars/2.jpg", "/landing/avatars/3.jpg", "/landing/avatars/4.jpg"].map((src) => (
                  <Image
                    key={src}
                    src={src}
                    alt=""
                    width={32}
                    height={32}
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
          </div>

          <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-2">
            <span className="pill">✓ No credit card required</span>
            <span className="pill">✓ Points on every task</span>
            <span className="pill">✓ Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  );
}
