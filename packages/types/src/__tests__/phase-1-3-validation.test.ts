/**
 * Phase 1.3 Validation Tests
 * Tests for SEC Data Foundation components
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  CompanyResolver,
  SubmissionsFetcher,
  withRetry,
  fetchWithRetry,
  HTTPError,
  SECAPIRateLimiter,
  secAPIRateLimiter,
  fetchSECWithRetry,
} from '../index.js';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Phase 1.3 - SEC Data Foundation Validation Gates', () => {
  
  describe('Validation Gate 1: Company Resolver - AAPL → CIK Resolution', () => {
    let resolver: CompanyResolver;
    
    beforeAll(() => {
      resolver = new CompanyResolver('TestAgent/1.0 (test@example.com)');
    });
    
    it('should resolve AAPL ticker to CIK 0000320193', async () => {
      // Mock SEC company tickers response
      const mockResponse = {
        "0": {
          cik_str: 320193,
          ticker: "AAPL",
          title: "Apple Inc."
        },
        "1": {
          cik_str: 789019,
          ticker: "MSFT",
          title: "MICROSOFT CORP"
        }
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      
      const cik = await resolver.resolveTicker('AAPL');
      expect(cik).toBe('0000320193');
      
      // Test case insensitivity
      const cikLower = await resolver.resolveTicker('aapl');
      expect(cikLower).toBe('0000320193');
    });
    
    it('should resolve company name to CIK', async () => {
      // Mock already initialized from previous test
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "0": {
            cik_str: 320193,
            ticker: "AAPL",
            title: "Apple Inc."
          },
        }),
      });
      
      const results = await resolver.resolveCompanyName('Apple', 1);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.cik).toBe('0000320193');
      expect(results[0]?.name).toBe('Apple Inc.');
    });
    
    it('should handle multiple identifier types', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "0": {
            cik_str: 320193,
            ticker: "AAPL",
            title: "Apple Inc."
          },
        }),
      });
      
      // Test with CIK
      const cikFromCIK = await resolver.resolve('0000320193');
      expect(cikFromCIK).toBe('0000320193');
      
      // Test with ticker
      const cikFromTicker = await resolver.resolve('AAPL');
      expect(cikFromTicker).toBe('0000320193');
      
      // Test with partial CIK
      const cikFromPartial = await resolver.resolve('320193');
      expect(cikFromPartial).toBe('0000320193');
    });
  });
  
  describe('Validation Gate 2: Submissions Fetcher - Fetch Last 10 Filings', () => {
    let fetcher: SubmissionsFetcher;
    
    beforeAll(() => {
      fetcher = new SubmissionsFetcher('TestAgent/1.0 (test@example.com)');
    });
    
    it('should fetch last 10 filings for a CIK', async () => {
      // Mock SEC submissions response
      const mockSubmissions = {
        cik: "0000320193",
        name: "Apple Inc.",
        tickers: ["AAPL"],
        exchanges: ["NASDAQ"],
        filings: {
          recent: {
            accessionNumber: Array(50).fill(0).map((_, i) => `0000320193-24-${(i + 1).toString().padStart(6, '0')}`),
            filingDate: Array(50).fill(0).map((_, i) => `2024-${(12 - i % 12).toString().padStart(2, '0')}-01`),
            reportDate: Array(50).fill(0).map((_, i) => `2024-${(12 - i % 12).toString().padStart(2, '0')}-01`),
            acceptanceDateTime: Array(50).fill("2024-01-01T10:00:00.000Z"),
            act: Array(50).fill("34"),
            form: Array(50).fill(0).map((_, i) => i % 3 === 0 ? "10-K" : i % 3 === 1 ? "10-Q" : "8-K"),
            fileNumber: Array(50).fill("001-36743"),
            filmNumber: Array(50).fill("24000001"),
            items: Array(50).fill(""),
            size: Array(50).fill(1000000),
            isXBRL: Array(50).fill(1),
            isInlineXBRL: Array(50).fill(1),
            primaryDocument: Array(50).fill("document.htm"),
            primaryDocDescription: Array(50).fill("FORM 10-K"),
          }
        }
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmissions,
      });
      
      const filings = await fetcher.getRecentFilings('0000320193', undefined, 10);
      
      expect(filings).toHaveLength(10);
      expect(filings[0]?.cik).toBe('0000320193');
      expect(filings[0]?.companyName).toBe('Apple Inc.');
      expect(filings[0]?.accessionNumber).toMatch(/^\d{10}-\d{2}-\d{6}$/);
    });
    
    it('should filter filings by form type', async () => {
      const mockSubmissions = {
        cik: "0000320193",
        name: "Apple Inc.",
        tickers: ["AAPL"],
        exchanges: ["NASDAQ"],
        filings: {
          recent: {
            accessionNumber: Array(20).fill(0).map((_, i) => `0000320193-24-${(i + 1).toString().padStart(6, '0')}`),
            filingDate: Array(20).fill("2024-01-01"),
            reportDate: Array(20).fill("2024-01-01"),
            acceptanceDateTime: Array(20).fill("2024-01-01T10:00:00.000Z"),
            act: Array(20).fill("34"),
            form: Array(20).fill(0).map((_, i) => i % 2 === 0 ? "10-K" : "10-Q"),
            fileNumber: Array(20).fill("001-36743"),
            filmNumber: Array(20).fill("24000001"),
            items: Array(20).fill(""),
            size: Array(20).fill(1000000),
            isXBRL: Array(20).fill(1),
            isInlineXBRL: Array(20).fill(1),
            primaryDocument: Array(20).fill("document.htm"),
            primaryDocDescription: Array(20).fill("FORM"),
          }
        }
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmissions,
      });
      
      const filings = await fetcher.getRecentFilings('0000320193', ['10-K'], 5);
      
      expect(filings.length).toBeLessThanOrEqual(5);
      expect(filings.every(f => f.form === '10-K')).toBe(true);
    });
    
    it('should get most recent filing of specific type', async () => {
      const mockSubmissions = {
        cik: "0000320193",
        name: "Apple Inc.",
        tickers: ["AAPL"],
        exchanges: ["NASDAQ"],
        filings: {
          recent: {
            accessionNumber: ["0000320193-24-000001", "0000320193-24-000002"],
            filingDate: ["2024-11-01", "2024-10-01"],
            reportDate: ["2024-09-30", "2024-06-30"],
            acceptanceDateTime: ["2024-11-01T10:00:00.000Z", "2024-10-01T10:00:00.000Z"],
            act: ["34", "34"],
            form: ["10-K", "10-Q"],
            fileNumber: ["001-36743", "001-36743"],
            filmNumber: ["24000001", "24000002"],
            items: ["", ""],
            size: [1000000, 800000],
            isXBRL: [1, 1],
            isInlineXBRL: [1, 1],
            primaryDocument: ["10k.htm", "10q.htm"],
            primaryDocDescription: ["FORM 10-K", "FORM 10-Q"],
          }
        }
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmissions,
      });
      
      const filing = await fetcher.getMostRecentFiling('0000320193', '10-K');
      
      expect(filing).not.toBeNull();
      expect(filing?.form).toBe('10-K');
      expect(filing?.accessionNumber).toBe('0000320193-24-000001');
    });
  });
  
  describe('Validation Gate 3: Retry Logic - Handle Rate Limits Gracefully', () => {
    it('should retry on 429 rate limit error', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new HTTPError('Rate limited', 429);
        }
        return 'success';
      });
      
      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10, // Short delay for testing
        onRetry: vi.fn(),
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });
    
    it('should implement exponential backoff', async () => {
      const delays: number[] = [];
      const fn = vi.fn(async () => {
        throw new HTTPError('Server error', 503);
      });
      
      await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 100,
        backoffMultiplier: 2,
        jitterMs: 0, // No jitter for predictable testing
        onRetry: (attempt, error, delayMs) => {
          delays.push(delayMs);
        },
      });
      
      expect(delays).toHaveLength(3);
      expect(delays[0]).toBe(100); // First retry: 100ms
      expect(delays[1]).toBe(200); // Second retry: 100 * 2 = 200ms
      expect(delays[2]).toBe(400); // Third retry: 100 * 2^2 = 400ms
    });
    
    it('should not retry on non-retryable errors', async () => {
      const fn = vi.fn(async () => {
        throw new HTTPError('Bad request', 400);
      });
      
      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
      });
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // No retries
      expect(fn).toHaveBeenCalledTimes(1);
    });
    
    it('should handle SEC rate limiter', async () => {
      const limiter = new SECAPIRateLimiter();
      const stats = limiter.getStats();
      
      expect(stats.maxRequestsPerWindow).toBe(10);
      expect(stats.canMakeRequest).toBe(true);
      
      // Execute a function with rate limiting
      const result = await limiter.execute(async () => 'success');
      expect(result).toBe('success');
      
      const newStats = limiter.getStats();
      expect(newStats.requestsInWindow).toBe(1);
    });
  });
  
  describe('Integration Test: Complete SEC Data Flow', () => {
    it('should resolve ticker and fetch filings with retry logic', async () => {
      // Mock company tickers response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "0": {
            cik_str: 320193,
            ticker: "AAPL",
            title: "Apple Inc."
          },
        }),
      });
      
      const resolver = new CompanyResolver();
      const cik = await resolver.resolve('AAPL');
      expect(cik).toBe('0000320193');
      
      // Mock submissions with retry
      let fetchAttempts = 0;
      (global.fetch as any).mockImplementation(async () => {
        fetchAttempts++;
        if (fetchAttempts === 1) {
          // First attempt fails with rate limit
          return {
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
          };
        }
        // Second attempt succeeds
        return {
          ok: true,
          json: async () => ({
            cik: "0000320193",
            name: "Apple Inc.",
            tickers: ["AAPL"],
            exchanges: ["NASDAQ"],
            filings: {
              recent: {
                accessionNumber: ["0000320193-24-000001"],
                filingDate: ["2024-11-01"],
                reportDate: ["2024-09-30"],
                acceptanceDateTime: ["2024-11-01T10:00:00.000Z"],
                act: ["34"],
                form: ["10-K"],
                fileNumber: ["001-36743"],
                filmNumber: ["24000001"],
                items: [""],
                size: [1000000],
                isXBRL: [1],
                isInlineXBRL: [1],
                primaryDocument: ["10k.htm"],
                primaryDocDescription: ["FORM 10-K"],
              }
            }
          }),
        };
      });
      
      const response = await fetchSECWithRetry(
        'https://data.sec.gov/submissions/CIK0000320193.json',
        'TestAgent/1.0',
        { initialDelayMs: 10 } // Short delay for testing
      );
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.cik).toBe('0000320193');
    });
  });
});

describe('Phase 1.3 - Additional Component Tests', () => {
  
  describe('Company Resolver - Search Functionality', () => {
    let resolver: CompanyResolver;
    
    beforeAll(() => {
      resolver = new CompanyResolver();
    });
    
    it('should search companies by partial ticker or name', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
          "1": { cik_str: 789019, ticker: "MSFT", title: "MICROSOFT CORP" },
          "2": { cik_str: 1018724, ticker: "AMZN", title: "AMAZON COM INC" },
          "3": { cik_str: 1318605, ticker: "TSLA", title: "Tesla Inc" },
        }),
      });
      
      const results = await resolver.searchCompanies('A', 3);
      
      expect(results.length).toBeLessThanOrEqual(3);
      // Should find AAPL and AMZN
      expect(results.some(r => r.ticker === 'AAPL')).toBe(true);
      expect(results.some(r => r.ticker === 'AMZN')).toBe(true);
    });
  });
  
  describe('Submissions Fetcher - Date Range Filtering', () => {
    let fetcher: SubmissionsFetcher;
    
    beforeAll(() => {
      fetcher = new SubmissionsFetcher();
    });
    
    it('should filter filings by date range', async () => {
      const mockSubmissions = {
        cik: "0000320193",
        name: "Apple Inc.",
        tickers: ["AAPL"],
        exchanges: ["NASDAQ"],
        filings: {
          recent: {
            accessionNumber: ["0000320193-24-000001", "0000320193-24-000002", "0000320193-23-000003"],
            filingDate: ["2024-11-01", "2024-06-01", "2023-12-01"],
            reportDate: ["2024-09-30", "2024-03-31", "2023-09-30"],
            acceptanceDateTime: ["2024-11-01T10:00:00.000Z", "2024-06-01T10:00:00.000Z", "2023-12-01T10:00:00.000Z"],
            act: ["34", "34", "34"],
            form: ["10-K", "10-Q", "10-K"],
            fileNumber: ["001-36743", "001-36743", "001-36743"],
            filmNumber: ["24000001", "24000002", "23000003"],
            items: ["", "", ""],
            size: [1000000, 800000, 900000],
            isXBRL: [1, 1, 1],
            isInlineXBRL: [1, 1, 1],
            primaryDocument: ["10k.htm", "10q.htm", "10k.htm"],
            primaryDocDescription: ["FORM 10-K", "FORM 10-Q", "FORM 10-K"],
          }
        }
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmissions,
      });
      
      const filings = await fetcher.getFilingsByDateRange(
        '0000320193',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      
      expect(filings).toHaveLength(2); // Only 2024 filings
      expect(filings.every(f => f.filingDate.startsWith('2024'))).toBe(true);
    });
  });
});