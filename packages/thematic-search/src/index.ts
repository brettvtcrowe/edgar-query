/**
 * @edgar-query/thematic-search
 * 
 * Cross-document search and bulk filing discovery for thematic queries
 * 
 * This package enables queries like:
 * - "All 10-Ks mentioning revenue recognition in the past year"
 * - "Show me companies that disclosed cybersecurity incidents"
 * - "Find all 8-K restatements related to ASC 606"
 */

// Core functions
export { bulkFilingDiscovery, type ProgressCallback as BulkDiscoveryProgressCallback } from './bulk-discovery.js';
export { crossDocumentSearch, type ProgressCallback as CrossSearchProgressCallback } from './cross-search.js';

// High-level thematic search orchestration
export { thematicSearch, type ThematicSearchParams, type ThematicProgressCallback } from './thematic-search.js';

// Types
export type {
  // Parameters
  BulkDiscoveryParams,
  CrossSearchParams,
  
  // Results
  DiscoveredFiling,
  SearchResult,
  ThematicSearchResult,
  ThemeAggregation,
  
  // Enums
  Industry,
  FormType,
  SectionType,
  
  // Utility types
  DateRange,
  ProgressUpdate
} from './types.js';

// Version info
export const VERSION = '1.0.0';