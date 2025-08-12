/**
 * SEC Submissions Fetcher
 * Fetches and parses company filing submissions from SEC EDGAR
 */

import { z } from 'zod';
import { validateCIK, buildSubmissionsURL, parseAccessionNumber } from './sec-utils.js';
import type { EdgarMCPFiling } from './index.js';

// Default User-Agent for SEC compliance
function buildUserAgent(
  appName: string = 'EdgarAnswerEngine',
  version: string = '1.0',
  contact: string = 'contact@example.com'
): string {
  return `${appName}/${version} (${contact})`;
}

// SEC Submissions Response Schema
const SECFilingSchema = z.object({
  accessionNumber: z.string(),
  filingDate: z.string(),
  reportDate: z.string().nullable(),
  acceptanceDateTime: z.string().optional(),
  act: z.string().optional(),
  form: z.string(),
  fileNumber: z.string().optional(),
  filmNumber: z.string().optional(),
  items: z.string().optional(),
  size: z.number().optional(),
  isXBRL: z.number().optional(),
  isInlineXBRL: z.number().optional(),
  primaryDocument: z.string().optional(),
  primaryDocDescription: z.string().optional(),
});

const SECSubmissionsResponseSchema = z.object({
  cik: z.string(),
  entityType: z.string().optional(),
  sic: z.string().optional(),
  sicDescription: z.string().optional(),
  insiderTransactionForOwnerExists: z.number().optional(),
  insiderTransactionForIssuerExists: z.number().optional(),
  name: z.string(),
  tickers: z.array(z.string()).optional(),
  exchanges: z.array(z.string()).optional(),
  ein: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  investorWebsite: z.string().optional(),
  category: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  stateOfIncorporation: z.string().optional(),
  stateOfIncorporationDescription: z.string().optional(),
  addresses: z.object({
    mailing: z.object({
      street1: z.string().nullable().optional(),
      street2: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      stateOrCountry: z.string().nullable().optional(),
      zipCode: z.string().nullable().optional(),
      stateOrCountryDescription: z.string().nullable().optional(),
    }).optional(),
    business: z.object({
      street1: z.string().nullable().optional(),
      street2: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      stateOrCountry: z.string().nullable().optional(),
      zipCode: z.string().nullable().optional(),
      stateOrCountryDescription: z.string().nullable().optional(),
    }).optional(),
  }).optional(),
  phone: z.string().optional(),
  flags: z.string().optional(),
  formerNames: z.array(z.object({
    name: z.string(),
    from: z.string(),
    to: z.string(),
  })).optional(),
  filings: z.object({
    recent: z.object({
      accessionNumber: z.array(z.string()),
      filingDate: z.array(z.string()),
      reportDate: z.array(z.string()),
      acceptanceDateTime: z.array(z.string()),
      act: z.array(z.string()),
      form: z.array(z.string()),
      fileNumber: z.array(z.string()),
      filmNumber: z.array(z.string()),
      items: z.array(z.string()),
      size: z.array(z.number()),
      isXBRL: z.array(z.number()),
      isInlineXBRL: z.array(z.number()),
      primaryDocument: z.array(z.string()),
      primaryDocDescription: z.array(z.string()),
    }),
    files: z.array(z.object({
      name: z.string(),
      filingCount: z.number(),
      filingFrom: z.string(),
      filingTo: z.string(),
    })).optional(),
  }),
});

type SECFiling = z.infer<typeof SECFilingSchema>;
type SECSubmissionsResponse = z.infer<typeof SECSubmissionsResponseSchema>;

// Filing filter options
export interface FilingFilter {
  formTypes?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// Parsed filing type
export interface ParsedFiling extends EdgarMCPFiling {
  acceptanceDateTime?: string;
  act?: string;
  fileNumber?: string;
  filmNumber?: string;
  items?: string;
  isXBRL?: boolean;
  isInlineXBRL?: boolean;
  primaryDocument?: string;
  primaryDocDescription?: string;
}

/**
 * SubmissionsFetcher class for retrieving company filings
 */
export class SubmissionsFetcher {
  private userAgent: string;
  private cache: Map<string, { data: SECSubmissionsResponse; fetchTime: Date }> = new Map();
  private cacheDurationMs = 15 * 60 * 1000; // 15 minutes

  constructor(userAgent?: string) {
    this.userAgent = userAgent || buildUserAgent();
  }

  /**
   * Fetch raw submissions data from SEC
   * @param cik - Company CIK
   * @param useCache - Whether to use cached data if available
   * @returns Raw SEC submissions response
   */
  async fetchRawSubmissions(cik: string | number, useCache = true): Promise<SECSubmissionsResponse> {
    const validatedCIK = validateCIK(cik);
    
    // Check cache
    if (useCache) {
      const cached = this.cache.get(validatedCIK);
      if (cached && Date.now() - cached.fetchTime.getTime() < this.cacheDurationMs) {
        return cached.data;
      }
    }

    const url = buildSubmissionsURL(validatedCIK);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const parsed = SECSubmissionsResponseSchema.parse(data);

      // Cache the result
      this.cache.set(validatedCIK, {
        data: parsed,
        fetchTime: new Date(),
      });

      return parsed;
    } catch (error) {
      throw new Error(`Failed to fetch submissions for CIK ${validatedCIK}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse raw submissions into structured filing objects
   * @param submissions - Raw SEC submissions response
   * @returns Array of parsed filings
   */
  private parseSubmissions(submissions: SECSubmissionsResponse): ParsedFiling[] {
    const filings: ParsedFiling[] = [];
    const recent = submissions.filings.recent;

    // Parse recent filings (arrays of parallel data)
    const filingCount = recent.accessionNumber.length;
    
    for (let i = 0; i < filingCount; i++) {
      const filing: ParsedFiling = {
        accessionNumber: recent.accessionNumber[i]!,
        filingDate: recent.filingDate[i]!,
        reportDate: recent.reportDate[i]!,
        form: recent.form[i]!,
        companyName: submissions.name,
        cik: submissions.cik,
        size: recent.size[i],
        documentCount: 1, // Default, can be updated if we parse the filing
        acceptanceDateTime: recent.acceptanceDateTime[i],
        act: recent.act[i],
        fileNumber: recent.fileNumber[i],
        filmNumber: recent.filmNumber[i],
        items: recent.items[i],
        isXBRL: recent.isXBRL[i] === 1,
        isInlineXBRL: recent.isInlineXBRL[i] === 1,
        primaryDocument: recent.primaryDocument[i],
        primaryDocDescription: recent.primaryDocDescription[i],
      };

      filings.push(filing);
    }

    return filings;
  }

  /**
   * Fetch and filter company filings
   * @param cik - Company CIK
   * @param filter - Optional filtering criteria
   * @returns Filtered array of filings
   */
  async fetchFilings(cik: string | number, filter?: FilingFilter): Promise<ParsedFiling[]> {
    const submissions = await this.fetchRawSubmissions(cik);
    let filings = this.parseSubmissions(submissions);

    // Apply filters
    if (filter) {
      // Filter by form types
      if (filter.formTypes && filter.formTypes.length > 0) {
        const formTypesUpper = filter.formTypes.map(f => f.toUpperCase());
        filings = filings.filter(f => 
          formTypesUpper.some(formType => 
            f.form.toUpperCase().includes(formType)
          )
        );
      }

      // Filter by date range
      if (filter.startDate) {
        filings = filings.filter(f => 
          new Date(f.filingDate) >= filter.startDate!
        );
      }

      if (filter.endDate) {
        filings = filings.filter(f => 
          new Date(f.filingDate) <= filter.endDate!
        );
      }

      // Apply limit
      if (filter.limit && filter.limit > 0) {
        filings = filings.slice(0, filter.limit);
      }
    }

    return filings;
  }

  /**
   * Get recent filings of specific types
   * @param cik - Company CIK
   * @param formTypes - Array of form types (e.g., ['10-K', '10-Q'])
   * @param limit - Maximum number of filings to return
   * @returns Array of recent filings
   */
  async getRecentFilings(
    cik: string | number, 
    formTypes?: string[], 
    limit = 10
  ): Promise<ParsedFiling[]> {
    return this.fetchFilings(cik, { formTypes, limit });
  }

  /**
   * Get the most recent filing of a specific type
   * @param cik - Company CIK
   * @param formType - Form type (e.g., '10-K')
   * @returns Most recent filing or null if none found
   */
  async getMostRecentFiling(
    cik: string | number,
    formType: string
  ): Promise<ParsedFiling | null> {
    const filings = await this.fetchFilings(cik, {
      formTypes: [formType],
      limit: 1,
    });

    return filings[0] || null;
  }

  /**
   * Get filings within a date range
   * @param cik - Company CIK
   * @param startDate - Start date
   * @param endDate - End date
   * @param formTypes - Optional form type filter
   * @returns Array of filings within date range
   */
  async getFilingsByDateRange(
    cik: string | number,
    startDate: Date,
    endDate: Date,
    formTypes?: string[]
  ): Promise<ParsedFiling[]> {
    return this.fetchFilings(cik, { startDate, endDate, formTypes });
  }

  /**
   * Get company information from submissions
   * @param cik - Company CIK
   * @returns Company information
   */
  async getCompanyInfo(cik: string | number) {
    const submissions = await this.fetchRawSubmissions(cik);
    
    return {
      cik: submissions.cik,
      name: submissions.name,
      tickers: submissions.tickers || [],
      exchanges: submissions.exchanges || [],
      sic: submissions.sic,
      sicDescription: submissions.sicDescription,
      entityType: submissions.entityType,
      category: submissions.category,
      fiscalYearEnd: submissions.fiscalYearEnd,
      stateOfIncorporation: submissions.stateOfIncorporation,
      website: submissions.website,
      investorWebsite: submissions.investorWebsite,
      phone: submissions.phone,
      addresses: submissions.addresses,
      formerNames: submissions.formerNames || [],
    };
  }

  /**
   * Clear cache for a specific CIK or all cached data
   * @param cik - Optional CIK to clear, or clear all if not provided
   */
  clearCache(cik?: string | number) {
    if (cik) {
      const validatedCIK = validateCIK(cik);
      this.cache.delete(validatedCIK);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const stats = {
      totalCached: this.cache.size,
      cacheEntries: [] as { cik: string; age: number; expired: boolean }[],
    };

    for (const [cik, entry] of this.cache.entries()) {
      const age = now - entry.fetchTime.getTime();
      stats.cacheEntries.push({
        cik,
        age,
        expired: age > this.cacheDurationMs,
      });
    }

    return stats;
  }
}

// Export singleton instance for convenience
export const defaultSubmissionsFetcher = new SubmissionsFetcher();