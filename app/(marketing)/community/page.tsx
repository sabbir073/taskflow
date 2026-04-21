import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  MessageCircle,
  Heart,
  Sparkles,
  ArrowRight,
  Trophy,
  Zap,
  Globe,
  ShieldCheck,
  HandHeart,
} from "lucide-react";
import type { SVGProps } from "react";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Join the TaskFlow community — where creators, marketers and small-business owners swap engagement and grow together.",
};

// Lucide removed the brand glyphs; inline a few so the channel cards look
// identical to the ones on the landing page.
type IconProps = SVGProps<SVGSVGElement>;
const Facebook = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" /></svg>
);
const Youtube = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.13C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.47A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.13C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.47a3 3 0 0 0 2.1-2.13C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.75 15.55V8.45L15.9 12l-6.15 3.55Z" /></svg>
);
const Telegram = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M20.66 3.72 2.8 10.6c-1.22.49-1.21 1.17-.22 1.47l4.58 1.43 10.6-6.68c.5-.3.96-.14.58.2L9.7 14.92h-.002l.002.003-.32 4.7c.48 0 .69-.22.96-.49l2.3-2.24 4.78 3.53c.88.49 1.51.24 1.73-.82l3.13-14.77c.32-1.3-.49-1.88-1.33-1.54z" /></svg>
);
const Discord = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.73 19.73 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
);

// Channel links — replace the href placeholders when real accounts exist.
const channels = [
  {
    name: "Telegram",
    description: "Fastest channel for announcements, Q&A, and community banter.",
    href: "#",
    icon: Telegram,
    bg: "bg-[#0088cc]/10",
    text: "text-[#0088cc]",
    accent: "from-[#0088cc] to-[#005fa3]",
    members: "8,400+ members",
  },
  {
    name: "Discord",
    description: "Voice chat, creator hangouts, and live campaign support.",
    href: "#",
    icon: Discord,
    bg: "bg-[#5865F2]/10",
    text: "text-[#5865F2]",
    accent: "from-[#5865F2] to-[#4752c4]",
    members: "3,200+ members",
  },
  {
    name: "Facebook Group",
    description: "Share wins, ask questions, and meet other creators from your region.",
    href: "#",
    icon: Facebook,
    bg: "bg-[#1877F2]/10",
    text: "text-[#1877F2]",
    accent: "from-[#1877F2] to-[#0d5ac1]",
    members: "12,000+ members",
  },
  {
    name: "YouTube",
    description: "Tutorials, success stories, and weekly growth walkthroughs.",
    href: "#",
    icon: Youtube,
    bg: "bg-[#FF0000]/10",
    text: "text-[#FF0000]",
    accent: "from-[#FF0000] to-[#cc0000]",
    members: "Subscribe for weekly drops",
  },
];

const guidelines = [
  {
    icon: HandHeart,
    title: "Engage genuinely",
    desc: "Real likes, real shares, real comments. Dropped engagement hurts everyone's reach.",
  },
  {
    icon: ShieldCheck,
    title: "Be kind & respectful",
    desc: "We're all here to grow. No spam, no harassment, no hate — zero tolerance.",
  },
  {
    icon: Globe,
    title: "Stay on-platform",
    desc: "Keep disputes inside TaskFlow or the official channels. Don't DM harass fellow creators.",
  },
  {
    icon: Zap,
    title: "Share wins",
    desc: "Post your milestones in #spotlight — celebrating each other is half the point.",
  },
];

const highlights = [
  { label: "Active creators", value: "12,000+", icon: Users },
  { label: "Posts promoted", value: "340K", icon: Sparkles },
  { label: "Likes exchanged", value: "1.8M", icon: Heart },
  { label: "Top reach record", value: "2.4M", icon: Trophy },
];

export default function CommunityPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative hero-bg">
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        <div className="container-box relative pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-44">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label">
              <Users className="h-3.5 w-3.5" /> Community
            </span>
            <h1 className="heading-xl mt-6">
              Grow <span className="gradient-text">together</span>, not alone.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
              TaskFlow is more than software — it&apos;s a network of 12,000+ creators, marketers and business owners who exchange engagement every day.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#channels" className="btn-primary">
                Join a channel <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/#contact" className="btn-secondary">
                Share your success story
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {highlights.map((h) => (
              <div key={h.label} className="card p-5 text-center">
                <h.icon className="mx-auto h-5 w-5 text-brand-600" />
                <div className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">
                  {h.value}
                </div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-500">
                  {h.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Channels */}
      <section id="channels" className="section-box">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">Channels</span>
          <h2 className="heading-lg mt-4">
            Find us where <span className="gradient-text">you already hang out</span>
          </h2>
          <p className="mt-4 text-ink-500">
            Pick your favourite — you&apos;ll find the same welcoming community everywhere.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {channels.map((c) => (
            <a
              key={c.name}
              href={c.href}
              target={c.href === "#" ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="card group relative flex items-start gap-4 p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
            >
              <div
                className={`grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl ${c.bg} ${c.text} transition-transform group-hover:scale-110`}
              >
                <c.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-ink-900">{c.name}</h3>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                    {c.members}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-500">{c.description}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                  Join now <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Guidelines */}
      <section className="relative overflow-hidden bg-ink-50/60">
        <div className="section-box">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-label">Community Guidelines</span>
            <h2 className="heading-lg mt-4">
              A few <span className="gradient-text">ground rules</span>
            </h2>
            <p className="mt-4 text-ink-500">
              Short list. Easy to follow. Protects everyone&apos;s reach.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {guidelines.map((g) => (
              <div key={g.title} className="card p-6">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                  <g.icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-ink-900">{g.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Share CTA */}
      <section className="section-box">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-700 via-accent-500 to-orange-500 p-8 text-white shadow-glow sm:p-12">
          <div aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-yellow-300/20 blur-3xl" />

          <div className="relative mx-auto max-w-2xl text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-white/80" />
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Got a growth story?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/90">
              We feature real results on our channels and socials every week. Tell us how TaskFlow helped you go viral.
            </p>
            <Link
              href="/#contact"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Share your story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
