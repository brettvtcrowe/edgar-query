/**
 * Query orchestration types
 */

import { z } from 'zod';

// Query pattern types
export enum QueryPattern {
  COMPANY_SPECIFIC = 'company_specific',
  THEMATIC = 'thematic', 
  HYBRID = 'hybrid',
  METADATA_ONLY = 'metadata_only'
}

// Query classification result
export const QueryClassificationSchema = z.object({
  pattern: z.nativeEnum(QueryPattern),
  confidence: z.number().min(0).max(1),
  entities: z.object({
    companies: z.array(z.string()).optional(),
    tickers: z.array(z.string()).optional(),
    ciks: z.array(z.string()).optional(),
    forms: z.array(z.string()).optional(),
    timeRanges: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional()
  }).optional(),
  reasoning: z.string().optional()
});

export type QueryClassification = z.infer<typeof QueryClassificationSchema>;

// Query execution plan
export const QueryPlanSchema = z.object({
  classification: QueryClassificationSchema,
  strategy: z.enum(['mcp_primary', 'custom_primary', 'parallel', 'sequential', 'thematic_search']),
  steps: z.array(z.object({
    type: z.enum(['resolve_company', 'list_filings', 'search_content', 'analyze_filing', 'aggregate_results', 'thematic_search']),
    tool: z.string(),
    params: z.record(z.any()),
    priority: z.number().optional(),
    dependsOn: z.array(z.string()).optional()
  })),
  expectedResultType: z.enum(['company_data', 'filing_list', 'content_sections', 'aggregated_data', 'comparison', 'thematic_results']),
  estimatedDuration: z.number().optional()
});

export type QueryPlan = z.infer<typeof QueryPlanSchema>;

// Query execution result
export const QueryResultSchema = z.object({
  success: z.boolean(),
  pattern: z.nativeEnum(QueryPattern),
  data: z.any(),
  sources: z.array(z.object({
    type: z.enum(['mcp', 'sec_api', 'custom']),
    endpoint: z.string().optional(),
    timestamp: z.string()
  })),
  citations: z.array(z.object({
    filingUrl: z.string(),
    accession: z.string(),
    form: z.string(),
    filedAt: z.string(),
    section: z.string().optional(),
    snippet: z.string().optional(),
    startChar: z.number().optional(),
    endChar: z.number().optional()
  })).optional(),
  metadata: z.object({
    executionTime: z.number(),
    toolsCalled: z.array(z.string()),
    cacheHits: z.number().optional(),
    errors: z.array(z.string()).optional()
  })
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

// Query context for orchestration
export interface QueryContext {
  originalQuery?: string;
  userId?: string;
  sessionId?: string;
  preferences?: {
    preferredSources?: ('mcp' | 'sec_api')[];
    maxResults?: number;
    includeHistorical?: boolean;
    responseFormat?: 'detailed' | 'summary';
  };
  constraints?: {
    maxExecutionTime?: number;
    allowedForms?: string[];
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
}

// Entity extraction types
export interface ExtractedEntities {
  companies: Array<{
    name: string;
    confidence: number;
    source: 'exact_match' | 'fuzzy_match' | 'context';
  }>;
  tickers: Array<{
    symbol: string;
    confidence: number;
    exchange?: string;
  }>;
  forms: Array<{
    type: string;
    confidence: number;
    variations: string[];
  }>;
  timeExpressions: Array<{
    expression: string;
    normalized: {
      start?: string;
      end?: string;
      period?: string;
    };
    confidence: number;
  }>;
  topics: Array<{
    topic: string;
    category: 'financial' | 'risk' | 'governance' | 'operations' | 'regulatory' | 'general';
    confidence: number;
    keywords: string[];
  }>;
  queryIntent?: {
    intent: string;
    confidence: number;
    recommendedForms: string[];
    priority: 'latest' | 'recent' | 'comprehensive';
  };
}

// Orchestration error types
export class QueryOrchestrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'QueryOrchestrationError';
  }
}

export class ClassificationError extends QueryOrchestrationError {
  constructor(message: string, details?: any) {
    super(message, 'CLASSIFICATION_ERROR', details);
    this.name = 'ClassificationError';
  }
}

export class ExecutionError extends QueryOrchestrationError {
  constructor(message: string, details?: any) {
    super(message, 'EXECUTION_ERROR', details);
    this.name = 'ExecutionError';
  }
}