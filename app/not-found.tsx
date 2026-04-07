import Link from "next/link";
import { Btn } from "@/components/ui";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard"><Btn><Home className="w-4 h-4 mr-2" /> Go to Dashboard</Btn></Link>
      </div>
    </div>
  );
}
