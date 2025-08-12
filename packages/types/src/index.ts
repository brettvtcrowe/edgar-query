import { z } from 'zod';

// Enhanced Company Schema with industry and metadata fields
export const CompanySchema = z.object({
  id: z.string(),
  cik: z.string(),
  ticker: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  sic: z.string().optional(),
  industry: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Enhanced Filing Schema with fiscal period and metadata
export const FilingSchema = z.object({
  id: z.string(),
  accessionNumber: z.string(),
  filingDate: z.date(),
  reportDate: z.date(),
  formType: z.string(),
  companyName: z.string(),
  cik: z.string(),
  fileSize: z.number().optional(),
  documentCount: z.number().optional(),
  period: z.string().optional(), // Q1, Q2, Q3, FY
  fiscalYear: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Section Schema with enhanced metadata
export const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  sectionType: z.string(),
  order: z.number(),
  itemNumber: z.string().optional(),
  wordCount: z.number().optional(),
  contentHash: z.string().optional(),
  filingId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Chunk Schema with token counting
export const ChunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  startPos: z.number(),
  endPos: z.number(),
  tokens: z.number().optional(),
  sectionId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Query Pattern Schemas for dual query architecture
export const QueryTypeEnum = z.enum(['company-specific', 'thematic', 'hybrid']);

export const CompanyQuerySchema = z.object({
  type: z.literal('company-specific'),
  company: z.string(), // ticker, CIK, or name
  query: z.string(),
  formTypes: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});

export const ThematicQuerySchema = z.object({
  type: z.literal('thematic'),
  query: z.string(),
  formTypes: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  industries: z.array(z.string()).optional(),
  limit: z.number().optional(),
});

export const HybridQuerySchema = z.object({
  type: z.literal('hybrid'),
  primaryCompany: z.string().optional(),
  query: z.string(),
  comparisonCriteria: z.string().optional(),
  formTypes: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});

export const QuerySchema = z.discriminatedUnion('type', [
  CompanyQuerySchema,
  ThematicQuerySchema,
  HybridQuerySchema,
]);

// Answer Schema with query type tracking
export const AnswerSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  sources: z.array(z.object({
    filingId: z.string(),
    sectionId: z.string(),
    chunkId: z.string().optional(),
    title: z.string(),
    url: z.string().optional(),
    relevanceScore: z.number().optional(),
  })),
  queryType: QueryTypeEnum,
  responseTime: z.number().optional(),
  confidence: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// SEC Utilities Schema
export const CIKSchema = z.string().regex(/^\d{10}$/, 'CIK must be 10 digits');
export const TickerSchema = z.string().min(1).max(5).toUpperCase();
export const AccessionNumberSchema = z.string().regex(
  /^\d{10}-\d{2}-\d{6}$/,
  'Accession number format: 0000000000-00-000000'
);

// EDGAR MCP Integration Schemas
export const EdgarMCPCompanySchema = z.object({
  cik: z.string(),
  ticker: z.string().optional(),
  name: z.string(),
  sic: z.string().optional(),
  industry: z.string().optional(),
});

export const EdgarMCPFilingSchema = z.object({
  accessionNumber: z.string(),
  filingDate: z.string(),
  reportDate: z.string(),
  form: z.string(),
  companyName: z.string(),
  cik: z.string(),
  size: z.number().optional(),
  documentCount: z.number().optional(),
});

export const EdgarMCPSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  itemNumber: z.string().optional(),
  sectionType: z.string().optional(),
});

// Rate Limiting Schema
export const RateLimitSchema = z.object({
  requestsPerSecond: z.number().default(10),
  burstCapacity: z.number().default(50),
  windowSizeSeconds: z.number().default(60),
});

// Type Exports
export type Company = z.infer<typeof CompanySchema>;
export type Filing = z.infer<typeof FilingSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Chunk = z.infer<typeof ChunkSchema>;
export type QueryType = z.infer<typeof QueryTypeEnum>;
export type CompanyQuery = z.infer<typeof CompanyQuerySchema>;
export type ThematicQuery = z.infer<typeof ThematicQuerySchema>;
export type HybridQuery = z.infer<typeof HybridQuerySchema>;
export type Query = z.infer<typeof QuerySchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type CIK = z.infer<typeof CIKSchema>;
export type Ticker = z.infer<typeof TickerSchema>;
export type AccessionNumber = z.infer<typeof AccessionNumberSchema>;
export type EdgarMCPCompany = z.infer<typeof EdgarMCPCompanySchema>;
export type EdgarMCPFiling = z.infer<typeof EdgarMCPFilingSchema>;
export type EdgarMCPSection = z.infer<typeof EdgarMCPSectionSchema>;
export type RateLimit = z.infer<typeof RateLimitSchema>;

// Export SEC utilities
export * from './sec-utils.js';

// Export rate limiter
export * from './rate-limiter.js';

// Export query classifier
export * from './query-classifier.js';

// Export company resolver
export * from './company-resolver.js';

// Export submissions fetcher
export * from './submissions-fetcher.js';

// Export retry/backoff mechanism
export * from './retry-backoff.js';