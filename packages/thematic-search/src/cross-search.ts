import { EDGARClient } from '@edgar-query/edgar-client';
import { 
  CrossSearchParams,
  CrossSearchParamsSchema,
  DiscoveredFiling,
  SearchResult,
  ProgressUpdate,
  SectionType
} from './types.js';

/**
 * Progress callback type for streaming updates
 */
export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * Simple BM25-like scoring parameters
 */
const BM25_K1 = 1.2;
const BM25_B = 0.75;

/**
 * Cross-document search across multiple filings
 * 
 * This function searches for content across discovered filings using:
 * - Basic text search with BM25-like scoring
 * - Section-aware searching when specified
 * - Result deduplication and ranking
 * - Snippet extraction for context
 * 
 * @param params - Search parameters including filings and query
 * @param edgarClient - EDGAR client for content fetching
 * @param progressCallback - Optional progress reporting
 * @returns Array of search results with scores and snippets
 */
export async function crossDocumentSearch(
  params: CrossSearchParams,
  edgarClient: EDGARClient,
  progressCallback?: ProgressCallback
): Promise<SearchResult[]> {
  
  // Validate and apply defaults
  const validatedParams = CrossSearchParamsSchema.parse({
    maxResults: 100,
    minScore: 0.1,
    includeSnippets: true,
    snippetLength: 200,
    deduplicateResults: true,
    ...params
  });
  
  const startTime = Date.now();
  
  try {
    progressCallback?.({
      operation: 'content-fetch',
      completed: 0,
      total: validatedParams.filings.length,
      currentItem: 'Starting content fetching...'
    });
    
    // Step 1: Fetch content for all filings
    const filingContents = await fetchFilingContents(
      validatedParams.filings,
      edgarClient,
      progressCallback
    );
    
    progressCallback?.({
      operation: 'search',
      completed: 0,
      total: filingContents.length,
      currentItem: 'Starting text search...'
    });
    
    // Step 2: Search across all content
    const allResults: SearchResult[] = [];
    const queryTerms = tokenizeQuery(validatedParams.query);
    
    for (let i = 0; i < filingContents.length; i++) {
      const { filing, content, sections } = filingContents[i];
      
      progressCallback?.({
        operation: 'search',
        completed: i,
        total: filingContents.length,
        currentItem: `Searching ${filing.companyName} ${filing.form}`,
        estimatedTimeRemaining: estimateTimeRemaining(startTime, i, filingContents.length)
      });
      
      try {
        const filingResults = searchFilingContent(
          filing,
          content,
          sections,
          queryTerms,
          validatedParams
        );
        
        allResults.push(...filingResults);
        
      } catch (error) {
        console.warn(`Search failed for filing ${filing.accession}:`, error);
        // Continue with other filings
      }
    }
    
    // Step 3: Score, sort, and deduplicate results
    const scoredResults = scoreResults(allResults, queryTerms, validatedParams);
    const filteredResults = filterResults(scoredResults, validatedParams);
    const sortedResults = sortResults(filteredResults);
    const finalResults = limitResults(sortedResults, validatedParams);
    
    progressCallback?.({
      operation: 'search',
      completed: filingContents.length,
      total: filingContents.length,
      currentItem: `Search complete: ${finalResults.length} results found`
    });
    
    return finalResults;
    
  } catch (error) {
    console.error('Cross-document search failed:', error);
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch content for all filings
 */
async function fetchFilingContents(
  filings: DiscoveredFiling[],
  edgarClient: EDGARClient,
  progressCallback?: ProgressCallback
): Promise<Array<{
  filing: DiscoveredFiling;
  content: string;
  sections: Array<{ type: SectionType; content: string; title?: string }>;
}>> {
  
  const results = [];
  
  for (let i = 0; i < filings.length; i++) {
    const filing = filings[i];
    
    progressCallback?.({
      operation: 'content-fetch',
      completed: i,
      total: filings.length,
      currentItem: `Fetching ${filing.companyName} ${filing.form}`,
      estimatedTimeRemaining: estimateTimeRemaining(Date.now(), i, filings.length)
    });
    
    try {
      // Try to get filing content with sections (MCP tool)
      const contentResult = await edgarClient.getFilingContent({
        identifier: filing.cik,
        accession_number: filing.accession
      });
      
      if (contentResult && contentResult.content) {
        // Parse sections if available
        const sections = parseContentSections(contentResult.content, filing.form);
        
        results.push({
          filing,
          content: contentResult.content,
          sections
        });
      } else {
        // Fallback: try to get raw filing text
        const rawContent = await fetchRawFilingContent(filing);
        
        results.push({
          filing,
          content: rawContent,
          sections: [{ type: 'business' as SectionType, content: rawContent }] // Default section
        });
      }
      
      // Rate limiting
      if (i < filings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.warn(`Failed to fetch content for ${filing.accession}:`, error);
      
      // Add empty entry to maintain indexing
      results.push({
        filing,
        content: '',
        sections: []
      });
    }
  }
  
  return results;
}

/**
 * Parse content into sections based on form type
 * This is a basic implementation - Phase 3 will have sophisticated sectionizers
 */
function parseContentSections(
  content: string,
  formType: string
): Array<{ type: SectionType; content: string; title?: string }> {
  
  // For now, return the whole content as a business section
  // Phase 3 will implement proper section parsing
  const sections: Array<{ type: SectionType; content: string; title?: string }> = [];
  
  if (formType.startsWith('10-')) {
    // Look for common 10-K/10-Q patterns
    sections.push({
      type: 'business',
      content: content,
      title: 'Full Filing Content'
    });
    
    // Simple MD&A detection (very basic)
    const mdaMatch = content.match(/item\s+7[^\n]*management[^\n]*discussion[^\n]*/i);
    if (mdaMatch) {
      const mdaStart = content.indexOf(mdaMatch[0]);
      const mdaContent = content.substring(mdaStart, mdaStart + 5000); // First 5k chars
      
      sections.push({
        type: 'md&a',
        content: mdaContent,
        title: 'Management Discussion and Analysis'
      });
    }
    
    // Simple Risk Factors detection
    const riskMatch = content.match(/item\s+1a[^\n]*risk\s+factors[^\n]*/i);
    if (riskMatch) {
      const riskStart = content.indexOf(riskMatch[0]);
      const riskContent = content.substring(riskStart, riskStart + 10000); // First 10k chars
      
      sections.push({
        type: 'risk-factors',
        content: riskContent,
        title: 'Risk Factors'
      });
    }
    
  } else if (formType === '8-K') {
    sections.push({
      type: '8k-events',
      content: content,
      title: '8-K Event Disclosure'
    });
  } else {
    sections.push({
      type: 'business',
      content: content,
      title: 'Filing Content'
    });
  }
  
  return sections.filter(s => s.content.length > 100); // Filter out tiny sections
}

/**
 * Fallback: fetch raw filing content via direct URL
 */
async function fetchRawFilingContent(filing: DiscoveredFiling): Promise<string> {
  try {
    // This would typically fetch from the SEC directly
    // For now, return empty string as placeholder
    console.warn(`Raw content fetch not implemented for ${filing.accession}`);
    return '';
  } catch (error) {
    console.error('Raw content fetch failed:', error);
    return '';
  }
}

/**
 * Search within a single filing's content
 */
function searchFilingContent(
  filing: DiscoveredFiling,
  content: string,
  sections: Array<{ type: SectionType; content: string; title?: string }>,
  queryTerms: string[],
  params: CrossSearchParams
): SearchResult[] {
  
  const results: SearchResult[] = [];
  
  // Determine which sections to search
  const sectionsToSearch = params.sections 
    ? sections.filter(s => params.sections!.includes(s.type))
    : sections;
    
  if (sectionsToSearch.length === 0 && sections.length > 0) {
    // If no matching sections found but we have sections, search all
    sectionsToSearch.push(...sections);
  }
  
  // Search each section
  for (const section of sectionsToSearch) {
    const matches = findMatches(section.content, queryTerms);
    
    if (matches.length > 0) {
      // Calculate base score for this section
      const baseScore = calculateBM25Score(section.content, queryTerms);
      
      // Create result for each significant match
      for (const match of matches) {
        const snippet = params.includeSnippets 
          ? extractSnippet(section.content, match.position, params.snippetLength || 200)
          : undefined;
          
        results.push({
          filing,
          section: section.type,
          score: baseScore * match.score, // Combine section and match scores
          matchCount: matches.length,
          snippet: snippet?.text,
          snippetStart: snippet?.start,
          snippetEnd: snippet?.end,
          sectionTitle: section.title,
          sourceUrl: filing.primaryUrl,
          citationText: createCitationText(filing, section)
        });
      }
    }
  }
  
  return results;
}

/**
 * Find matches for query terms in content
 */
function findMatches(content: string, queryTerms: string[]): Array<{
  position: number;
  score: number;
  matchedTerms: string[];
}> {
  
  const matches = [];
  const contentLower = content.toLowerCase();
  const termPositions: Record<string, number[]> = {};
  
  // Find positions of all query terms
  for (const term of queryTerms) {
    const termLower = term.toLowerCase();
    const positions = [];
    
    let pos = contentLower.indexOf(termLower);
    while (pos !== -1) {
      positions.push(pos);
      pos = contentLower.indexOf(termLower, pos + 1);
    }
    
    if (positions.length > 0) {
      termPositions[term] = positions;
    }
  }
  
  // Find clusters of terms (proximity scoring)
  const allPositions = Object.entries(termPositions)
    .flatMap(([term, positions]) => 
      positions.map(pos => ({ term, position: pos }))
    )
    .sort((a, b) => a.position - b.position);
    
  // Group nearby positions into matches
  let currentMatch: { position: number; score: number; matchedTerms: string[] } | null = null;
  
  for (const { term, position } of allPositions) {
    if (!currentMatch || position - currentMatch.position > 500) {
      // Start new match
      if (currentMatch && currentMatch.matchedTerms.length > 0) {
        matches.push(currentMatch);
      }
      
      currentMatch = {
        position,
        score: 1,
        matchedTerms: [term]
      };
    } else {
      // Add to current match
      if (!currentMatch.matchedTerms.includes(term)) {
        currentMatch.matchedTerms.push(term);
        currentMatch.score += 1;
      }
    }
  }
  
  // Add final match
  if (currentMatch && currentMatch.matchedTerms.length > 0) {
    matches.push(currentMatch);
  }
  
  return matches;
}

/**
 * Calculate BM25-like score for content
 */
function calculateBM25Score(content: string, queryTerms: string[]): number {
  const contentWords = tokenizeText(content);
  const avgDocLength = 1000; // Approximate average document length
  
  let score = 0;
  
  for (const term of queryTerms) {
    const termFreq = countOccurrences(contentWords, term.toLowerCase());
    const docLength = contentWords.length;
    
    if (termFreq > 0) {
      const tf = (termFreq * (BM25_K1 + 1)) / 
                  (termFreq + BM25_K1 * (1 - BM25_B + BM25_B * (docLength / avgDocLength)));
      
      score += tf;
    }
  }
  
  // Normalize score
  return Math.min(score / queryTerms.length, 1);
}

/**
 * Extract snippet around match position
 */
function extractSnippet(
  content: string, 
  position: number, 
  length: number
): { text: string; start: number; end: number } {
  
  const halfLength = Math.floor(length / 2);
  const start = Math.max(0, position - halfLength);
  const end = Math.min(content.length, position + halfLength);
  
  let snippet = content.substring(start, end);
  
  // Try to break at word boundaries
  if (start > 0) {
    const firstSpace = snippet.indexOf(' ');
    if (firstSpace > 0 && firstSpace < 20) {
      snippet = snippet.substring(firstSpace + 1);
    }
  }
  
  if (end < content.length) {
    const lastSpace = snippet.lastIndexOf(' ');
    if (lastSpace > snippet.length - 20 && lastSpace > 0) {
      snippet = snippet.substring(0, lastSpace);
    }
  }
  
  return {
    text: snippet.trim(),
    start: start,
    end: end
  };
}

/**
 * Create citation text for result
 */
function createCitationText(
  filing: DiscoveredFiling, 
  section: { type: SectionType; title?: string }
): string {
  
  const companyName = filing.companyName;
  const form = filing.form;
  const filedDate = new Date(filing.filedAt).toLocaleDateString();
  const sectionName = section.title || section.type;
  
  return `${companyName} ${form} filed ${filedDate}, ${sectionName}`;
}

/**
 * Utility functions
 */
function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2) // Remove very short terms
    .filter(term => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(term));
}

function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

function countOccurrences(words: string[], target: string): number {
  return words.filter(word => word === target).length;
}

function scoreResults(results: SearchResult[], queryTerms: string[], params: CrossSearchParams): SearchResult[] {
  // Results already have base scores, could add additional scoring here
  return results;
}

function filterResults(results: SearchResult[], params: CrossSearchParams): SearchResult[] {
  return results.filter(result => result.score >= (params.minScore || 0.1));
}

function sortResults(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => {
    // Primary sort: by score (descending)
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    
    // Secondary sort: by filing date (descending - more recent first)
    return new Date(b.filing.filedAt).getTime() - new Date(a.filing.filedAt).getTime();
  });
}

function limitResults(results: SearchResult[], params: CrossSearchParams): SearchResult[] {
  const limited = results.slice(0, params.maxResults);
  
  // Deduplicate if requested
  if (params.deduplicateResults) {
    return deduplicateResults(limited);
  }
  
  return limited;
}

function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const deduplicated = [];
  
  for (const result of results) {
    const key = `${result.filing.accession}-${result.section}-${result.snippetStart}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(result);
    }
  }
  
  return deduplicated;
}

function estimateTimeRemaining(startTime: number, completed: number, total: number): number | undefined {
  if (completed === 0) return undefined;
  
  const elapsed = Date.now() - startTime;
  const avgTimePerItem = elapsed / completed;
  const remaining = total - completed;
  
  return Math.round((avgTimePerItem * remaining) / 1000);
}