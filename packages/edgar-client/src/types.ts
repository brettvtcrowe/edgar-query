/**
 * Type definitions for EDGAR client
 */

import { z } from 'zod';

// Company types
export const CompanyInfoSchema = z.object({
  cik: z.string(),
  name: z.string(),
  tickers: z.array(z.string()).optional(),
  exchanges: z.array(z.string()).optional(),
  sic: z.string().optional(),
  sicDescription: z.string().optional(),
  category: z.string().optional(),
  entityType: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional()
});

export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;

// Filing types
export const FilingSchema = z.object({
  accessionNumber: z.string(),
  filingDate: z.string(),
  reportDate: z.string().optional(),
  form: z.string(),
  primaryDocument: z.string(),
  primaryDocDescription: z.string().optional(),
  items: z.array(z.string()).optional(),
  size: z.number().optional(),
  isXBRL: z.boolean().optional(),
  isInlineXBRL: z.boolean().optional()
});

export type Filing = z.infer<typeof FilingSchema>;

// Filing content types
export const FilingContentSchema = z.object({
  content: z.string(),
  metadata: z.object({
    form: z.string(),
    filingDate: z.string(),
    reportDate: z.string().optional(),
    accessionNumber: z.string(),
    cik: z.string(),
    companyName: z.string()
  })
});

export type FilingContent = z.infer<typeof FilingContentSchema>;

// Section types
export const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  sectionType: z.string(),
  order: z.number(),
  startOffset: z.number().optional(),
  endOffset: z.number().optional(),
  metadata: z.any().optional()
});

export type Section = z.infer<typeof SectionSchema>;

// Financial data types
export const FinancialFactSchema = z.object({
  concept: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string(),
  period: z.string(),
  form: z.string().optional(),
  filed: z.string().optional()
});

export type FinancialFact = z.infer<typeof FinancialFactSchema>;

// Tool types
export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()).optional()
});

export type Tool = z.infer<typeof ToolSchema>;

// Response types
export const MCPResponseSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string()
});

export type MCPResponse = z.infer<typeof MCPResponseSchema>;

// Client configuration
export interface EDGARClientConfig {
  mcpServiceUrl?: string;
  mcpApiKey?: string;
  secUserAgent: string;
  enableFallback?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// Error types
export class EDGARClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'EDGARClientError';
  }
}

export class MCPServiceError extends EDGARClientError {
  constructor(message: string, details?: any) {
    super(message, 'MCP_SERVICE_ERROR', details);
    this.name = 'MCPServiceError';
  }
}

export class SECAPIError extends EDGARClientError {
  constructor(message: string, details?: any) {
    super(message, 'SEC_API_ERROR', details);
    this.name = 'SECAPIError';
  }
}

export class RateLimitError extends EDGARClientError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'RateLimitError';
  }
}