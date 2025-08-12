/**
 * Direct SEC API Client
 * Fallback implementation when MCP service is unavailable
 */

import { z } from 'zod';
import type { 
  EDGARClientConfig,
  CompanyInfo,
  Filing,
  FilingContent,
  FinancialFact
} from './types.js';
import { SECAPIError, RateLimitError } from './types.js';

export class SECAPIClient {
  private baseUrl = 'https://data.sec.gov';
  private archiveUrl = 'https://www.sec.gov/Archives/edgar';
  private userAgent: string;
  private maxRetries: number;
  private retryDelay: number;
  private lastRequestTime = 0;
  private minRequestInterval = 100; // 10 requests per second max

  constructor(private config: EDGARClientConfig) {
    this.userAgent = config.secUserAgent;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Get CIK by ticker symbol
   */
  async getCIKByTicker(ticker: string): Promise<string> {
    const tickers = await this.getCompanyTickers();
    const upperTicker = ticker.toUpperCase();
    
    for (const [key, company] of Object.entries(tickers)) {
      const comp = company as any;
      if (comp.ticker === upperTicker) {
        return this.padCIK(comp.cik_str);
      }
    }
    
    throw new SECAPIError(`Ticker ${ticker} not found`);
  }

  /**
   * Get company information
   */
  async getCompanyInfo(identifier: string): Promise<CompanyInfo> {
    // Resolve identifier to CIK
    const cik = await this.resolveCIK(identifier);
    
    // Get submissions data
    const submissions = await this.getSubmissions(cik);
    
    return {
      cik,
      name: submissions.name,
      tickers: submissions.tickers || [],
      exchanges: submissions.exchanges || [],
      sic: submissions.sic,
      sicDescription: submissions.sicDescription,
      category: submissions.category,
      entityType: submissions.entityType,
      website: submissions.website
    };
  }

  /**
   * Search for companies
   */
  async searchCompanies(query: string): Promise<CompanyInfo[]> {
    const tickers = await this.getCompanyTickers();
    const lowerQuery = query.toLowerCase();
    const results: CompanyInfo[] = [];
    
    for (const [key, company] of Object.entries(tickers)) {
      const comp = company as any;
      if (
        comp.ticker?.toLowerCase().includes(lowerQuery) ||
        comp.title?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          cik: this.padCIK(comp.cik_str),
          name: comp.title,
          tickers: [comp.ticker].filter(Boolean)
        });
        
        if (results.length >= 10) break; // Limit results
      }
    }
    
    return results;
  }

  /**
   * Get recent filings
   */
  async getRecentFilings(params: {
    identifier?: string;
    form_type?: string;
    days?: number;
    limit?: number;
  }): Promise<Filing[]> {
    if (!params.identifier) {
      throw new SECAPIError('Identifier is required for SEC API');
    }
    
    const cik = await this.resolveCIK(params.identifier);
    const submissions = await this.getSubmissions(cik);
    
    let filings: Filing[] = [];
    const limit = params.limit || 10;
    const cutoffDate = params.days 
      ? new Date(Date.now() - params.days * 24 * 60 * 60 * 1000)
      : null;
    
    // Process recent filings
    for (let i = 0; i < submissions.filings.recent.accessionNumber.length && filings.length < limit; i++) {
      const form = submissions.filings.recent.form[i];
      const filingDate = submissions.filings.recent.filingDate[i];
      
      // Filter by form type if specified
      if (params.form_type && !form.includes(params.form_type)) {
        continue;
      }
      
      // Filter by date if specified
      if (cutoffDate && new Date(filingDate) < cutoffDate) {
        break; // Assuming filings are in reverse chronological order
      }
      
      filings.push({
        accessionNumber: submissions.filings.recent.accessionNumber[i],
        filingDate,
        reportDate: submissions.filings.recent.reportDate[i],
        form,
        primaryDocument: submissions.filings.recent.primaryDocument[i],
        primaryDocDescription: submissions.filings.recent.primaryDocDescription[i],
        items: submissions.filings.recent.items?.[i]?.split(','),
        size: submissions.filings.recent.size?.[i],
        isXBRL: submissions.filings.recent.isXBRL?.[i] === 1,
        isInlineXBRL: submissions.filings.recent.isInlineXBRL?.[i] === 1
      });
    }
    
    return filings;
  }

  /**
   * Get filing content
   */
  async getFilingContent(params: {
    identifier: string;
    accession_number: string;
  }): Promise<FilingContent> {
    const cik = await this.resolveCIK(params.identifier);
    const cleanAccession = params.accession_number.replace(/-/g, '');
    
    // Construct filing URL
    const url = `${this.archiveUrl}/data/${cik}/${cleanAccession}/${params.accession_number}.txt`;
    
    const content = await this.fetchWithRetry(url, 'text');
    
    // Get metadata from submissions
    const submissions = await this.getSubmissions(cik);
    const filingIndex = submissions.filings.recent.accessionNumber.indexOf(params.accession_number);
    
    return {
      content,
      metadata: {
        form: submissions.filings.recent.form[filingIndex] || 'Unknown',
        filingDate: submissions.filings.recent.filingDate[filingIndex] || '',
        reportDate: submissions.filings.recent.reportDate[filingIndex],
        accessionNumber: params.accession_number,
        cik,
        companyName: submissions.name
      }
    };
  }

  /**
   * Get financial facts
   */
  async getFinancialFacts(identifier: string): Promise<FinancialFact[]> {
    const cik = await this.resolveCIK(identifier);
    const url = `${this.baseUrl}/api/xbrl/companyfacts/CIK${cik}.json`;
    
    const data = await this.fetchWithRetry(url);
    const facts: FinancialFact[] = [];
    
    // Extract some key facts (simplified)
    const concepts = data.facts?.['us-gaap'] || {};
    
    for (const [concept, conceptData] of Object.entries(concepts)) {
      const conceptInfo = conceptData as any;
      const units = conceptInfo.units || {};
      
      for (const [unit, unitData] of Object.entries(units)) {
        const values = unitData as any[];
        if (Array.isArray(values) && values.length > 0) {
          // Get the most recent value
          const recent = values[values.length - 1];
          facts.push({
            concept,
            value: recent.val,
            unit,
            period: recent.fy ? `${recent.fy}Q${recent.fp}` : recent.period,
            form: recent.form,
            filed: recent.filed
          });
        }
      }
      
      // Limit to key metrics
      if (facts.length >= 50) break;
    }
    
    return facts;
  }

  /**
   * Helper: Resolve identifier to CIK
   */
  private async resolveCIK(identifier: string): Promise<string> {
    // Check if already a CIK
    if (/^\d+$/.test(identifier)) {
      return this.padCIK(identifier);
    }
    
    // Try as ticker
    try {
      return await this.getCIKByTicker(identifier);
    } catch {
      // Try company search as fallback
      const results = await this.searchCompanies(identifier);
      if (results.length > 0) {
        return results[0].cik;
      }
      throw new SECAPIError(`Could not resolve identifier: ${identifier}`);
    }
  }

  /**
   * Helper: Get company tickers mapping
   */
  private async getCompanyTickers(): Promise<any> {
    const url = `https://www.sec.gov/files/company_tickers.json`;
    return this.fetchWithRetry(url);
  }

  /**
   * Helper: Get company submissions
   */
  private async getSubmissions(cik: string): Promise<any> {
    const url = `${this.baseUrl}/submissions/CIK${cik}.json`;
    return this.fetchWithRetry(url);
  }

  /**
   * Helper: Pad CIK to 10 digits
   */
  private padCIK(cik: string | number): string {
    return String(cik).padStart(10, '0');
  }

  /**
   * Helper: Rate-limited fetch with retry
   */
  private async fetchWithRetry(
    url: string, 
    responseType: 'json' | 'text' = 'json'
  ): Promise<any> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await this.sleep(this.minRequestInterval - timeSinceLastRequest);
    }
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        this.lastRequestTime = Date.now();
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Encoding': 'gzip, deflate',
            'Host': new URL(url).hostname
          }
        });
        
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          throw new RateLimitError('Rate limit exceeded', retryAfter);
        }
        
        if (response.status === 503) {
          // Service unavailable, retry with backoff
          if (attempt < this.maxRetries - 1) {
            await this.sleep(this.retryDelay * Math.pow(2, attempt));
            continue;
          }
        }
        
        if (!response.ok) {
          throw new SECAPIError(
            `SEC API error: ${response.status} ${response.statusText}`,
            { status: response.status, url }
          );
        }
        
        return responseType === 'json' 
          ? await response.json()
          : await response.text();
          
      } catch (error: any) {
        if (error instanceof RateLimitError) {
          // Wait for rate limit to reset
          await this.sleep((error.details?.retryAfter || 60) * 1000);
          continue;
        }
        
        if (error instanceof SECAPIError) {
          throw error;
        }
        
        if (attempt === this.maxRetries - 1) {
          throw new SECAPIError(
            `Failed to fetch from SEC API: ${error.message}`,
            { url, originalError: error }
          );
        }
        
        // Exponential backoff for network errors
        await this.sleep(this.retryDelay * Math.pow(2, attempt));
      }
    }
    
    throw new SECAPIError('Max retries exceeded');
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}