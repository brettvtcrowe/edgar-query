import { EDGARClient } from '@edgar-query/edgar-client';
import { bulkFilingDiscovery, type ProgressCallback as BulkProgressCallback } from './bulk-discovery.js';
import { crossDocumentSearch, type ProgressCallback as SearchProgressCallback } from './cross-search.js';
import { 
  BulkDiscoveryParams,
  CrossSearchParams,
  ThematicSearchResult,
  ThemeAggregation,
  ProgressUpdate,
  SearchResult
} from './types.js';

/**
 * Combined parameters for thematic search
 */
export interface ThematicSearchParams {
  // Query
  query: string;
  
  // Discovery parameters
  formTypes?: BulkDiscoveryParams['formTypes'];
  dateRange?: BulkDiscoveryParams['dateRange'];
  industries?: BulkDiscoveryParams['industries'];
  companies?: BulkDiscoveryParams['companies'];
  maxFilings?: number;
  
  // Search parameters
  sections?: CrossSearchParams['sections'];
  maxResults?: number;
  minScore?: number;
  includeSnippets?: boolean;
  snippetLength?: number;
  
  // Aggregation
  includeAggregations?: boolean;
}

/**
 * Progress callback type
 */
export type ThematicProgressCallback = (update: ProgressUpdate) => void;

/**
 * High-level thematic search combining discovery and cross-document search
 * 
 * This is the main entry point for thematic queries like:
 * - "All 10-Ks mentioning revenue recognition"
 * - "Cybersecurity disclosures in tech companies"
 * - "ASC 606 restatements in the past year"
 * 
 * @param params - Combined search parameters
 * @param edgarClient - EDGAR client instance
 * @param progressCallback - Optional progress reporting
 * @returns Complete thematic search result with aggregations
 */
export async function thematicSearch(
  params: ThematicSearchParams,
  edgarClient: EDGARClient,
  progressCallback?: ThematicProgressCallback
): Promise<ThematicSearchResult> {
  
  const startTime = Date.now();
  
  try {
    // Step 1: Discover filings  
    const discoveryParams = {
      formTypes: params.formTypes || ['10-K', '10-Q', '8-K'],
      dateRange: params.dateRange,
      industries: params.industries,
      companies: params.companies,
      maxResults: params.maxFilings || 1000,
      sortBy: 'filed-date' as const,
      sortOrder: 'desc' as const
    };
    
    const discoveredFilings = await bulkFilingDiscovery(
      discoveryParams,
      edgarClient,
      progressCallback as BulkProgressCallback
    );
    
    if (discoveredFilings.length === 0) {
      return createEmptyResult(params, discoveryParams, startTime);
    }
    
    // Step 2: Search across discovered filings
    const searchParams = {
      filings: discoveredFilings,
      query: params.query,
      sections: params.sections,
      maxResults: params.maxResults || 100,
      minScore: params.minScore || 0.1,
      includeSnippets: params.includeSnippets !== false,
      snippetLength: params.snippetLength || 200,
      deduplicateResults: true
    };
    
    const searchResults = await crossDocumentSearch(
      searchParams,
      edgarClient,
      progressCallback as SearchProgressCallback
    );
    
    // Step 3: Generate aggregations if requested
    let aggregations: ThemeAggregation[] = [];
    if (params.includeAggregations !== false && searchResults.length > 0) {
      progressCallback?.({
        operation: 'aggregation',
        completed: 0,
        total: 1,
        currentItem: 'Generating theme aggregations...'
      });
      
      aggregations = generateAggregations(params.query, searchResults);
      
      progressCallback?.({
        operation: 'aggregation',
        completed: 1,
        total: 1,
        currentItem: 'Aggregation complete'
      });
    }
    
    // Step 4: Compile final result
    const executionTime = Date.now() - startTime;
    const uniqueCompanies = new Set(searchResults.map(r => r.filing.companyName)).size;
    
    const result: ThematicSearchResult = {
      query: params.query,
      executionTime,
      totalFilingsScanned: discoveredFilings.length,
      matchingFilings: searchResults.length,
      companiesFound: uniqueCompanies,
      results: searchResults,
      aggregations,
      searchParams,
      discoveryParams
    };
    
    return result;
    
  } catch (error) {
    console.error('Thematic search failed:', error);
    throw new Error(`Thematic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create empty result for when no filings are discovered
 */
function createEmptyResult(
  params: ThematicSearchParams,
  discoveryParams: any,
  startTime: number
): ThematicSearchResult {
  
  const searchParams = {
    filings: [],
    query: params.query,
    sections: params.sections,
    maxResults: params.maxResults || 100,
    minScore: params.minScore || 0.1,
    includeSnippets: params.includeSnippets !== false,
    snippetLength: params.snippetLength || 200,
    deduplicateResults: true
  };
  
  return {
    query: params.query,
    executionTime: Date.now() - startTime,
    totalFilingsScanned: 0,
    matchingFilings: 0,
    companiesFound: 0,
    results: [],
    aggregations: [],
    searchParams: searchParams as any,
    discoveryParams: discoveryParams as any
  };
}

/**
 * Generate theme aggregations from search results
 */
function generateAggregations(query: string, results: SearchResult[]): ThemeAggregation[] {
  if (results.length === 0) return [];
  
  // Group results by company
  const companiesByMatch: Record<string, {
    companyName: string;
    ticker?: string;
    results: SearchResult[];
  }> = {};
  
  for (const result of results) {
    const key = result.filing.companyName;
    if (!companiesByMatch[key]) {
      companiesByMatch[key] = {
        companyName: result.filing.companyName,
        ticker: result.filing.ticker,
        results: []
      };
    }
    companiesByMatch[key].results.push(result);
  }
  
  // Generate aggregation
  const topCompanies = Object.values(companiesByMatch)
    .map(company => ({
      companyName: company.companyName,
      ticker: company.ticker,
      matchCount: company.results.length,
      avgScore: company.results.reduce((sum, r) => sum + r.score, 0) / company.results.length
    }))
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 10);
  
  // Time distribution
  const timeDistribution: Record<string, number> = {};
  for (const result of results) {
    const year = new Date(result.filing.filedAt).getFullYear().toString();
    timeDistribution[year] = (timeDistribution[year] || 0) + 1;
  }
  
  // Key terms (simple extraction from query)
  const keyTerms = extractKeyTerms(query);
  
  // Representative snippets
  const representativeSnippets = results
    .filter(r => r.snippet && r.snippet.length > 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.snippet!)
    .filter(Boolean);
  
  const aggregation: ThemeAggregation = {
    theme: query,
    matchingFilings: results.length,
    companiesCount: Object.keys(companiesByMatch).length,
    topCompanies,
    timeDistribution,
    keyTerms,
    representative_snippets: representativeSnippets
  };
  
  return [aggregation];
}

/**
 * Extract key terms from query for aggregation
 */
function extractKeyTerms(query: string): string[] {
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
    'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'all', 'show', 
    'find', 'companies', 'filings', 'mentions', 'mentioning'
  ]);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2 && !stopWords.has(term))
    .slice(0, 5); // Limit to 5 key terms
}