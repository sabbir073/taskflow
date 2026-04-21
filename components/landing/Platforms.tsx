"use client";

import { motion } from "framer-motion";
import { Send } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

// lucide-react deprecated the brand glyphs; inline the official-shape SVGs.
const Facebook = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" /></svg>
);
const Instagram = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.2c3.2 0 3.58 0 4.85.07 1.17.06 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.36 1.06.42 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.06 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.36-2.23.42-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.06-1.8-.25-2.23-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.17-.42-.36-1.06-.42-2.23C2.2 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.06-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.36 2.23-.42C8.42 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5 0-4.74.07-1 .04-1.54.21-1.9.35-.48.18-.82.4-1.18.76-.36.36-.58.7-.76 1.18-.14.36-.31.9-.35 1.9-.07 1.24-.07 1.59-.07 4.74s0 3.5.07 4.74c.04 1 .21 1.54.35 1.9.18.48.4.82.76 1.18.36.36.7.58 1.18.76.36.14.9.31 1.9.35C8.5 20.2 8.85 20.2 12 20.2s3.5 0 4.74-.07c1-.04 1.54-.21 1.9-.35.48-.18.82-.4 1.18-.76.36-.36.58-.7.76-1.18.14-.36.31-.9.35-1.9.07-1.24.07-1.59.07-4.74s0-3.5-.07-4.74c-.04-1-.21-1.54-.35-1.9a3.2 3.2 0 0 0-.76-1.18 3.2 3.2 0 0 0-1.18-.76c-.36-.14-.9-.31-1.9-.35C15.5 4 15.15 4 12 4Zm0 3.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 1.8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5-2.2a1.12 1.12 0 1 1 0 2.25 1.12 1.12 0 0 1 0-2.25Z" /></svg>
);
const Youtube = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.13C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.47A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.13C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.47a3 3 0 0 0 2.1-2.13C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.75 15.55V8.45L15.9 12l-6.15 3.55Z" /></svg>
);
const Twitter = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.82-5.965 6.82H1.68l7.73-8.838L1.254 2.25H8.08l4.713 6.23 5.45-6.23Zm-1.16 17.52h1.833L7.084 4.126H5.117L17.084 19.77Z" /></svg>
);
const Linkedin = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M4.98 3.5A2.5 2.5 0 1 1 4.98 8.5a2.5 2.5 0 0 1 0-5Zm.02 5.5H2.5v12H5V9Zm4 0h2.4v1.64h.03c.34-.64 1.18-1.32 2.43-1.32 2.6 0 3.07 1.7 3.07 3.93V21H14.5v-5.3c0-1.26-.02-2.88-1.75-2.88-1.76 0-2.03 1.37-2.03 2.8V21H8.25V9Z" /></svg>
);

const Pinterest = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.223.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.357-.631-2.747-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

const Reddit = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.067 11.683c.028.187.042.378.042.573 0 2.93-3.412 5.305-7.617 5.305-4.205 0-7.617-2.375-7.617-5.305 0-.195.014-.386.042-.573a1.747 1.747 0 1 1 1.935-2.862c1.304-.938 3.099-1.539 5.089-1.606l1.02-4.798a.28.28 0 0 1 .332-.215l3.335.71a1.189 1.189 0 1 1-.122.565l-2.986-.634-.9 4.236c1.95.091 3.705.695 4.98 1.63a1.747 1.747 0 1 1 1.935 2.862l-.468.112zM8.9 13.37a1.263 1.263 0 1 1 2.527 0 1.263 1.263 0 0 1-2.527 0zm6.202 3.568c-.93.927-2.708 1-3.228 1-.523 0-2.3-.073-3.23-1a.352.352 0 0 1 0-.498.352.352 0 0 1 .497 0c.585.585 1.84.793 2.73.793.89 0 2.144-.208 2.73-.793a.352.352 0 1 1 .497.498h.004zm-.207-2.305a1.263 1.263 0 1 1 0-2.527 1.263 1.263 0 0 1 0 2.527z" />
  </svg>
);

const Discord = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.73 19.73 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const TikTok = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
  </svg>
);

const platforms: {
  name: string;
  Icon: ComponentType<IconProps>;
  color: string;
  bg: string;
}[] = [
  { name: "Pinterest", Icon: Pinterest, color: "text-[#E60023]", bg: "bg-[#E60023]/10" },
  { name: "Facebook", Icon: Facebook, color: "text-[#1877F2]", bg: "bg-[#1877F2]/10" },
  { name: "Twitter/X", Icon: Twitter, color: "text-[#0f1419]", bg: "bg-[#0f1419]/10" },
  { name: "Instagram", Icon: Instagram, color: "text-[#E1306C]", bg: "bg-[#E1306C]/10" },
  { name: "YouTube", Icon: Youtube, color: "text-[#FF0000]", bg: "bg-[#FF0000]/10" },
  { name: "LinkedIn", Icon: Linkedin, color: "text-[#0A66C2]", bg: "bg-[#0A66C2]/10" },
  { name: "TikTok", Icon: TikTok, color: "text-black", bg: "bg-black/5" },
  { name: "Reddit", Icon: Reddit, color: "text-[#FF4500]", bg: "bg-[#FF4500]/10" },
  { name: "Discord", Icon: Discord, color: "text-[#5865F2]", bg: "bg-[#5865F2]/10" },
  { name: "Telegram", Icon: Send, color: "text-[#0088cc]", bg: "bg-[#0088cc]/10" },
];

export default function Platforms() {
  return (
    <section
      id="platforms"
      className="relative border-y border-ink-100 bg-gradient-to-br from-brand-50/70 via-white to-accent-500/5"
    >
      <div className="container-box py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">Supported Platforms</span>
          <h2 className="heading-md mt-4">
            Works on <span className="gradient-text">10+ social platforms</span>
          </h2>
          <p className="mt-3 text-ink-500">
            One dashboard. Every major network. Grow everywhere that matters.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5"
        >
          {platforms.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              whileHover={{ y: -3 }}
              className="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-brand-200 hover:shadow-soft"
            >
              <span
                className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${p.bg} ${p.color} transition-transform group-hover:scale-110`}
              >
                <p.Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-ink-800">
                {p.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
