const DEFAULT_TTL_PAD_SECONDS = 60;

type RateLimitResult =
  | {
      ok: true;
      remaining: number;
      resetAt: number;
    }
  | {
      ok: false;
      retryAfterSeconds: number;
      resetAt: number;
    };

function normalizeCounter(value: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function formatRetryAfter(seconds: number): string {
  if (seconds <= 0) return "a moment";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 60 * 60) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}

export async function consumeRateLimit({
  env,
  key,
  limit,
  windowSeconds,
}: {
  env: CloudflareEnv;
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
  const resetAt = windowStart + windowSeconds;
  const storageKey = `rate:${key}:${windowStart}`;

  const current = normalizeCounter(await env.KV.get(storageKey));

  if (current >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(0, resetAt - nowSeconds),
      resetAt,
    };
  }

  const next = current + 1;
  await env.KV.put(storageKey, String(next), {
    expirationTtl: windowSeconds + DEFAULT_TTL_PAD_SECONDS,
  });

  return {
    ok: true,
    remaining: Math.max(0, limit - next),
    resetAt,
  };
}
