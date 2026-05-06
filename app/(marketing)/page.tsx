import dynamic from "next/dynamic";
import { getPlans } from "@/lib/actions/plans";
import Hero from "@/components/landing/Hero";
import Platforms from "@/components/landing/Platforms";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Benefits from "@/components/landing/Benefits";
import Pricing from "@/components/landing/Pricing";
import { faqs } from "@/lib/landing-content";

// Above-the-fold sections (Hero, Platforms, HowItWorks, Features, Benefits,
// Pricing) are bundled immediately so the first paint is complete. Everything
// below the fold is dynamic-imported — same SSR output, but the JS chunks
// arrive lazily as the user scrolls, shrinking the initial JS payload.
const Testimonials = dynamic(() => import("@/components/landing/Testimonials"));
const FAQ = dynamic(() => import("@/components/landing/FAQ"));
const About = dynamic(() => import("@/components/landing/About"));
const CTA = dynamic(() => import("@/components/landing/CTA"));
const Contact = dynamic(() => import("@/components/landing/Contact"));

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://taskflow.app";

// SoftwareApplication + FAQPage JSON-LD. SoftwareApplication can earn a
// rich result with name, rating + offers; FAQPage seeds the
// "People also ask" / FAQ rich result on branded queries. Both
// data sources reuse content already on the page — no duplication risk.
function homeJsonLd(): string {
  const blocks = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "TaskFlow",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Organic social media growth and content exchange platform — earn points by engaging with real creators, then spend them to make your own posts go viral.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "12000",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
  return JSON.stringify(blocks).replace(/</g, "\\u003c");
}

export default async function HomePage() {
  // Pre-fetch plans on the server so the Pricing section renders instantly —
  // no client-side loading skeleton. TanStack Query still refreshes in the
  // background so admin edits propagate within 2 minutes.
  const plans = await getPlans();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: homeJsonLd() }}
      />
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
