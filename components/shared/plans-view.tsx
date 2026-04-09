"use client";

import { Card, CardContent, Btn, Badge } from "@/components/ui";
import { CheckCircle, Sparkles } from "lucide-react";
import { usePlans, useMySubscription, useSubscribe } from "@/hooks/use-plans";

export function PlansView() {
  const { data: plans, isLoading } = usePlans();
  const { data: currentSub } = useMySubscription();
  const subscribeMutation = useSubscribe();

  const currentPlanId = currentSub ? Number((currentSub as Record<string, unknown>).plan_id) : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent><div className="h-64 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {(plans || []).map((plan, i) => {
        const id = plan.id as number;
        const name = String(plan.name || "");
        const price = Number(plan.price || 0);
        const period = String(plan.period || "monthly");
        const description = String(plan.description || "");
        const features = (plan.features || []) as string[];
        const isCurrent = id === currentPlanId;
        const isPopular = i === 1;

        return (
          <Card key={id} className={`relative ${isPopular ? "border-primary shadow-xl shadow-primary/10 scale-[1.02]" : ""} ${isCurrent ? "ring-2 ring-success/30" : ""}`}>
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Most Popular
              </div>
            )}
            {isCurrent && (
              <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-success text-white text-xs font-bold">Current Plan</div>
            )}
            <CardContent className="p-8">
              <h3 className="text-xl font-bold">{name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
              <div className="mt-6 mb-6">
                <span className="text-4xl font-bold">{price === 0 ? "Free" : `$${price.toFixed(2)}`}</span>
                {price > 0 && <span className="text-muted-foreground">/{period}</span>}
              </div>
              <ul className="space-y-3 mb-8">
                {features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success shrink-0" />
                    {typeof f === "string" ? f : String(f)}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Btn variant="outline" className="w-full" disabled>Current Plan</Btn>
              ) : (
                <Btn variant={isPopular ? "primary" : "outline"} className="w-full"
                  isLoading={subscribeMutation.isPending}
                  onClick={() => subscribeMutation.mutate(id)}>
                  {price === 0 ? "Get Started" : "Subscribe"}
                </Btn>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
