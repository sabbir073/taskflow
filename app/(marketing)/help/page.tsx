import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Coins,
  ListTodo,
  CreditCard,
  Shield,
  LifeBuoy,
  ArrowRight,
  HelpCircle,
  Search,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Answers to the most common TaskFlow questions — getting started, earning points, running promotions, billing, account security and more.",
};

// ============================================================================
// Help content — static. Edit in place when articles need updating; no DB.
// ============================================================================

type QA = { q: string; a: string };
type Category = {
  id: string;
  icon: typeof BookOpen;
  title: string;
  blurb: string;
  accent: string;
  items: QA[];
};

const categories: Category[] = [
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    blurb: "New to TaskFlow? Start here.",
    accent: "from-blue-500 to-cyan-400",
    items: [
      {
        q: "What is TaskFlow?",
        a: "TaskFlow is a social-media content-exchange platform. You earn points by engaging with real creators (liking, sharing, following) and spend those points to get real humans engaging with YOUR posts — no bots, no ads, just organic reach.",
      },
      {
        q: "How do I create an account?",
        a: "Click Start Free in the top right, enter your name, email and a password. If the admin has enabled email verification you'll get an optional confirmation link — verify any time from your profile page.",
      },
      {
        q: "Is TaskFlow free to use?",
        a: "Yes. The Basic plan is free forever and includes 5 tasks and 3 groups per month. Paid tiers unlock more tasks, priority support and extra credits.",
      },
      {
        q: "Do I need a credit card to sign up?",
        a: "No. Only paid plans require payment, and our payment flow is manual — admin reviews each transaction before activating the subscription.",
      },
      {
        q: "How long does account approval take?",
        a: "If your admin has enabled account approval, most signups are reviewed within 2 hours during business hours (Mon–Sat, 9 AM–9 PM).",
      },
    ],
  },
  {
    id: "earning-points",
    icon: Coins,
    title: "Earning Points",
    blurb: "Complete tasks, get credited.",
    accent: "from-amber-500 to-yellow-400",
    items: [
      {
        q: "How do I earn points?",
        a: "Open the Tasks page and pick any available task. Complete the action (like, share, follow, comment, etc.) on the target platform, then submit proof (URL or screenshot). Points are credited the moment an admin approves your submission.",
      },
      {
        q: "What kinds of proof do I submit?",
        a: "Most tasks require a URL to your engagement or a screenshot. The task card tells you exactly which one. Multiple proofs can be attached per submission.",
      },
      {
        q: "Why was my submission rejected?",
        a: "Common reasons: proof didn't match the task, action was undone, or the proof was unclear. Admin usually adds a reason — check the notification. After 3 rejections on the same task you get a small point penalty, so double-check before submitting.",
      },
      {
        q: "How long until I get paid?",
        a: "Points land in your wallet instantly on approval. You can see every credit in your Points History.",
      },
      {
        q: "Can I lose points?",
        a: "Only if you're penalised for repeated rejections or an admin manually adjusts your balance. Approved tasks are always yours.",
      },
    ],
  },
  {
    id: "creating-tasks",
    icon: ListTodo,
    title: "Creating Tasks",
    blurb: "Run your own promotions.",
    accent: "from-emerald-500 to-green-400",
    items: [
      {
        q: "How do I create a task?",
        a: "Click the New Task button on the Tasks page. Pick a platform, task type (like / share / follow / comment / etc.), paste your content URL, set the budget and per-completion reward, and publish. Your active plan must allow task creation.",
      },
      {
        q: "What is point budget?",
        a: "The total points you're willing to spend. Budget divided by points-per-completion is how many times the task can be completed. Unspent budget is refunded if you delete the task.",
      },
      {
        q: "Can I target a specific group?",
        a: "Yes. Under 'Target', pick a group you've created. Only members of that group will be assigned.",
      },
      {
        q: "Why is my task 'pending approval'?",
        a: "User-created tasks go through a quick admin review before they become visible to assignees. This keeps the platform clean and on-brand.",
      },
      {
        q: "Can I edit a task after publishing?",
        a: "Yes, but editing a live task sends it back for re-approval. The deadline and platform are locked once submissions start coming in.",
      },
    ],
  },
  {
    id: "billing",
    icon: CreditCard,
    title: "Payments & Plans",
    blurb: "Subscribe, upgrade, renew.",
    accent: "from-pink-500 to-rose-400",
    items: [
      {
        q: "How does billing work?",
        a: "All payments are reviewed manually by an admin. Submit your transaction ID through the plan-selection flow; once verified, your plan activates and any included credits land in your wallet.",
      },
      {
        q: "What happens to my unused quota when I upgrade?",
        a: "Leftover task and group quota from your current plan rolls over to the new subscription. Your wallet balance is never touched.",
      },
      {
        q: "Can I switch between Monthly / 6-Month / Yearly billing?",
        a: "Yes, on every new purchase. Longer cycles are discounted — 6 months saves ~15%, yearly saves ~25%.",
      },
      {
        q: "How do I download an invoice?",
        a: "Open Billing → pick the invoice → Download PDF. Every approved payment gets a unique invoice number (INV-YYYY-######).",
      },
      {
        q: "Do you auto-renew?",
        a: "No. Because payments are manual, you'll get an email reminder 7 days and 1 day before expiry. Submit the next payment to continue uninterrupted.",
      },
    ],
  },
  {
    id: "account",
    icon: Shield,
    title: "Account & Security",
    blurb: "Password, verification, privacy.",
    accent: "from-indigo-500 to-violet-500",
    items: [
      {
        q: "How do I change my password?",
        a: "Go to Profile → Change Password. You'll need your current password. Use at least 8 characters with one uppercase, one number and one special character.",
      },
      {
        q: "I forgot my password — what now?",
        a: "On the login page click 'Forgot password?'. We'll email a secure reset link that expires in 1 hour.",
      },
      {
        q: "Should I verify my email?",
        a: "It's optional but recommended. Verified accounts get priority support and faster account recovery if you ever lose access.",
      },
      {
        q: "How do I delete my account?",
        a: "Contact support — admins can anonymise your data on request. Points history and audit records are retained for compliance.",
      },
      {
        q: "What happens if my account is suspended?",
        a: "You can still sign in to see the suspension reason and submit an appeal. Approved appeals restore full access.",
      },
    ],
  },
  {
    id: "troubleshooting",
    icon: LifeBuoy,
    title: "Troubleshooting",
    blurb: "Something not working?",
    accent: "from-orange-500 to-red-500",
    items: [
      {
        q: "I submitted proof but nothing happened.",
        a: "Submissions queue for admin review — it's not instant. Check your notifications; you'll get a ping the moment it's approved or rejected.",
      },
      {
        q: "File upload fails.",
        a: "Allowed types: JPG, PNG, GIF, WEBP, MP4, WEBM. Max size 10 MB. If it still fails, try a different browser or check your connection.",
      },
      {
        q: "I didn't get a verification / reset email.",
        a: "Check spam/promotions. If nothing arrives within 5 minutes, request another from your profile page (3/hr limit).",
      },
      {
        q: "My plan says expired but I just paid.",
        a: "Payments are reviewed manually — activation is usually within a few hours of submission. You'll get an in-app notification the moment it's approved.",
      },
      {
        q: "Something else is broken.",
        a: "Open a support ticket from the dashboard (requires Standard plan or higher), or use the Contact form on the home page. We reply within 2 hours on business days.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative hero-bg">
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        <div className="container-box relative pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-44">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label">
              <HelpCircle className="h-3.5 w-3.5" /> Help Center
            </span>
            <h1 className="heading-xl mt-6">
              How can we <span className="gradient-text">help you?</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
              Browse common questions below, or jump straight to support.
            </p>

            {/* Decorative search (non-functional — visual only) */}
            <div className="mx-auto mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3 shadow-soft">
              <Search className="h-5 w-5 text-ink-400" />
              <input
                type="text"
                placeholder="Search articles… (coming soon)"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
                disabled
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {categories.map((c) => (
                <a key={c.id} href={`#${c.id}`} className="pill hover:border-brand-300 hover:text-brand-700">
                  {c.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section-box">
        <div className="space-y-12">
          {categories.map((cat) => (
            <div key={cat.id} id={cat.id} className="scroll-mt-24">
              <div className="mb-6 flex items-center gap-3">
                <div
                  className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${cat.accent} text-white shadow-lg`}
                >
                  <cat.icon className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-ink-900">{cat.title}</h2>
                  <p className="text-sm text-ink-500">{cat.blurb}</p>
                </div>
              </div>

              <div className="card divide-y divide-ink-100">
                {cat.items.map((item, i) => (
                  <details key={i} className="group px-6 py-4">
                    <summary className="flex cursor-pointer items-start justify-between gap-4 text-sm font-semibold text-ink-900 marker:content-[''] [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-200 text-ink-500 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-ink-600">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still stuck */}
        <div className="mt-16 card overflow-hidden">
          <div className="grid gap-6 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h3 className="heading-md">Didn&apos;t find your answer?</h3>
              <p className="mt-2 text-ink-500">
                Our support team typically replies within 2 hours during business hours.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/#contact" className="btn-primary">
                Contact support <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/community" className="btn-secondary">
                Ask the community
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
