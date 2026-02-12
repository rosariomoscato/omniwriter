import { Request, Response, NextFunction } from 'express';

/**
 * In-memory rate limiter
 * Tracks request counts per IP address and returns 429 when limit exceeded
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const requestStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestStore.entries()) {
    if (entry.resetTime < now) {
      requestStore.delete(key);
    }
  }
}, 60000);

/**
 * Rate limiting middleware configuration
 */
interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  message?: string;        // Custom error message
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean;    // Only count successful requests
}

/**
 * Create rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Get identifier (IP address)
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;

    const now = Date.now();

    // Get or create entry
    let entry = requestStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
      requestStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      return res.status(429).json({
        message,
        retryAfter,
        resetTime: new Date(entry.resetTime).toISOString()
      });
    }

    // Increment counter
    entry.count++;

    // Add rate limit headers to response
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    // Handle skip options
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      const statusCode = (body as any).statusCode || res.statusCode;

      // Decrement if request should be skipped
      if ((skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) ||
          (skipFailedRequests && (statusCode < 200 || statusCode >= 300))) {
        entry.count--;
      }

      return originalJson(body);
    };

    next();
  };
}

// Export specific rate limiters for different use cases
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,               // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});

// Determine if we're in development environment
const isDevelopment = process.env.NODE_ENV !== 'production';

export const authRateLimit = rateLimit({
  windowMs: isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000, // 5 minutes (dev) or 15 minutes (prod)
  maxRequests: isDevelopment ? 10 : 5,                        // 10 attempts (dev) or 5 attempts (prod)
  skipSuccessfulRequests: true,                               // Only count failed login attempts
  message: isDevelopment
    ? 'Too many failed login attempts. Please try again after 5 minutes.'
    : 'Too many failed login attempts. Please try again after 15 minutes.'
});

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  maxRequests: 60,                // 60 requests per minute
  message: 'Too many API requests, please slow down.'
});

export const generationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 10,                // 10 generations per hour for free users
  message: 'You have reached your generation limit. Please upgrade to Premium for unlimited access.'
});

/**
 * Reset rate limit for a specific IP address and path
 * Useful for admins to unblock a user who was rate limited
 * @param ip - IP address to reset
 * @param path - Request path (optional, resets all if not provided)
 */
export function resetRateLimit(ip: string, path?: string): void {
  const keysToDelete: string[] = [];

  for (const [key] of requestStore.entries()) {
    // Check if key matches the IP (and optionally path)
    const keyIp = key.split(':')[0];
    if (keyIp === ip) {
      // If path specified, only delete entries for that path
      if (path) {
        if (key.endsWith(`:${path}`)) {
          keysToDelete.push(key);
        }
      } else {
        // No path specified, delete all entries for this IP
        keysToDelete.push(key);
      }
    }
  }

  // Delete matching keys
  for (const key of keysToDelete) {
    requestStore.delete(key);
  }

  console.log(`[RateLimit] Reset rate limit for IP: ${ip}${path ? ` on path: ${path}` : ' (all paths)'}. Deleted ${keysToDelete.length} entries.`);
}

/**
 * Get current rate limit status for an IP
 * @param ip - IP address to check
 * @param path - Request path (optional, checks all if not provided)
 * @returns Array of rate limit entries for the IP
 */
export function getRateLimitStatus(ip: string, path?: string): Array<{ key: string; count: number; resetTime: string }> {
  const results: Array<{ key: string; count: number; resetTime: string }> = [];

  for (const [key, entry] of requestStore.entries()) {
    const keyIp = key.split(':')[0];
    if (keyIp === ip) {
      if (path) {
        if (key.endsWith(`:${path}`)) {
          results.push({
            key,
            count: entry.count,
            resetTime: new Date(entry.resetTime).toISOString()
          });
        }
      } else {
        results.push({
          key,
          count: entry.count,
          resetTime: new Date(entry.resetTime).toISOString()
        });
      }
    }
  }

  return results;
}
