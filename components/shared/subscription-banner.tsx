"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, Btn } from "@/components/ui";
import { AlertTriangle, Clock, Zap } from "lucide-react";
import { useAppSettings } from "@/components/providers/settings-provider";
import { useMySubscriptionStatus, useMyQuotaUsage } from "@/hooks/use-plans";

// Shown at the top of the dashboard when the user's subscription is
// expired, expiring soon, or missing entirely. Read-only — view access
// stays; action blocks live in the server actions themselves.
export function SubscriptionBanner() {
  const settings = useAppSettings();
  const subRequired = settings.require_subscription === true;
  const { data: status } = useMySubscriptionStatus();
  const { data: quota } = useMyQuotaUsage();

  // Hook calls stay at the top — early returns must come AFTER all hooks
  const expiresAt = status?.expiresAt || null;
  /* eslint-disable react-hooks/purity */
  const daysLeft = useMemo(
    () => (expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null),
    [expiresAt]
  );
  /* eslint-enable react-hooks/purity */

  if (!subRequired) return null;
  if (!status) return null;

  const { hasActive, isExpired, planName, required } = status;
  if (!required) return null;

  // No subscription at all
  if (!hasActive && !isExpired) {
    return (
      <Card className="mb-6 border-warning/40 bg-warning/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">You don&apos;t have an active subscription</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pick a plan to start creating tasks, groups and submitting proofs.</p>
            </div>
          </div>
          <Link href="/plans"><Btn size="sm">Choose a plan</Btn></Link>
        </CardContent>
      </Card>
    );
  }

  // Expired
  if (isExpired) {
    return (
      <Card className="mb-6 border-error/40 bg-error/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Subscription expired</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {planName ? `${planName} expired.` : "Your subscription has expired."} Renew now to unlock task creation, group creation and proof submission.
              </p>
            </div>
          </div>
          <Link href="/plans"><Btn size="sm" variant="danger">Renew Now</Btn></Link>
        </CardContent>
      </Card>
    );
  }

  // Expiring soon (within 7 days)
  if (daysLeft != null && daysLeft <= 7) {
    return (
      <Card className="mb-6 border-warning/40 bg-warning/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">
                {planName ? `${planName} expires` : "Your subscription expires"} in {daysLeft} day{daysLeft === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Renew early to avoid losing access to writes.</p>
            </div>
          </div>
          <Link href="/plans"><Btn size="sm" variant="outline">Renew</Btn></Link>
        </CardContent>
      </Card>
    );
  }

  // Quota exhausted (task or group limit hit)
  if (
    quota &&
    ((quota.tasksLimit != null && quota.tasksUsed >= quota.tasksLimit) ||
      (quota.groupsLimit != null && quota.groupsUsed >= quota.groupsLimit))
  ) {
    const tasksFull = quota.tasksLimit != null && quota.tasksUsed >= quota.tasksLimit;
    const groupsFull = quota.groupsLimit != null && quota.groupsUsed >= quota.groupsLimit;
    return (
      <Card className="mb-6 border-warning/40 bg-warning/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Plan limit reached</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You&apos;ve used all your {tasksFull && groupsFull ? "task and group" : tasksFull ? "task" : "group"} credits for this billing period. Upgrade or renew to keep creating.
              </p>
            </div>
          </div>
          <Link href="/plans"><Btn size="sm">Upgrade</Btn></Link>
        </CardContent>
      </Card>
    );
  }

  return null;
}
