/**
 * Comprehensive test suite for thematic search functionality
 * 
 * Run with: npm run test
 * 
 * Tests cover:
 * 1. Bulk filing discovery
 * 2. Cross-document search
 * 3. End-to-end thematic search
 * 4. Progress reporting
 * 5. Error handling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { EDGARClient } from '@edgar-query/edgar-client';
import { 
  bulkFilingDiscovery,
  crossDocumentSearch, 
  thematicSearch,
  type BulkDiscoveryParams,
  type CrossSearchParams,
  type ThematicSearchParams,
  type ProgressUpdate
} from './index.js';

// Test configuration
const TEST_CONFIG = {
  USE_REAL_API: process.env.TEST_WITH_REAL_API === 'true',
  TIMEOUT: 30000, // 30 seconds for real API calls
};

describe('Thematic Search Package', () => {
  let edgarClient: EDGARClient;
  
  beforeAll(() => {
    // Initialize EDGAR client with test configuration
    edgarClient = new EDGARClient({
      mcpServiceUrl: process.env.EDGAR_MCP_SERVER_URL || 'https://edgar-query-production.up.railway.app',
      mcpApiKey: process.env.EDGAR_MCP_API_KEY || 'test-key',
      secUserAgent: 'EdgarAnswerEngine/1.0 (test@example.com)',
      enableFallback: true,
      cacheEnabled: true
    });
  });
  
  describe('Bulk Filing Discovery', () => {
    it('should discover filings for specific companies', async () => {
      const params: BulkDiscoveryParams = {
        companies: ['AAPL', 'MSFT'],
        formTypes: ['10-K', '10-Q'],
        maxResults: 10,
        sortBy: 'filed-date',
        sortOrder: 'desc'
      };
      
      const progressUpdates: ProgressUpdate[] = [];
      const results = await bulkFilingDiscovery(
        params,
        edgarClient,
        (update) => progressUpdates.push(update)
      );
      
      // Validate results structure
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      if (TEST_CONFIG.USE_REAL_API) {
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThanOrEqual(10);
        
        // Validate result structure
        for (const filing of results) {
          expect(filing.cik).toBeDefined();
          expect(filing.companyName).toBeDefined();
          expect(filing.accession).toBeDefined();
          expect(filing.form).toMatch(/^(10-K|10-Q)$/);
          expect(filing.filedAt).toBeDefined();
          expect(filing.primaryUrl).toMatch(/^https?:\/\//);
        }
        
        // Validate progress reporting
        expect(progressUpdates.length).toBeGreaterThan(0);
        expect(progressUpdates[0].operation).toBe('discovery');
        expect(progressUpdates[progressUpdates.length - 1].completed).toBeGreaterThan(0);
      }
    }, TEST_CONFIG.TIMEOUT);
    
    it('should filter by date range', async () => {
      const params: BulkDiscoveryParams = {
        companies: ['AAPL'],
        formTypes: ['10-K'],
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31'
        },
        maxResults: 5
      };
      
      const results = await bulkFilingDiscovery(params, edgarClient);
      
      if (TEST_CONFIG.USE_REAL_API) {
        expect(results.length).toBeGreaterThan(0);
        
        // All results should be within date range
        for (const filing of results) {
          const filedDate = new Date(filing.filedAt);
          const startDate = new Date(params.dateRange!.start);
          const endDate = new Date(params.dateRange!.end);
          
          expect(filedDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(filedDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
        }
      }
    }, TEST_CONFIG.TIMEOUT);
    
    it('should discover filings by industry', async () => {
      const params: BulkDiscoveryParams = {
        industries: ['technology'],
        formTypes: ['10-K'],
        maxResults: 15
      };
      
      const results = await bulkFilingDiscovery(params, edgarClient);
      
      expect(results).toBeDefined();
      
      if (TEST_CONFIG.USE_REAL_API) {
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThanOrEqual(15);
        
        // Should include tech companies
        const companies = results.map(r => r.ticker).filter(Boolean);
        const techTickers = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'];
        const hasTechCompany = companies.some(ticker => 
          techTickers.includes(ticker!)
        );
        expect(hasTechCompany).toBe(true);
      }
    }, TEST_CONFIG.TIMEOUT);
  });
  
  describe('Cross-Document Search', () => {
    it('should search across filing content', async () => {
      // First discover some filings
      const discoveryParams: BulkDiscoveryParams = {
        companies: ['AAPL'],
        formTypes: ['10-K'],
        maxResults: 2
      };
      
      const filings = await bulkFilingDiscovery(discoveryParams, edgarClient);
      
      if (filings.length === 0) {
        console.log('No filings discovered, skipping cross-search test');
        return;
      }
      
      // Then search across them
      const searchParams: CrossSearchParams = {
        filings,
        query: 'revenue recognition',
        maxResults: 10,
        minScore: 0.05,
        includeSnippets: true,
        snippetLength: 150
      };
      
      const progressUpdates: ProgressUpdate[] = [];
      const results = await crossDocumentSearch(
        searchParams,
        edgarClient,
        (update) => progressUpdates.push(update)
      );
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      if (TEST_CONFIG.USE_REAL_API && results.length > 0) {
        // Validate result structure
        for (const result of results) {
          expect(result.filing).toBeDefined();
          expect(result.score).toBeGreaterThan(0);
          expect(result.score).toBeLessThanOrEqual(1);
          expect(result.matchCount).toBeGreaterThan(0);
          expect(result.sourceUrl).toMatch(/^https?:\/\//);
          
          if (result.snippet) {
            expect(result.snippet.length).toBeGreaterThan(0);
            expect(result.snippet.length).toBeLessThanOrEqual(200);
          }
        }
        
        // Results should be sorted by score (descending)
        for (let i = 1; i < results.length; i++) {
          expect(results[i].score).toBeLessThanOrEqual(results[i-1].score);
        }
        
        // Validate progress reporting
        expect(progressUpdates.length).toBeGreaterThan(0);
        const operations = progressUpdates.map(u => u.operation);
        expect(operations).toContain('content-fetch');
        expect(operations).toContain('search');
      }
    }, TEST_CONFIG.TIMEOUT);
    
    it('should filter by sections', async () => {
      const discoveryParams: BulkDiscoveryParams = {
        companies: ['MSFT'],
        formTypes: ['10-K'],
        maxResults: 1
      };
      
      const filings = await bulkFilingDiscovery(discoveryParams, edgarClient);
      
      if (filings.length === 0) {
        console.log('No filings discovered, skipping section filter test');
        return;
      }
      
      const searchParams: CrossSearchParams = {
        filings,
        query: 'artificial intelligence',
        sections: ['risk-factors', 'business'],
        maxResults: 5,
        includeSnippets: true
      };
      
      const results = await crossDocumentSearch(searchParams, edgarClient);
      
      if (TEST_CONFIG.USE_REAL_API && results.length > 0) {
        // All results should be from specified sections
        for (const result of results) {
          if (result.section) {
            expect(['risk-factors', 'business']).toContain(result.section);
          }
        }
      }
    }, TEST_CONFIG.TIMEOUT);
  });
  
  describe('End-to-End Thematic Search', () => {
    it('should perform complete thematic search', async () => {
      const params: ThematicSearchParams = {
        query: 'cybersecurity',
        companies: ['AAPL', 'MSFT'],
        formTypes: ['10-K'],
        maxFilings: 4,
        maxResults: 8,
        minScore: 0.1,
        includeSnippets: true,
        includeAggregations: true
      };
      
      const progressUpdates: ProgressUpdate[] = [];
      const result = await thematicSearch(
        params,
        edgarClient,
        (update) => progressUpdates.push(update)
      );
      
      // Validate result structure
      expect(result).toBeDefined();
      expect(result.query).toBe('cybersecurity');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.totalFilingsScanned).toBeGreaterThanOrEqual(0);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.searchParams).toBeDefined();
      expect(result.discoveryParams).toBeDefined();
      
      if (TEST_CONFIG.USE_REAL_API) {
        expect(result.totalFilingsScanned).toBeGreaterThan(0);
        expect(result.totalFilingsScanned).toBeLessThanOrEqual(4);
        
        if (result.results.length > 0) {
          expect(result.matchingFilings).toBeGreaterThan(0);
          expect(result.companiesFound).toBeGreaterThan(0);
          expect(result.results.length).toBeLessThanOrEqual(8);
          
          // Validate aggregations
          if (result.aggregations && result.aggregations.length > 0) {
            const agg = result.aggregations[0];
            expect(agg.theme).toBe('cybersecurity');
            expect(agg.matchingFilings).toBe(result.results.length);
            expect(agg.topCompanies).toBeDefined();
            expect(Array.isArray(agg.topCompanies)).toBe(true);
          }
        }
        
        // Validate progress reporting
        expect(progressUpdates.length).toBeGreaterThan(0);
        const operations = new Set(progressUpdates.map(u => u.operation));
        expect(operations.has('discovery')).toBe(true);
      }
    }, TEST_CONFIG.TIMEOUT * 2); // Extended timeout for full search
    
    it('should handle industry-based thematic search', async () => {
      const params: ThematicSearchParams = {
        query: 'artificial intelligence',
        industries: ['technology'],
        formTypes: ['10-K'],
        maxFilings: 10,
        maxResults: 15,
        minScore: 0.08,
        includeAggregations: true
      };
      
      const result = await thematicSearch(params, edgarClient);
      
      expect(result.query).toBe('artificial intelligence');
      expect(result.discoveryParams.industries).toEqual(['technology']);
      
      if (TEST_CONFIG.USE_REAL_API && result.results.length > 0) {
        expect(result.totalFilingsScanned).toBeGreaterThan(0);
        expect(result.companiesFound).toBeGreaterThan(0);
        
        // Should find tech companies
        const companyNames = result.results.map(r => r.filing.ticker).filter(Boolean);
        const techTickers = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'];
        const hasTechCompany = companyNames.some(ticker => 
          techTickers.includes(ticker!)
        );
        expect(hasTechCompany).toBe(true);
      }
    }, TEST_CONFIG.TIMEOUT * 2);
  });
  
  describe('Error Handling', () => {
    it('should handle invalid parameters gracefully', async () => {
      const params = {
        formTypes: ['INVALID-FORM'] as any,
        maxResults: -1
      };
      
      await expect(bulkFilingDiscovery(params, edgarClient)).rejects.toThrow();
    });
    
    it('should handle empty query', async () => {
      const discoveryParams: BulkDiscoveryParams = {
        companies: ['AAPL'],
        formTypes: ['10-K'],
        maxResults: 1
      };
      
      const filings = await bulkFilingDiscovery(discoveryParams, edgarClient);
      
      const searchParams: CrossSearchParams = {
        filings,
        query: '', // Empty query
        maxResults: 10
      };
      
      await expect(crossDocumentSearch(searchParams, edgarClient)).rejects.toThrow();
    });
    
    it('should handle no filings found', async () => {
      const params: ThematicSearchParams = {
        query: 'nonexistent term xyz123',
        companies: ['AAPL'],
        formTypes: ['10-K'],
        dateRange: {
          start: '1990-01-01',
          end: '1990-12-31' // Old date range where no filings exist
        },
        maxResults: 5
      };
      
      const result = await thematicSearch(params, edgarClient);
      
      expect(result.totalFilingsScanned).toBe(0);
      expect(result.matchingFilings).toBe(0);
      expect(result.companiesFound).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });
  
  describe('Performance Tests', () => {
    it('should complete discovery within reasonable time', async () => {
      const startTime = Date.now();
      
      const params: BulkDiscoveryParams = {
        companies: ['AAPL', 'MSFT', 'GOOGL'],
        formTypes: ['10-K'],
        maxResults: 6
      };
      
      const results = await bulkFilingDiscovery(params, edgarClient);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(15000); // 15 seconds max
      
      if (TEST_CONFIG.USE_REAL_API) {
        expect(results.length).toBeGreaterThan(0);
      }
    }, 20000);
    
    it('should provide progress updates', async () => {
      const params: BulkDiscoveryParams = {
        companies: ['AAPL', 'MSFT'],
        formTypes: ['10-K'],
        maxResults: 4
      };
      
      const progressUpdates: ProgressUpdate[] = [];
      await bulkFilingDiscovery(
        params,
        edgarClient,
        (update) => progressUpdates.push(update)
      );
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // First update should be start of discovery
      expect(progressUpdates[0].operation).toBe('discovery');
      expect(progressUpdates[0].completed).toBe(0);
      
      // Last update should show completion
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate.completed).toBeGreaterThan(0);
      expect(lastUpdate.total).toBeGreaterThan(0);
    });
  });
});

/**
 * Manual testing function for development
 * Run with: npm run test:manual
 */
export async function runManualTest() {
  console.log('🧪 Running manual thematic search test...\n');
  
  const edgarClient = new EDGARClient({
    mcpServiceUrl: process.env.EDGAR_MCP_SERVER_URL || 'https://edgar-query-production.up.railway.app',
    mcpApiKey: process.env.EDGAR_MCP_API_KEY || 'test-key',
    secUserAgent: 'EdgarAnswerEngine/1.0 (test@example.com)',
    enableFallback: true
  });
  
  const params: ThematicSearchParams = {
    query: 'revenue recognition',
    companies: ['AAPL', 'MSFT'],
    formTypes: ['10-K'],
    maxFilings: 2,
    maxResults: 5,
    includeSnippets: true,
    includeAggregations: true
  };
  
  console.log('Parameters:', JSON.stringify(params, null, 2));
  console.log('\n📊 Progress updates:');
  
  const result = await thematicSearch(
    params,
    edgarClient,
    (update) => {
      console.log(`  ${update.operation}: ${update.completed}/${update.total} - ${update.currentItem || ''}`);
    }
  );
  
  console.log('\n✅ Results:');
  console.log(`Query: "${result.query}"`);
  console.log(`Execution time: ${result.executionTime}ms`);
  console.log(`Filings scanned: ${result.totalFilingsScanned}`);
  console.log(`Matching results: ${result.matchingFilings}`);
  console.log(`Companies found: ${result.companiesFound}`);
  
  if (result.results.length > 0) {
    console.log('\n📄 Top Results:');
    result.results.slice(0, 3).forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.filing.companyName} ${result.filing.form} (${result.filing.filedAt})`);
      console.log(`     Score: ${result.score.toFixed(3)}, Matches: ${result.matchCount}`);
      if (result.snippet) {
        console.log(`     Snippet: "${result.snippet.substring(0, 100)}..."`);
      }
      console.log('');
    });
  }
  
  if (result.aggregations && result.aggregations.length > 0) {
    const agg = result.aggregations[0];
    console.log('📈 Aggregations:');
    console.log(`  Theme: ${agg.theme}`);
    console.log(`  Companies: ${agg.companiesCount}`);
    console.log(`  Top Companies:`, agg.topCompanies.slice(0, 3));
  }
  
  console.log('\n✨ Manual test complete!');
}

// If run directly, execute manual test
if (process.argv[2] === 'manual') {
  runManualTest().catch(console.error);
}