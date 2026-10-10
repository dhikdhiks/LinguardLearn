// ============================================================
// RATE LIMITING UTILITY (In-Memory + Upstash Redis ready)
// ============================================================

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Prefix for rate limit keys
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 60_000);
  }

  async limit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const fullKey = `${config.keyPrefix || 'ratelimit'}:${key}`;

    let entry = this.store.get(fullKey);

    if (!entry || entry.resetTime < now) {
      // New window
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      this.store.set(fullKey, entry);
    }

    entry.count++;

    const remaining = Math.max(0, config.maxRequests - entry.count);

    return {
      success: entry.count <= config.maxRequests,
      limit: config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  stop() {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance
let rateLimiter: InMemoryRateLimiter | null = null;

function getRateLimiter(): InMemoryRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new InMemoryRateLimiter();
  }
  return rateLimiter;
}

// Export rate limit function
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = getRateLimiter();
  return limiter.limit(identifier, config);
}

// Predefined rate limit configs
export const RATE_LIMIT_CONFIGS = {
  // Dictionary API: 30 requests per minute per IP
  dictionary: {
    windowMs: 60_000, // 1 minute
    maxRequests: 30,
    keyPrefix: 'dict',
  },
  // Phrase translation: 20 requests per minute per IP
  phraseTranslate: {
    windowMs: 60_000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'translate',
  },
  // General API: 100 requests per minute per IP
  api: {
    windowMs: 60_000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'api',
  },
} as const;

// Helper to create rate limit headers
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
}

// Middleware wrapper for API routes
export function withRateLimit(
  config: RateLimitConfig,
  getIdentifier: (request: Request) => string
) {
  return async function (
    request: Request,
    handler: (request: Request) => Promise<Response>
  ): Promise<Response> {
    const identifier = getIdentifier(request);
    const result = await rateLimit(identifier, config);

    const headers = createRateLimitHeaders(result);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const response = await handler(request);
    // Add rate limit headers to successful responses
    const responseHeaders = new Headers(response.headers);
    Object.entries(headers).forEach(([key, value]) => responseHeaders.set(key, value));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  };
}

// Default identifier function - uses IP address
export function getIpIdentifier(request: Request): string {
  // Check various headers for real IP (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(',')[0].trim();

  // Fallback - in development this might be undefined
  return 'unknown';
}

// Identifier based on user session (for authenticated endpoints)
export async function getUserIdentifier(request: Request): Promise<string> {
  // This would require auth session - for use in authenticated routes
  // For now, fall back to IP
  return getIpIdentifier(request);
}