/**
 * SEC Company Resolver
 * Handles ticker to CIK resolution and company lookups
 */

import { z } from 'zod';
import { validateCIK, validateTicker, padCIK, SEC_URLS } from './sec-utils.js';
import type { EdgarMCPCompany } from './index.js';

// Default User-Agent for SEC compliance
function buildUserAgent(
  appName: string = 'EdgarAnswerEngine',
  version: string = '1.0',
  contact: string = 'contact@example.com'
): string {
  return `${appName}/${version} (${contact})`;
}

// SEC Company Tickers Response Schema
const SECCompanyTickerSchema = z.object({
  cik_str: z.number(),
  ticker: z.string(),
  title: z.string(),
});

const SECCompanyTickersResponseSchema = z.record(
  z.string(),
  SECCompanyTickerSchema
);

type SECCompanyTicker = z.infer<typeof SECCompanyTickerSchema>;
type SECCompanyTickersResponse = z.infer<typeof SECCompanyTickersResponseSchema>;

// Company search result type
export interface CompanySearchResult {
  cik: string;
  ticker?: string;
  name: string;
  score: number;
}

/**
 * CompanyResolver class for ticker/name to CIK resolution
 */
export class CompanyResolver {
  private tickerMappings: Map<string, SECCompanyTicker> = new Map();
  private nameMappings: Map<string, SECCompanyTicker> = new Map();
  private cikMappings: Map<string, SECCompanyTicker> = new Map();
  private lastFetchTime: Date | null = null;
  private cacheDurationMs = 24 * 60 * 60 * 1000; // 24 hours
  private userAgent: string;

  constructor(userAgent?: string) {
    this.userAgent = userAgent || buildUserAgent();
  }

  /**
   * Initialize or refresh company mappings from SEC
   */
  async initialize(forceRefresh = false): Promise<void> {
    const needsRefresh = 
      forceRefresh ||
      !this.lastFetchTime ||
      Date.now() - this.lastFetchTime.getTime() > this.cacheDurationMs;

    if (!needsRefresh && this.tickerMappings.size > 0) {
      return; // Use cached data
    }

    await this.fetchCompanyTickers();
  }

  /**
   * Fetch company tickers from SEC API
   */
  private async fetchCompanyTickers(): Promise<void> {
    try {
      const response = await fetch(SEC_URLS.COMPANY_TICKERS, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const parsed = SECCompanyTickersResponseSchema.parse(data);

      // Clear existing mappings
      this.tickerMappings.clear();
      this.nameMappings.clear();
      this.cikMappings.clear();

      // Build mapping tables
      for (const [key, company] of Object.entries(parsed)) {
        const paddedCIK = padCIK(company.cik_str);
        
        // Update company object with padded CIK
        const companyWithPaddedCIK = {
          ...company,
          cik_str: parseInt(paddedCIK),
        };

        // Ticker mapping (uppercase for consistency)
        if (company.ticker) {
          this.tickerMappings.set(company.ticker.toUpperCase(), companyWithPaddedCIK);
        }

        // Name mapping (uppercase for case-insensitive search)
        this.nameMappings.set(company.title.toUpperCase(), companyWithPaddedCIK);

        // CIK mapping
        this.cikMappings.set(paddedCIK, companyWithPaddedCIK);
      }

      this.lastFetchTime = new Date();
    } catch (error) {
      throw new Error(`Failed to fetch company tickers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve ticker to CIK
   * @param ticker - Stock ticker symbol
   * @returns CIK or null if not found
   */
  async resolveTicker(ticker: string): Promise<string | null> {
    await this.initialize();

    try {
      const validatedTicker = validateTicker(ticker);
      const company = this.tickerMappings.get(validatedTicker);
      
      if (company) {
        return padCIK(company.cik_str);
      }
    } catch {
      // Invalid ticker format
    }

    return null;
  }

  /**
   * Resolve company name to CIK
   * @param name - Company name (partial or full)
   * @returns Array of matching companies sorted by relevance
   */
  async resolveCompanyName(name: string, limit = 5): Promise<CompanySearchResult[]> {
    await this.initialize();

    const searchTerm = name.toUpperCase();
    const results: CompanySearchResult[] = [];

    // Exact match first
    const exactMatch = this.nameMappings.get(searchTerm);
    if (exactMatch) {
      results.push({
        cik: padCIK(exactMatch.cik_str),
        ticker: exactMatch.ticker,
        name: exactMatch.title,
        score: 1.0,
      });
    }

    // Partial matches
    for (const [companyName, company] of this.nameMappings.entries()) {
      if (results.length >= limit) break;
      
      // Skip if already added as exact match
      if (companyName === searchTerm) continue;

      if (companyName.includes(searchTerm)) {
        // Calculate simple relevance score based on position and length
        const position = companyName.indexOf(searchTerm);
        const lengthRatio = searchTerm.length / companyName.length;
        const score = (1 - position / companyName.length) * 0.5 + lengthRatio * 0.5;

        results.push({
          cik: padCIK(company.cik_str),
          ticker: company.ticker,
          name: company.title,
          score,
        });
      }
    }

    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Resolve any identifier (ticker, CIK, or name) to CIK
   * @param identifier - Ticker, CIK, or company name
   * @returns CIK or null if not found
   */
  async resolve(identifier: string): Promise<string | null> {
    await this.initialize();

    // Try as CIK first
    try {
      const validatedCIK = validateCIK(identifier);
      if (this.cikMappings.has(validatedCIK)) {
        return validatedCIK;
      }
    } catch {
      // Not a valid CIK format
    }

    // Try as ticker
    const tickerResult = await this.resolveTicker(identifier);
    if (tickerResult) {
      return tickerResult;
    }

    // Try as company name
    const nameResults = await this.resolveCompanyName(identifier, 1);
    if (nameResults.length > 0 && nameResults[0]!.score > 0.5) {
      return nameResults[0]!.cik;
    }

    return null;
  }

  /**
   * Get company information by CIK
   * @param cik - Company CIK
   * @returns Company information or null if not found
   */
  async getCompanyInfo(cik: string | number): Promise<EdgarMCPCompany | null> {
    await this.initialize();

    const validatedCIK = validateCIK(cik);
    const company = this.cikMappings.get(validatedCIK);

    if (company) {
      return {
        cik: validatedCIK,
        ticker: company.ticker,
        name: company.title,
      };
    }

    return null;
  }

  /**
   * Search for companies by partial name or ticker
   * @param query - Search query
   * @param limit - Maximum number of results
   * @returns Array of matching companies
   */
  async searchCompanies(query: string, limit = 10): Promise<CompanySearchResult[]> {
    await this.initialize();

    const searchTerm = query.toUpperCase();
    const results: CompanySearchResult[] = [];
    const addedCIKs = new Set<string>();

    // Search in tickers first (higher priority)
    for (const [ticker, company] of this.tickerMappings.entries()) {
      if (ticker.includes(searchTerm)) {
        const cik = padCIK(company.cik_str);
        if (!addedCIKs.has(cik)) {
          results.push({
            cik,
            ticker: company.ticker,
            name: company.title,
            score: ticker === searchTerm ? 1.0 : 0.8,
          });
          addedCIKs.add(cik);
        }
      }
    }

    // Then search in company names
    for (const [companyName, company] of this.nameMappings.entries()) {
      if (results.length >= limit) break;
      
      const cik = padCIK(company.cik_str);
      if (!addedCIKs.has(cik) && companyName.includes(searchTerm)) {
        const position = companyName.indexOf(searchTerm);
        const lengthRatio = searchTerm.length / companyName.length;
        const score = (1 - position / companyName.length) * 0.5 + lengthRatio * 0.5;

        results.push({
          cik,
          ticker: company.ticker,
          name: company.title,
          score: score * 0.7, // Lower score for name matches vs ticker matches
        });
        addedCIKs.add(cik);
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      tickerCount: this.tickerMappings.size,
      companyCount: this.cikMappings.size,
      lastFetchTime: this.lastFetchTime,
      cacheExpiry: this.lastFetchTime 
        ? new Date(this.lastFetchTime.getTime() + this.cacheDurationMs)
        : null,
    };
  }
}

// Export singleton instance for convenience
export const defaultCompanyResolver = new CompanyResolver();