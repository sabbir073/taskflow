// Single-process, in-memory rate limiter. No Redis, no external deps.
// Perfect for a single-server deployment; if you later scale to multiple
// app instances, swap this for @upstash/ratelimit or the equivalent.
//
// Keyed by `${action}:${subject}` where subject is typically an IP, user ID
// or email address. Each key tracks count + window reset time. The map is
// trimmed when it grows past LRU_MAX to bound memory.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const LRU_MAX = 10_000;

function prune() {
  if (buckets.size <= LRU_MAX) return;
  const now = Date.now();
  // Drop anything past its reset first (cheap).
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
    if (buckets.size <= LRU_MAX) return;
  }
  // Still oversized? Drop oldest entries by insertion order.
  const excess = buckets.size - LRU_MAX;
  let i = 0;
  for (const key of buckets.keys()) {
    if (i++ >= excess) break;
    buckets.delete(key);
  }
}

export function checkRate(
  action: string,
  subject: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const key = `${action}:${subject}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    prune();
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

// Human-friendly duration for the retry message.
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  return `${Math.ceil(seconds / 3600)} hr`;
}
