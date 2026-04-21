import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "TaskFlow — Grow Your Social Media 100% Organically",
    template: "%s | TaskFlow",
  },
  description:
    "TaskFlow is the world's smartest organic social media growth and content exchange platform. Earn points by engaging with real creators, then spend points to make your own content go viral — no ads, no bots, just real humans.",
  keywords: [
    "organic social media growth",
    "content exchange platform",
    "social media promotion",
    "get real followers",
    "viral marketing",
    "TaskFlow",
  ],
  openGraph: {
    title: "TaskFlow — Grow Your Social Media 100% Organically",
    description:
      "Exchange real engagement with real creators. Earn points, promote your content, and watch your posts go viral — organically.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
