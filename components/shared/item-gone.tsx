import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { Archive, ArrowLeft } from "lucide-react";

// Shown when a task/group/etc. the user followed from a notification no
// longer exists (likely deleted by admin or creator). Friendlier than a
// bare 404 because these links are frequently stale on /notifications.
export function ItemGone({
  kind,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: {
  kind: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted/60 flex items-center justify-center">
            <Archive className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">This {kind} is no longer available</h2>
            <p className="text-sm text-muted-foreground mt-1">
              It may have been deleted. The link in your notification is now stale.
            </p>
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
