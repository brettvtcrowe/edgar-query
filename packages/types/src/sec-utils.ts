/**
 * SEC EDGAR Utilities
 * Core utilities for working with SEC data formats and URLs
 */

import { z } from 'zod';
import { CIKSchema, AccessionNumberSchema, TickerSchema } from './index.js';

// SEC URL Base Constants
export const SEC_URLS = {
  ARCHIVES: 'https://www.sec.gov/Archives/edgar/data',
  SUBMISSIONS: 'https://data.sec.gov/submissions',
  COMPANY_FACTS: 'https://data.sec.gov/api/xbrl/companyfacts',
  COMPANY_TICKERS: 'https://www.sec.gov/files/company_tickers.json',
} as const;

/**
 * Pad CIK to standard 10-digit format
 * @param cik - Raw CIK number (string or number)
 * @returns Padded 10-digit CIK string
 */
export function padCIK(cik: string | number): string {
  const cikStr = cik.toString();
  return cikStr.padStart(10, '0');
}

/**
 * Validate and format CIK
 * @param cik - Raw CIK to validate
 * @returns Validated and formatted CIK
 * @throws Error if CIK is invalid
 */
export function validateCIK(cik: string | number): string {
  const paddedCIK = padCIK(cik);
  const result = CIKSchema.safeParse(paddedCIK);
  
  if (!result.success) {
    throw new Error(`Invalid CIK: ${cik}. ${result.error.errors[0]?.message}`);
  }
  
  return result.data;
}

/**
 * Validate and format ticker symbol
 * @param ticker - Raw ticker to validate
 * @returns Validated and formatted ticker
 * @throws Error if ticker is invalid
 */
export function validateTicker(ticker: string): string {
  const result = TickerSchema.safeParse(ticker);
  
  if (!result.success) {
    throw new Error(`Invalid ticker: ${ticker}. ${result.error.errors[0]?.message}`);
  }
  
  return result.data;
}

/**
 * Validate and format accession number
 * @param accessionNumber - Raw accession number to validate
 * @returns Validated accession number
 * @throws Error if accession number is invalid
 */
export function validateAccessionNumber(accessionNumber: string): string {
  const result = AccessionNumberSchema.safeParse(accessionNumber);
  
  if (!result.success) {
    throw new Error(`Invalid accession number: ${accessionNumber}. ${result.error.errors[0]?.message}`);
  }
  
  return result.data;
}

/**
 * Parse accession number into components
 * @param accessionNumber - Formatted accession number (0000000000-00-000000)
 * @returns Parsed components
 */
export function parseAccessionNumber(accessionNumber: string) {
  const validated = validateAccessionNumber(accessionNumber);
  const parts = validated.split('-');
  
  return {
    cik: parts[0]!,
    year: `20${parts[1]!}`, // Convert YY to YYYY
    sequence: parts[2]!,
    raw: validated,
    normalized: validated.replace(/-/g, ''), // Remove dashes for URLs
  };
}

/**
 * Build SEC EDGAR archive URL for a specific filing
 * @param cik - Company CIK
 * @param accessionNumber - Filing accession number
 * @param filename - Optional specific filename (defaults to primary document)
 * @returns Complete SEC archive URL
 */
export function buildArchiveURL(
  cik: string | number,
  accessionNumber: string,
  filename?: string
): string {
  const validatedCIK = validateCIK(cik);
  const parsedAccession = parseAccessionNumber(accessionNumber);
  
  // Base URL structure: /Archives/edgar/data/CIK/ACCESSION_NO_DASHES/
  const baseURL = `${SEC_URLS.ARCHIVES}/${validatedCIK}/${parsedAccession.normalized}`;
  
  if (filename) {
    return `${baseURL}/${filename}`;
  }
  
  // Default to primary document (usually the main filing)
  return `${baseURL}/${parsedAccession.raw.replace(/-/g, '')}.txt`;
}

/**
 * Build SEC submissions URL for company data
 * @param cik - Company CIK
 * @returns SEC submissions API URL
 */
export function buildSubmissionsURL(cik: string | number): string {
  const validatedCIK = validateCIK(cik);
  return `${SEC_URLS.SUBMISSIONS}/CIK${validatedCIK}.json`;
}

/**
 * Build SEC company facts URL for XBRL data
 * @param cik - Company CIK
 * @returns SEC company facts API URL
 */
export function buildCompanyFactsURL(cik: string | number): string {
  const validatedCIK = validateCIK(cik);
  return `${SEC_URLS.COMPANY_FACTS}/CIK${validatedCIK}.json`;
}

/**
 * Extract CIK from various SEC URL formats
 * @param url - SEC URL containing CIK
 * @returns Extracted and validated CIK
 */
export function extractCIKFromURL(url: string): string | null {
  // Match CIK patterns in various SEC URL formats
  const patterns = [
    /\/CIK(\d+)\.json/i,           // /CIKNNNNNNNNN.json
    /\/data\/(\d+)\//,             // /data/NNNNNNNNN/
    /cik=(\d+)/i,                  // cik=NNNNNNNNN
    /cik\/(\d+)/i,                 // cik/NNNNNNNNN
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      try {
        return validateCIK(match[1]);
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Generate User-Agent string for SEC compliance
 * @param appName - Application name
 * @param version - Application version
 * @param contact - Contact email
 * @returns Compliant User-Agent string
 */
export function buildUserAgent(
  appName: string = 'EdgarAnswerEngine',
  version: string = '1.0',
  contact: string = 'contact@example.com'
): string {
  return `${appName}/${version} (${contact})`;
}

/**
 * Extract filing form type from filename or URL
 * @param filenameOrUrl - Filename or URL to analyze
 * @returns Detected form type or null
 */
export function detectFormType(filenameOrUrl: string): string | null {
  const formPatterns = [
    /\b(10-K)\b/i,
    /\b(10-Q)\b/i,  
    /\b(8-K)\b/i,
    /\b(10-KT)\b/i,
    /\b(10-QT)\b/i,
    /\b(S-1)\b/i,
    /\b(S-3)\b/i,
    /\b(20-F)\b/i,
    /\b(DEF 14A)\b/i,
  ];
  
  for (const pattern of formPatterns) {
    const match = filenameOrUrl.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Create filing cache key for consistent caching
 * @param cik - Company CIK
 * @param accessionNumber - Filing accession number
 * @param section - Optional section identifier
 * @returns Cache key string
 */
export function createFilingCacheKey(
  cik: string | number,
  accessionNumber: string,
  section?: string
): string {
  const validatedCIK = validateCIK(cik);
  const validatedAccession = validateAccessionNumber(accessionNumber);
  
  const baseKey = `filing:${validatedCIK}:${validatedAccession}`;
  return section ? `${baseKey}:${section}` : baseKey;
}

/**
 * Fiscal period utilities
 */
export const FiscalPeriod = {
  /**
   * Parse fiscal period from various formats
   */
  parse(period: string): { quarter?: number; year: number; period: 'Q1' | 'Q2' | 'Q3' | 'FY' } | null {
    const patterns = [
      /Q([1-3])\s*(\d{4})/i,  // Q1 2024, Q2 2024, etc.
      /(\d{4})\s*Q([1-3])/i,  // 2024 Q1, etc.
      /FY\s*(\d{4})/i,        // FY 2024
      /(\d{4})\s*FY/i,        // 2024 FY
    ];
    
    for (const pattern of patterns) {
      const match = period.match(pattern);
      if (match) {
        if (pattern.source.includes('Q')) {
          const quarter = parseInt(match[1]! || match[2]!);
          const year = parseInt(match[2]! || match[1]!);
          return {
            quarter,
            year,
            period: `Q${quarter}` as 'Q1' | 'Q2' | 'Q3',
          };
        } else {
          const year = parseInt(match[1]!);
          return {
            year,
            period: 'FY',
          };
        }
      }
    }
    
    return null;
  },
  
  /**
   * Format fiscal period consistently
   */
  format(quarter: number | null, year: number): string {
    return quarter ? `Q${quarter} ${year}` : `FY ${year}`;
  },
};