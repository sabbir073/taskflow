import dynamic from "next/dynamic";
import { getPlans } from "@/lib/actions/plans";
import Hero from "@/components/landing/Hero";
import Platforms from "@/components/landing/Platforms";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Benefits from "@/components/landing/Benefits";
import Pricing from "@/components/landing/Pricing";

// Above-the-fold sections (Hero, Platforms, HowItWorks, Features, Benefits,
// Pricing) are bundled immediately so the first paint is complete. Everything
// below the fold is dynamic-imported — same SSR output, but the JS chunks
// arrive lazily as the user scrolls, shrinking the initial JS payload.
const Testimonials = dynamic(() => import("@/components/landing/Testimonials"));
const FAQ = dynamic(() => import("@/components/landing/FAQ"));
const About = dynamic(() => import("@/components/landing/About"));
const CTA = dynamic(() => import("@/components/landing/CTA"));
const Contact = dynamic(() => import("@/components/landing/Contact"));

export default async function HomePage() {
  // Pre-fetch plans on the server so the Pricing section renders instantly —
  // no client-side loading skeleton. TanStack Query still refreshes in the
  // background so admin edits propagate within 2 minutes.
  const plans = await getPlans();

  return (
    <>
      <Hero />
      <Platforms />
      <HowItWorks />
      <Features />
      <Benefits />
      <Pricing initialPlans={plans} />
      <Testimonials />
      <FAQ />
      <About />
      <CTA />
      <Contact />
    </>
  );
}
