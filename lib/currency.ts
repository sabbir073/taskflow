// Pure currency helpers — no "use server" allowed here because these must be
// callable from client components too.

export function convertCurrency(
  baseAmount: number,
  baseCurrency: string,
  targetCurrency: string,
  usdToBdtRate: number
): { amount: number; currency: string } {
  const from = (baseCurrency || "usd").toLowerCase();
  const to = (targetCurrency || "usd").toLowerCase();
  if (from === to) return { amount: baseAmount, currency: to };
  // No usable rate: fail loud rather than silently mis-labelling the
  // amount with the target currency. Caller decides whether to bail.
  if (usdToBdtRate <= 0) return { amount: baseAmount, currency: from };
  if (from === "usd" && to === "bdt") return { amount: baseAmount * usdToBdtRate, currency: "bdt" };
  if (from === "bdt" && to === "usd") return { amount: baseAmount / usdToBdtRate, currency: "usd" };
  return { amount: baseAmount, currency: from };
}

// How many months a period covers. Used to scale plan quotas
// (max_tasks, max_groups, included_credits) so a yearly buyer gets 12× what
// a monthly buyer gets. Yearly is the longest plan window we support.
export function periodMultiplier(period: string | null | undefined): number {
  switch (period) {
    case "monthly":
      return 1;
    case "half_yearly":
      return 6;
    case "yearly":
      return 12;
    default:
      return 1;
  }
}

// Period → expiry date offset (returns ISO string).
export function computeExpiresAt(period: string): string {
  const d = new Date();
  switch (period) {
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      return d.toISOString();
    case "half_yearly":
      d.setMonth(d.getMonth() + 6);
      return d.toISOString();
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString();
    default:
      d.setMonth(d.getMonth() + 1);
      return d.toISOString();
  }
}
