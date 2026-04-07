import Link from "next/link";
import { Btn } from "@/components/ui";
import {
  ArrowRight, Zap, ListTodo, Trophy, Users, ShieldCheck, BarChart3, Bell,
  Star, CheckCircle, Globe,
} from "lucide-react";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";

const features = [
  { icon: ListTodo, title: "Multi-Platform Tasks", desc: "Create and manage tasks across 10+ social media platforms from a single dashboard." },
  { icon: Trophy, title: "Gamified Experience", desc: "Earn points, unlock badges, and climb leaderboards to stay motivated." },
  { icon: Users, title: "Team Collaboration", desc: "Organize members into groups and assign tasks to entire teams at once." },
  { icon: ShieldCheck, title: "Proof Verification", desc: "Submit screenshots or URLs as proof of completion for review." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Track performance with real-time analytics and exportable reports." },
  { icon: Bell, title: "Smart Notifications", desc: "Stay informed with in-app and email notifications for every event." },
];

const pricing = [
  { name: "Starter", price: "Free", period: "forever", desc: "Perfect for small teams", features: ["Up to 10 members", "5 platforms", "Basic analytics", "Email support"], popular: false },
  { name: "Pro", price: "$29", period: "/month", desc: "For growing teams", features: ["Up to 100 members", "All 10 platforms", "Advanced analytics", "Priority support", "Custom branding", "API access"], popular: true },
  { name: "Enterprise", price: "Custom", period: "", desc: "For large organizations", features: ["Unlimited members", "All platforms", "Custom integrations", "Dedicated support", "SLA guarantee", "SSO/SAML"], popular: false },
];

const testimonials = [
  { quote: "TaskFlow transformed how our marketing team coordinates social media campaigns. The gamification aspect keeps everyone motivated.", author: "Sarah Chen", role: "Marketing Director, GrowthCo" },
  { quote: "We saw a 3x increase in social media engagement after implementing TaskFlow. The analytics are incredibly insightful.", author: "Michael Rodriguez", role: "Social Media Manager, BrandSync" },
  { quote: "The proof verification system saves us hours of manual checking. Our team loves the point system and friendly competition.", author: "Emily Watson", role: "Team Lead, DigitalFirst" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center"><span className="text-white font-bold text-sm">T</span></div>
            <span className="font-bold text-xl">TaskFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#platforms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Platforms</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"><Btn variant="ghost" size="sm">Sign In</Btn></Link>
            <Link href="/register"><Btn size="sm">Get Started</Btn></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
            <Zap className="w-4 h-4" /> Trusted by 1000+ Teams Worldwide
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Amplify Your<br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Social Media Presence</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Empower your team with gamified task management, seamless collaboration, and data-driven insights across all major platforms.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register"><Btn size="lg" className="px-8 text-base">Get Started Free <ArrowRight className="w-5 h-5 ml-2" /></Btn></Link>
            <Link href="#features"><Btn variant="outline" size="lg" className="px-8 text-base">Learn More</Btn></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-20 pt-8 border-t border-border/50 max-w-3xl mx-auto">
            {[{ value: "10K+", label: "Active Users" }, { value: "500K+", label: "Tasks Completed" }, { value: "99.9%", label: "Uptime" }, { value: "24/7", label: "Support" }].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="py-16 border-y border-border/50 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-8 font-medium uppercase tracking-wider">Supported Platforms</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {Object.entries(PLATFORM_CONFIG).map(([slug, config]) => (
              <div key={slug} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: config.color }}>
                  {config.name.charAt(0)}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{config.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Powerful features to supercharge your social media campaigns</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="group p-6 rounded-2xl border border-border/50 bg-card hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-lg text-muted-foreground">Choose the plan that fits your team</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map((plan) => (
              <div key={plan.name} className={`relative p-8 rounded-2xl border bg-card ${plan.popular ? "border-primary shadow-xl shadow-primary/10 scale-[1.02]" : "border-border/50"}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-xs font-bold">Most Popular</div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                <div className="mt-6 mb-8">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block">
                  <Btn variant={plan.popular ? "primary" : "outline"} className="w-full">Get Started</Btn>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by Teams</h2>
            <p className="text-lg text-muted-foreground">See what our users have to say</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.author} className="p-6 rounded-2xl border border-border/50 bg-card">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-warning text-warning" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10" />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <Globe className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Transform Your Social Media Strategy?</h2>
          <p className="text-lg text-muted-foreground mb-8">Join thousands of teams already using TaskFlow to amplify their social media presence.</p>
          <Link href="/register"><Btn size="lg" className="px-10 text-base">Start Free Today <ArrowRight className="w-5 h-5 ml-2" /></Btn></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center"><span className="text-white font-bold text-xs">T</span></div>
                <span className="font-bold">TaskFlow</span>
              </div>
              <p className="text-sm text-muted-foreground">Social Media Task Exchange Platform</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TaskFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
