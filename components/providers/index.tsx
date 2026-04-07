"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "./session-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { HeroUIAppProvider } from "./heroui-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ThemeProvider>
          <HeroUIAppProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                duration: 4000,
              }}
            />
          </HeroUIAppProvider>
        </ThemeProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
