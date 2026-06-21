// Tiny in-memory token-bucket limiter. Per-process (fine for a single instance);
// swap for Redis/Upstash when horizontally scaled.
const buckets = new Map<string, { tokens: number; updated: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: limit, updated: now };
  const refill = ((now - b.updated) / windowMs) * limit;
  b.tokens = Math.min(limit, b.tokens + refill);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}
