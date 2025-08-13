import { z } from 'zod';

/**
 * Date range for filing discovery
 */
export const DateRangeSchema = z.object({
  start: z.string().describe('ISO date string (YYYY-MM-DD)'),
  end: z.string().describe('ISO date string (YYYY-MM-DD)'),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

/**
 * Industry classifications for filtering
 */
export const IndustrySchema = z.enum([
  'technology',
  'financial',
  'healthcare',
  'energy',
  'consumer',
  'industrial',
  'materials',
  'utilities',
  'telecommunications',
  'real-estate'
]);

export type Industry = z.infer<typeof IndustrySchema>;

/**
 * SEC form types for discovery
 */
export const FormTypeSchema = z.enum([
  '10-K', '10-Q', '8-K', 
  'S-1', 'S-3', 'S-4',
  '20-F', '6-K',
  'DEF 14A', 'DEFM14A',
  'UPLOAD', 'CORRESP'
]);

export type FormType = z.infer<typeof FormTypeSchema>;

/**
 * Section types for targeted search
 */
export const SectionTypeSchema = z.enum([
  'business',          // Item 1
  'risk-factors',      // Item 1A  
  'properties',        // Item 2
  'legal-proceedings', // Item 3
  'md&a',             // Item 7
  'market-risk',      // Item 7A
  'financial-statements', // Item 8
  'controls',         // Item 9A
  'accounting-policies',
  'notes-to-financials',
  '8k-events',
  'proxy-governance'
]);

export type SectionType = z.infer<typeof SectionTypeSchema>;

/**
 * Parameters for bulk filing discovery
 */
export const BulkDiscoveryParamsSchema = z.object({
  formTypes: z.array(FormTypeSchema).default(['10-K', '10-Q', '8-K']),
  dateRange: DateRangeSchema.optional(),
  industries: z.array(IndustrySchema).optional(),
  companies: z.array(z.string()).optional().describe('Array of tickers or company names'),
  maxResults: z.number().int().positive().default(1000),
  sortBy: z.enum(['filed-date', 'company', 'relevance']).default('filed-date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type BulkDiscoveryParams = {
  formTypes?: FormType[];
  dateRange?: DateRange;
  industries?: Industry[];
  companies?: string[];
  maxResults?: number;
  sortBy?: 'filed-date' | 'company' | 'relevance';
  sortOrder?: 'asc' | 'desc';
};

/**
 * Discovered filing metadata
 */
export const DiscoveredFilingSchema = z.object({
  cik: z.string(),
  companyName: z.string(),
  ticker: z.string().optional(),
  accession: z.string(),
  form: FormTypeSchema,
  filedAt: z.string().describe('ISO date string'),
  primaryUrl: z.string().url(),
  size: z.number().optional(),
  industry: IndustrySchema.optional(),
  // Cached content info
  hasContent: z.boolean().default(false),
  contentUrl: z.string().url().optional(),
  sectionCount: z.number().int().optional()
});

export type DiscoveredFiling = z.infer<typeof DiscoveredFilingSchema>;

/**
 * Parameters for cross-document search
 */
export const CrossSearchParamsSchema = z.object({
  filings: z.array(DiscoveredFilingSchema),
  query: z.string().min(1).describe('Search query text'),
  sections: z.array(SectionTypeSchema).optional().describe('Limit search to specific sections'),
  maxResults: z.number().int().positive().default(100),
  minScore: z.number().min(0).max(1).default(0.1).describe('Minimum relevance score'),
  includeSnippets: z.boolean().default(true),
  snippetLength: z.number().int().positive().default(200),
  deduplicateResults: z.boolean().default(true)
});

export type CrossSearchParams = {
  filings: DiscoveredFiling[];
  query: string;
  sections?: SectionType[];
  maxResults?: number;
  minScore?: number;
  includeSnippets?: boolean;
  snippetLength?: number;
  deduplicateResults?: boolean;
};

/**
 * Search result with content and metadata
 */
export const SearchResultSchema = z.object({
  // Filing metadata
  filing: DiscoveredFilingSchema,
  
  // Match details
  section: SectionTypeSchema.optional(),
  score: z.number().min(0).max(1),
  matchCount: z.number().int().nonnegative(),
  
  // Content
  snippet: z.string().optional(),
  snippetStart: z.number().int().optional(),
  snippetEnd: z.number().int().optional(),
  
  // Context
  sectionTitle: z.string().optional(),
  pageNumber: z.number().int().optional(),
  
  // Source attribution
  sourceUrl: z.string().url(),
  citationText: z.string().optional()
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Streaming progress for large operations
 */
export const ProgressUpdateSchema = z.object({
  operation: z.enum(['discovery', 'content-fetch', 'search', 'aggregation']),
  completed: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  currentItem: z.string().optional(),
  estimatedTimeRemaining: z.number().optional().describe('Seconds remaining')
});

export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;

/**
 * Aggregated results for thematic analysis
 */
export const ThemeAggregationSchema = z.object({
  theme: z.string(),
  matchingFilings: z.number().int().nonnegative(),
  companiesCount: z.number().int().nonnegative(),
  topCompanies: z.array(z.object({
    companyName: z.string(),
    ticker: z.string().optional(),
    matchCount: z.number().int().nonnegative(),
    avgScore: z.number().min(0).max(1)
  })),
  timeDistribution: z.record(z.string(), z.number()).optional(),
  keyTerms: z.array(z.string()).optional(),
  representative_snippets: z.array(z.string()).optional()
});

export type ThemeAggregation = z.infer<typeof ThemeAggregationSchema>;

/**
 * Complete thematic search result
 */
export const ThematicSearchResultSchema = z.object({
  query: z.string(),
  executionTime: z.number().positive(),
  
  // Discovery stats
  totalFilingsScanned: z.number().int().nonnegative(),
  matchingFilings: z.number().int().nonnegative(),
  companiesFound: z.number().int().nonnegative(),
  
  // Results
  results: z.array(SearchResultSchema),
  aggregations: z.array(ThemeAggregationSchema).optional(),
  
  // Metadata
  searchParams: CrossSearchParamsSchema,
  discoveryParams: BulkDiscoveryParamsSchema
});

export type ThematicSearchResult = z.infer<typeof ThematicSearchResultSchema>;