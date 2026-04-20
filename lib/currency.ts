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
  if (from === to || usdToBdtRate <= 0) return { amount: baseAmount, currency: to };
  if (from === "usd" && to === "bdt") return { amount: baseAmount * usdToBdtRate, currency: "bdt" };
  if (from === "bdt" && to === "usd") return { amount: baseAmount / usdToBdtRate, currency: "usd" };
  return { amount: baseAmount, currency: to };
}

// How many months a period covers. Used to scale plan quotas
// (max_tasks, max_groups, included_credits) so a yearly buyer gets 12× what
// a monthly buyer gets. `forever` returns null — unlimited.
export function periodMultiplier(period: string | null | undefined): number | null {
  switch (period) {
    case "monthly":
      return 1;
    case "half_yearly":
      return 6;
    case "yearly":
      return 12;
    case "forever":
      return null;
    default:
      return 1;
  }
}

// Period → expiry date offset (returns ISO string or null for "forever")
export function computeExpiresAt(period: string): string | null {
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
    case "forever":
      return null;
    default:
      d.setMonth(d.getMonth() + 1);
      return d.toISOString();
  }
}
