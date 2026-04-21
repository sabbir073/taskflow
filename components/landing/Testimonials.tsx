"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const reviews = [
  {
    name: "Arif Hossain",
    role: "YouTube Creator · 240K subs",
    avatar: "/landing/avatars/t1.jpg",
    rating: 5,
    quote:
      "I stopped buying ads three months ago. With TaskFlow my videos started getting real shares from real viewers — watch time tripled, and the YouTube algorithm finally started recommending me.",
  },
  {
    name: "Sadia Rahman",
    role: "Fashion Influencer",
    avatar: "/landing/avatars/t2.jpg",
    rating: 5,
    quote:
      "My Instagram reels were stuck at 500 views. After 2 weeks of TaskFlow campaigns, one reel hit 180K views organically. The shares from real users made it go viral.",
  },
  {
    name: "Rakib Ahmed",
    role: "Small Business Owner",
    avatar: "/landing/avatars/t3.jpg",
    rating: 5,
    quote:
      "We use TaskFlow to promote our product launches. Traffic to our store jumped 3x in the first month — and every click is from a real person, not a bot.",
  },
  {
    name: "Nusrat Jahan",
    role: "TikTok Creator",
    avatar: "/landing/avatars/t4.jpg",
    rating: 5,
    quote:
      "The niche targeting is unreal. I only get engagement from people in my niche, so my account grew genuinely — 15K new followers in 6 weeks.",
  },
  {
    name: "Tanvir Islam",
    role: "Digital Marketing Agency",
    avatar: "/landing/avatars/t5.jpg",
    rating: 5,
    quote:
      "We manage 8 client accounts with the Business plan. TaskFlow replaced $2,000 of monthly ad spend for our clients — same results at a fraction of the cost.",
  },
  {
    name: "Mehedi Hasan",
    role: "Podcast Host",
    avatar: "/landing/avatars/t6.jpg",
    rating: 5,
    quote:
      "I was skeptical at first. Then I got real Telegram shares, real Twitter retweets, real comments. These aren't bots — these are actual humans who became my listeners.",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-ink-50/60">
      <div className="section-box">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">Testimonials</span>
          <h2 className="heading-lg mt-4">
            Loved by{" "}
            <span className="gradient-text">12,000+ creators</span> worldwide
          </h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-5 w-5 fill-yellow-400 text-yellow-400"
              />
            ))}
            <span className="ml-2 text-sm font-semibold text-ink-700">
              4.9 out of 5 on Trustpilot
            </span>
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <motion.figure
              key={r.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className="card flex h-full flex-col p-6"
            >
              <Quote className="h-6 w-6 text-brand-300" />
              <div className="mt-3 flex items-center gap-1">
                {[...Array(r.rating)].map((_, k) => (
                  <Star
                    key={k}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.avatar}
                  alt={r.name}
                  className="inline-block h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-ink-900">
                    {r.name}
                  </div>
                  <div className="text-xs text-ink-500">{r.role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
