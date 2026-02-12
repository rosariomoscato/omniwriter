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

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,                 // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again after 15 minutes.'
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
