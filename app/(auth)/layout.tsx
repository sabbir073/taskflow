import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-t from-accent/10 to-transparent rounded-full blur-3xl" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Logo href="/" size="lg" />
          </div>
          <p className="text-muted-foreground text-sm">
            Social Media Task Exchange Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
