/**
 * Redis-backed Token Bucket Rate Limiter
 * Implements rate limiting for SEC API compliance (10 requests/second max)
 */

import { Redis } from 'ioredis';
import { RateLimitSchema } from './index.js';

export interface RateLimiterConfig {
  requestsPerSecond: number;
  burstCapacity: number;
  windowSizeSeconds: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  tokensRemaining: number;
  resetTime: Date;
  retryAfterMs?: number;
}

export class TokenBucketRateLimiter {
  private redis: Redis;
  private config: Required<RateLimiterConfig>;
  
  constructor(redis: Redis, config: RateLimiterConfig) {
    this.redis = redis;
    
    // Validate and set defaults
    const validated = RateLimitSchema.parse(config);
    this.config = {
      ...validated,
      keyPrefix: config.keyPrefix || 'rate_limit',
    };
  }
  
  /**
   * Check if request is allowed and consume tokens
   * @param identifier - Unique identifier for the rate limit (e.g., IP, user ID, 'sec-api')
   * @param tokensRequested - Number of tokens to consume (default: 1)
   * @returns Rate limit result
   */
  async checkLimit(
    identifier: string,
    tokensRequested: number = 1
  ): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    
    // Use Lua script for atomic operations
    const luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refill_rate = tonumber(ARGV[2])
      local window_size = tonumber(ARGV[3])
      local tokens_requested = tonumber(ARGV[4])
      local now = tonumber(ARGV[5])
      
      -- Get current bucket state
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or capacity
      local last_refill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add based on elapsed time
      local elapsed = (now - last_refill) / 1000 -- Convert to seconds
      local tokens_to_add = math.floor(elapsed * refill_rate)
      
      -- Refill bucket up to capacity
      tokens = math.min(capacity, tokens + tokens_to_add)
      local new_last_refill = last_refill + (tokens_to_add * (1000 / refill_rate))
      
      -- Check if request can be fulfilled
      if tokens >= tokens_requested then
        -- Consume tokens
        tokens = tokens - tokens_requested
        
        -- Update bucket state
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', new_last_refill)
        redis.call('EXPIRE', key, window_size * 2) -- TTL for cleanup
        
        return {1, tokens, new_last_refill} -- allowed, tokens_remaining, last_refill
      else
        -- Request denied - don't consume tokens but update refill time
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', new_last_refill)
        redis.call('EXPIRE', key, window_size * 2)
        
        -- Calculate retry after time
        local tokens_needed = tokens_requested - tokens
        local wait_time = math.ceil(tokens_needed / refill_rate) * 1000
        
        return {0, tokens, new_last_refill, wait_time} -- denied, tokens_remaining, last_refill, retry_after_ms
      end
    `;
    
    try {
      const result = await this.redis.eval(
        luaScript,
        1, // Number of keys
        key,
        this.config.burstCapacity,
        this.config.requestsPerSecond,
        this.config.windowSizeSeconds,
        tokensRequested,
        now
      ) as number[];
      
      const allowed = result[0] === 1;
      const tokensRemaining = result[1] || 0;
      const lastRefill = result[2] || now;
      const retryAfterMs = result[3];
      
      // Calculate next reset time
      const nextResetTime = new Date(lastRefill + (1000 / this.config.requestsPerSecond));
      
      return {
        allowed,
        tokensRemaining,
        resetTime: nextResetTime,
        retryAfterMs: allowed ? undefined : retryAfterMs,
      };
      
    } catch (error) {
      console.error('Rate limiter error:', error);
      
      // Fail open - allow request on Redis errors
      return {
        allowed: true,
        tokensRemaining: this.config.burstCapacity,
        resetTime: new Date(now + this.config.windowSizeSeconds * 1000),
      };
    }
  }
  
  /**
   * Get current rate limit status without consuming tokens
   * @param identifier - Unique identifier for the rate limit
   * @returns Current status
   */
  async getStatus(identifier: string): Promise<RateLimitResult> {
    return this.checkLimit(identifier, 0);
  }
  
  /**
   * Reset rate limit for identifier (admin function)
   * @param identifier - Identifier to reset
   */
  async resetLimit(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    await this.redis.del(key);
  }
  
  /**
   * Get all active rate limits (admin function)
   * @returns List of active identifiers
   */
  async getActiveIdentifiers(): Promise<string[]> {
    const pattern = `${this.config.keyPrefix}:*`;
    const keys = await this.redis.keys(pattern);
    return keys.map(key => key.replace(`${this.config.keyPrefix}:`, ''));
  }
}

/**
 * SEC-specific rate limiter factory
 * Pre-configured for SEC API compliance (10 requests/second)
 */
export class SECRateLimiter extends TokenBucketRateLimiter {
  constructor(redis: Redis) {
    super(redis, {
      requestsPerSecond: 10,    // SEC limit
      burstCapacity: 50,        // Allow short bursts
      windowSizeSeconds: 60,    // 1-minute window
      keyPrefix: 'sec_api',
    });
  }
  
  /**
   * Check rate limit for SEC API requests
   * @param endpoint - SEC API endpoint (optional identifier)
   * @returns Rate limit result
   */
  async checkSECLimit(endpoint: string = 'general'): Promise<RateLimitResult> {
    return this.checkLimit(`sec:${endpoint}`);
  }
}

/**
 * Rate limiter middleware creator for API routes
 * @param rateLimiter - Configured rate limiter instance
 * @param getIdentifier - Function to extract identifier from request
 * @returns Middleware function
 */
export function createRateLimitMiddleware(
  rateLimiter: TokenBucketRateLimiter,
  getIdentifier: (req: any) => string
) {
  return async (req: any, res: any, next: any) => {
    try {
      const identifier = getIdentifier(req);
      const result = await rateLimiter.checkLimit(identifier);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Remaining', result.tokensRemaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());
      
      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil((result.retryAfterMs || 0) / 1000));
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfterMs: result.retryAfterMs,
          resetTime: result.resetTime,
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Fail open - allow request on errors
      next();
    }
  };
}

/**
 * Utility to wait for rate limit reset
 * @param rateLimitResult - Result from rate limiter
 * @returns Promise that resolves when safe to retry
 */
export async function waitForRateLimit(rateLimitResult: RateLimitResult): Promise<void> {
  if (rateLimitResult.allowed || !rateLimitResult.retryAfterMs) {
    return;
  }
  
  await new Promise(resolve => setTimeout(resolve, rateLimitResult.retryAfterMs));
}

/**
 * Exponential backoff with jitter for failed requests
 * @param attempt - Current attempt number (0-based)
 * @param maxAttempts - Maximum number of attempts
 * @param baseDelayMs - Base delay in milliseconds
 * @returns Promise that resolves after backoff delay
 */
export async function exponentialBackoff(
  attempt: number,
  maxAttempts: number = 5,
  baseDelayMs: number = 1000
): Promise<void> {
  if (attempt >= maxAttempts) {
    throw new Error(`Max retry attempts (${maxAttempts}) exceeded`);
  }
  
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  
  // Add jitter (±25% random variation)
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
  const finalDelay = exponentialDelay + jitter;
  
  await new Promise(resolve => setTimeout(resolve, finalDelay));
}

export default TokenBucketRateLimiter;