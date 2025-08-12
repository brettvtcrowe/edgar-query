/**
 * Retry and Backoff Mechanism for SEC API Calls
 * Handles rate limiting, transient errors, and implements exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterMs?: number;
  retryableStatusCodes?: number[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 500,
  retryableStatusCodes: [429, 500, 502, 503, 504], // Rate limit and server errors
  onRetry: () => {},
};

/**
 * HTTP error with status code
 */
export class HTTPError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'HTTPError';
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 * @param attempt - Current attempt number (0-based)
 * @param options - Retry options
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
  
  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);
  
  // Add random jitter to prevent thundering herd
  const jitter = Math.random() * options.jitterMs - options.jitterMs / 2;
  
  return Math.max(0, cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 * @param error - Error to check
 * @param options - Retry options
 * @returns Whether the error is retryable
 */
function isRetryableError(error: unknown, options: Required<RetryOptions>): boolean {
  if (error instanceof HTTPError) {
    return options.retryableStatusCodes.includes(error.statusCode);
  }
  
  // Network errors are generally retryable
  if (error instanceof Error) {
    const retryableMessages = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'network',
      'fetch failed',
    ];
    
    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }
  
  return false;
}

/**
 * Execute a function with retry logic and exponential backoff
 * @param fn - Async function to execute
 * @param options - Retry options
 * @returns Result with success status and data/error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let totalDelayMs = 0;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalDelayMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      const shouldRetry = attempt < opts.maxRetries && isRetryableError(error, opts);
      
      if (!shouldRetry) {
        break;
      }
      
      // Calculate delay and sleep
      const delayMs = calculateDelay(attempt, opts);
      totalDelayMs += delayMs;
      
      // Call onRetry callback
      opts.onRetry(attempt + 1, lastError, delayMs);
      
      await sleep(delayMs);
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: opts.maxRetries + 1,
    totalDelayMs,
  };
}

/**
 * Fetch with retry logic
 * @param url - URL to fetch
 * @param init - Fetch options
 * @param retryOptions - Retry options
 * @returns Fetch response
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const result = await withRetry(
    async () => {
      const response = await fetch(url, init);
      
      // Check for HTTP errors
      if (!response.ok) {
        throw new HTTPError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText
        );
      }
      
      return response;
    },
    retryOptions
  );
  
  if (!result.success || !result.data) {
    throw result.error || new Error('Fetch failed after retries');
  }
  
  return result.data;
}

/**
 * SEC-specific fetch with compliant retry logic
 * @param url - SEC API URL
 * @param userAgent - User-Agent string for SEC compliance
 * @param retryOptions - Optional retry options
 * @returns Fetch response
 */
export async function fetchSECWithRetry(
  url: string,
  userAgent: string,
  retryOptions?: RetryOptions
): Promise<Response> {
  // SEC-specific retry options
  const secRetryOptions: RetryOptions = {
    maxRetries: 5, // More retries for SEC API
    initialDelayMs: 2000, // Start with 2 second delay
    maxDelayMs: 60000, // Max 1 minute delay
    backoffMultiplier: 2,
    jitterMs: 1000,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    onRetry: (attempt, error, delayMs) => {
      console.log(`SEC API retry attempt ${attempt}: ${error.message}. Waiting ${delayMs}ms...`);
    },
    ...retryOptions, // Allow override
  };
  
  return fetchWithRetry(
    url,
    {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json',
      },
    },
    secRetryOptions
  );
}

/**
 * Rate limiter with backoff for SEC API compliance
 */
export class SECAPIRateLimiter {
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStartTime = Date.now();
  private readonly windowSizeMs = 1000; // 1 second window
  private readonly maxRequestsPerWindow = 10; // SEC limit
  
  /**
   * Wait if necessary to comply with rate limits
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceWindowStart = now - this.windowStartTime;
    
    // Reset window if expired
    if (timeSinceWindowStart >= this.windowSizeMs) {
      this.windowStartTime = now;
      this.requestCount = 0;
    }
    
    // Check if we've hit the limit
    if (this.requestCount >= this.maxRequestsPerWindow) {
      // Wait until window expires
      const waitTime = this.windowSizeMs - timeSinceWindowStart;
      if (waitTime > 0) {
        await sleep(waitTime);
        // Reset window after waiting
        this.windowStartTime = Date.now();
        this.requestCount = 0;
      }
    }
    
    // Also enforce minimum time between requests (100ms)
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 100) {
      await sleep(100 - timeSinceLastRequest);
    }
    
    // Update counters
    this.requestCount++;
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Execute function with rate limiting
   * @param fn - Function to execute
   * @returns Function result
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitIfNeeded();
    return fn();
  }
  
  /**
   * Get current rate limiter stats
   */
  getStats() {
    const now = Date.now();
    const timeSinceWindowStart = now - this.windowStartTime;
    
    return {
      requestsInWindow: this.requestCount,
      maxRequestsPerWindow: this.maxRequestsPerWindow,
      windowTimeRemaining: Math.max(0, this.windowSizeMs - timeSinceWindowStart),
      canMakeRequest: this.requestCount < this.maxRequestsPerWindow,
    };
  }
}

// Export singleton rate limiter for SEC API
export const secAPIRateLimiter = new SECAPIRateLimiter();