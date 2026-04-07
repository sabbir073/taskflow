"use client";

import { Btn } from "@/components/ui";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6 max-w-md">An unexpected error occurred. Please try again.</p>
        <Btn onClick={reset}><RefreshCw className="w-4 h-4 mr-2" /> Try Again</Btn>
      </div>
    </div>
  );
}
