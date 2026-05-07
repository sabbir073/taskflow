// Static landing-page content shared between the client FAQ component and
// the server-side home page (used for FAQPage JSON-LD). Lives in /lib so
// it isn't tied to a "use client" module — server components can read it
// directly without crossing the RSC boundary.

export const faqs = [
  {
    q: "Is TaskMOS safe for my social media account?",
    a: "100%. We never ask for your passwords or use shady API tricks. You simply share public links to your posts — and real humans engage with them through their own accounts. Your account stays fully compliant with every platform's terms of service.",
  },
  {
    q: "Are the likes, shares and followers real?",
    a: "Yes. Every engagement comes from a real human creator on TaskMOS who is logged into their own account. Zero bots, zero fake engagement. That's why our results stay permanent and actually boost the algorithm.",
  },
  {
    q: "How fast will I see results?",
    a: "Most campaigns start receiving engagement within 5–15 minutes of submission. A small campaign (100 likes or shares) usually completes the same day. Larger campaigns complete within 24–72 hours.",
  },
  {
    q: "How do points work exactly?",
    a: "You earn points every time you complete a task — for example, sharing another creator's Instagram post earns you 20–50 points. You then spend those points to submit your own tasks: 100 likes might cost 200 points, 50 shares might cost 500 points. It's a balanced two-way exchange.",
  },
  {
    q: "Can I target a specific country or niche?",
    a: "Absolutely. On Pro and Business plans you can filter by country, language, age group, and niche (fitness, fashion, tech, cooking, etc.) so the engagement you receive is genuinely interested in your content.",
  },
  {
    q: "What platforms are supported?",
    a: "Facebook, Instagram, YouTube, TikTok, X (Twitter), LinkedIn, Telegram, Pinterest, and website link clicks. We add new platforms based on user requests — Snapchat and Threads support is coming soon.",
  },
  {
    q: "Can I cancel or get a refund?",
    a: "Yes. All paid plans include a 14-day money-back guarantee. You can cancel any time from your dashboard — no phone calls, no awkward questions.",
  },
  {
    q: "Will my posts really go viral?",
    a: "When real humans share your posts on their personal feeds, their friends and followers see your content — creating a ripple effect. Many of our creators have seen single posts reach 100K–1M+ organic views this way. Results depend on content quality, but TaskMOS gives you the initial push the algorithm needs.",
  },
] as const;
