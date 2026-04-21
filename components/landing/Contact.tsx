"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { submitContactForm } from "@/lib/actions/contact";

type Status = "idle" | "sending" | "sent" | "error";

export default function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "", // honeypot — bots fill this, humans don't see it
  });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setStatus("sending");
    const res = await submitContactForm(form);
    if (res.success) {
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "", website: "" });
      setTimeout(() => setStatus("idle"), 4000);
    } else {
      setStatus("error");
      setErrorMsg(res.error || "Something went wrong — please try again.");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <section id="contact" className="section-box">
      <div className="mx-auto max-w-2xl text-center">
        <span className="section-label">Get In Touch</span>
        <h2 className="heading-lg mt-4">
          Have questions? <span className="gradient-text">We&apos;re here to help.</span>
        </h2>
        <p className="mt-4 text-ink-500">
          Our team typically replies within 2 hours during business hours.
        </p>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2"
        >
          <div className="card h-full p-8">
            <h3 className="text-xl font-bold text-ink-900">Contact Info</h3>
            <p className="mt-2 text-sm text-ink-500">
              Reach out via your favorite channel — we&apos;re always listening.
            </p>

            <ul className="mt-6 space-y-5">
              <li className="flex items-start gap-4">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink-900">Email</div>
                  <a
                    href="mailto:hello@taskflow.io"
                    className="text-sm text-ink-600 hover:text-brand-700"
                  >
                    hello@taskflow.io
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink-900">Phone</div>
                  <a
                    href="tel:+8801700000000"
                    className="text-sm text-ink-600 hover:text-brand-700"
                  >
                    +880 1700-000000
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink-900">
                    Office
                  </div>
                  <p className="text-sm text-ink-600">
                    Level 5, Gulshan Avenue,
                    <br />
                    Dhaka 1212, Bangladesh
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink-900">
                    Support Hours
                  </div>
                  <p className="text-sm text-ink-600">
                    Mon – Sat: 9:00 AM – 9:00 PM
                    <br />
                    Live chat: 24/7
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-3"
        >
          <form onSubmit={onSubmit} className="card relative p-8">
            <h3 className="text-xl font-bold text-ink-900">Send us a message</h3>
            <p className="mt-2 text-sm text-ink-500">
              Fill out the form and we&apos;ll get back to you shortly.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Your Name"
                name="name"
                type="text"
                value={form.name}
                onChange={onChange}
                required
                placeholder="Jane Doe"
              />
              <Field
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                required
                placeholder="jane@example.com"
              />
            </div>

            <div className="mt-4">
              <Field
                label="Subject"
                name="subject"
                type="text"
                value={form.subject}
                onChange={onChange}
                required
                placeholder="How can we help?"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-ink-800">
                Message
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={onChange}
                required
                rows={5}
                placeholder="Tell us a bit about your goals..."
                className="w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 shadow-sm outline-none transition-colors focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Honeypot — off-screen so humans never see/tab to it.
                Bots that blindly fill all fields get silently rejected. */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={onChange}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[10000px] h-0 w-0 opacity-0"
            />

            {errorMsg && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-500">
                By submitting, you agree to our privacy policy. We&apos;ll never
                spam you.
              </p>
              <button
                type="submit"
                disabled={status === "sending"}
                className="btn-primary w-full sm:w-auto"
              >
                {status === "sending" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {status === "sent" && <CheckCircle2 className="h-4 w-4" />}
                {status === "idle" && <Send className="h-4 w-4" />}
                {status === "error" && <Send className="h-4 w-4" />}
                {status === "sending"
                  ? "Sending…"
                  : status === "sent"
                    ? "Message Sent!"
                    : "Send Message"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-800">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 shadow-sm outline-none transition-colors focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      />
    </div>
  );
}
