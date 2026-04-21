"use client";

import { motion } from "framer-motion";
import { Users, CheckCircle2, Activity, Headphones } from "lucide-react";

const stats = [
  {
    icon: Users,
    label: "Active Users",
    value: "10K+",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: CheckCircle2,
    label: "Tasks Completed",
    value: "500K+",
    gradient: "from-emerald-500 to-green-400",
  },
  {
    icon: Activity,
    label: "Uptime",
    value: "99.9%",
    gradient: "from-amber-500 to-orange-400",
  },
  {
    icon: Headphones,
    label: "Support",
    value: "24/7",
    gradient: "from-brand-600 to-accent-500",
  },
];

export default function About() {
  return (
    <section id="about" className="bg-ink-50/60">
      <div className="section-box">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <span className="section-label">About TaskFlow</span>
            <h2 className="heading-lg mt-4">
              Built by creators.{" "}
              <span className="gradient-text">For creators.</span>
            </h2>
            <p className="mt-5 text-ink-600">
              TaskFlow was founded in 2023 by a team of creators who were tired
              of paying thousands for ads that delivered fake engagement — and
              getting nowhere with the algorithm.
            </p>
            <p className="mt-4 text-ink-600">
              We built a community where creators help creators. Instead of
              wasting budgets on ads and bots, you exchange real engagement with
              other humans who care about growing too. The result? Permanent,
              algorithm-friendly growth that compounds every month.
            </p>
            <p className="mt-4 text-ink-600">
              Today, more than <strong className="text-ink-900">10,000 creators</strong>{" "}
              around the world use TaskFlow to grow their audience, launch
              products, and turn ordinary posts into viral moments.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  whileHover={{ y: -4 }}
                  className="relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition-shadow hover:shadow-soft"
                >
                  <div
                    className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.gradient} opacity-20 blur-xl`}
                  />
                  <div
                    className={`relative inline-grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow`}
                  >
                    <s.icon className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div className="relative mt-3 text-2xl font-extrabold text-ink-900">
                    {s.value}
                  </div>
                  <div className="relative text-xs font-medium text-ink-500">
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <div className="card overflow-hidden p-8 sm:p-10">
              <h3 className="text-xl font-bold text-ink-900">Our Mission</h3>
              <p className="mt-3 text-ink-600">
                To give every creator — from the first-time poster to the
                seasoned influencer — a fair shot at going viral without
                relying on ad budgets or shady growth hacks.
              </p>

              <div className="mt-6 space-y-4">
                {[
                  {
                    title: "Real humans only",
                    desc: "Every action is from a verified creator account.",
                  },
                  {
                    title: "Community-first",
                    desc: "The more you help others, the more you grow yourself.",
                  },
                  {
                    title: "Platform-safe",
                    desc: "We follow every social platform's rules to the letter.",
                  },
                  {
                    title: "Transparent growth",
                    desc: "No fake numbers. Every metric is trackable and real.",
                  },
                ].map((v) => (
                  <div key={v.title} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-gradient" />
                    <div>
                      <div className="font-semibold text-ink-900">
                        {v.title}
                      </div>
                      <div className="text-sm text-ink-500">{v.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              aria-hidden
              className="absolute -right-4 -top-4 -z-10 h-40 w-40 rounded-full bg-brand-gradient opacity-20 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-6 -left-6 -z-10 h-44 w-44 rounded-full bg-accent-500 opacity-15 blur-3xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
