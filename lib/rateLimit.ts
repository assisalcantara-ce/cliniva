interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Limpeza periódica para evitar vazamento de memória em processos longos
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000);
  if (timer.unref) timer.unref();
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || record.resetAt <= now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetInMs: options.windowMs,
    };
  }

  if (record.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, record.resetAt - now),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: options.limit - record.count,
    resetInMs: Math.max(0, record.resetAt - now),
  };
}
