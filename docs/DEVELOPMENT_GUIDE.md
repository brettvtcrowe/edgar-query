# EDGAR Answer Engine - Development Guide

## Table of Contents
1. [Project Structure](#project-structure)
2. [Implementation Details](#implementation-details)
3. [Code Examples](#code-examples)
4. [Testing Strategy](#testing-strategy)
5. [Debugging Guide](#debugging-guide)

## Project Structure

### Monorepo Layout
```
edgar-query/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── api/
│       │   │   ├── chat/
│       │   │   │   └── route.ts
│       │   │   ├── filings/
│       │   │   │   └── [cik]/
│       │   │   │       └── route.ts
│       │   │   ├── fetch/
│       │   │   │   └── route.ts
│       │   │   └── search/
│       │   │       └── route.ts
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   └── chat/
│       │       ├── ChatInterface.tsx
│       │       ├── MessageList.tsx
│       │       └── CitationRenderer.tsx
│       ├── lib/
│       │   ├── mcp-client.ts
│       │   ├── rate-limit.ts
│       │   ├── sec.ts
│       │   ├── sectionizers/
│       │   │   ├── index.ts
│       │   │   ├── form-10k.ts
│       │   │   ├── form-8k.ts
│       │   │   └── generic.ts
│       │   └── rag/
│       │       ├── retriever.ts
│       │       ├── ranker.ts
│       │       └── composer.ts
│       ├── package.json
│       └── tsconfig.json
├── services/
│   └── edgar-mcp/
│       ├── src/
│       │   ├── tools/
│       │   │   ├── resolve-company.ts
│       │   │   ├── list-filings.ts
│       │   │   ├── fetch-filing.ts
│       │   │   ├── extract-sections.ts
│       │   │   ├── search-text.ts
│       │   │   └── xbrl-facts.ts
│       │   ├── server.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── types/
│       ├── src/
│       │   ├── sec.ts
│       │   ├── filing.ts
│       │   ├── search.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── infra/
│   ├── vercel.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── scripts/
│       └── setup.sh
├── package.json
├── turbo.json
└── pnpm-workspace.yaml
```

## Implementation Details

### Phase 1: Foundation Implementation

#### 1.1 Database Schema (Prisma)

```prisma
// infra/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Company {
  cik           String   @id
  name          String
  tickers       String[]
  lastRefreshed DateTime @default(now())
  filings       Filing[]
  
  @@index([name])
  @@index([tickers])
}

model Filing {
  id         Int       @id @default(autoincrement())
  cik        String
  accession  String    @unique
  form       String
  filedAt    DateTime
  primaryUrl String
  hash       String?
  company    Company   @relation(fields: [cik], references: [cik])
  sections   Section[]
  
  @@index([cik, filedAt])
  @@index([form, filedAt])
}

model Section {
  id        Int      @id @default(autoincrement())
  filingId  Int
  label     String
  textUrl   String   // Blob storage URL
  textHash  String
  charCount Int
  filing    Filing   @relation(fields: [filingId], references: [id])
  chunks    Chunk[]
  
  @@index([filingId, label])
}

model Chunk {
  id        Int                      @id @default(autoincrement())
  sectionId Int
  start     Int
  end       Int
  embedding Unsupported("vector")?
  section   Section                  @relation(fields: [sectionId], references: [id])
  
  @@index([sectionId])
}

model Answer {
  id        Int      @id @default(autoincrement())
  prompt    String
  plan      Json
  citations Json
  createdAt DateTime @default(now())
}
```

#### 1.2 Rate Limiter Implementation

```typescript
// apps/web/lib/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export const secRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 s'), // 10 requests per second
  analytics: true,
  prefix: 'sec-api',
});

export async function withRateLimit<T>(
  identifier: string,
  fn: () => Promise<T>
): Promise<T> {
  const { success, limit, reset, remaining } = await secRateLimiter.limit(
    identifier
  );

  if (!success) {
    const retryAfter = Math.floor((reset - Date.now()) / 1000);
    throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
  }

  return fn();
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof Error) {
        const status = (error as any).status;
        if (status === 429 || status === 503) {
          const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
  
  throw lastError!;
}
```

#### 1.3 SEC Utilities

```typescript
// apps/web/lib/sec.ts

export function padCIK(cik: string): string {
  return cik.padStart(10, '0');
}

export function formatAccession(accession: string): {
  raw: string;
  withoutDashes: string;
} {
  const raw = accession;
  const withoutDashes = accession.replace(/-/g, '');
  return { raw, withoutDashes };
}

export function buildArchiveUrl(
  cik: string,
  accession: string,
  document: string
): string {
  const paddedCIK = padCIK(cik);
  const { withoutDashes } = formatAccession(accession);
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${withoutDashes}/${document}`;
}

export function buildSubmissionsUrl(cik: string): string {
  const paddedCIK = padCIK(cik);
  return `https://data.sec.gov/submissions/CIK${paddedCIK}.json`;
}

export function buildXBRLFactsUrl(cik: string): string {
  const paddedCIK = padCIK(cik);
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCIK}.json`;
}

export const SEC_USER_AGENT = process.env.USER_AGENT || 
  'EdgarAnswerEngine/1.0 (contact@example.com)';

export async function secFetch(url: string): Promise<Response> {
  return withRetry(async () => {
    return withRateLimit('sec-api', async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': SEC_USER_AGENT,
          'Accept': 'application/json, text/html, text/plain',
        },
      });

      if (!response.ok) {
        const error = new Error(`SEC API error: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      return response;
    });
  });
}
```

### Phase 2: MCP Tool Implementation

#### 2.1 MCP Server Setup

```typescript
// services/edgar-mcp/src/server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { resolveCompanyTool } from './tools/resolve-company.js';
import { listFilingsTool } from './tools/list-filings.js';
import { fetchFilingTool } from './tools/fetch-filing.js';
import { extractSectionsTool } from './tools/extract-sections.js';
import { searchTextTool } from './tools/search-text.js';

const server = new Server(
  {
    name: 'edgar-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    resolveCompanyTool.definition,
    listFilingsTool.definition,
    fetchFilingTool.definition,
    extractSectionsTool.definition,
    searchTextTool.definition,
  ],
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'resolve_company':
      return resolveCompanyTool.handler(args);
    case 'list_filings':
      return listFilingsTool.handler(args);
    case 'fetch_filing':
      return fetchFilingTool.handler(args);
    case 'extract_sections':
      return extractSectionsTool.handler(args);
    case 'search_text':
      return searchTextTool.handler(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

#### 2.2 Tool Implementation Example

```typescript
// services/edgar-mcp/src/tools/resolve-company.ts

import { z } from 'zod';
import { secFetch, padCIK } from '@edgar-query/web/lib/sec';

const inputSchema = z.object({
  query: z.string().describe('Company ticker or name to search'),
});

const outputSchema = z.object({
  cik: z.string(),
  name: z.string(),
  tickers: z.array(z.string()),
});

export const resolveCompanyTool = {
  definition: {
    name: 'resolve_company',
    description: 'Resolve a company ticker or name to CIK and metadata',
    inputSchema: inputSchema.strict(),
  },
  
  handler: async (args: unknown) => {
    const input = inputSchema.parse(args);
    
    // Load ticker mapping (cache this in production)
    const response = await secFetch(
      'https://www.sec.gov/files/company_tickers.json'
    );
    const tickers = await response.json();
    
    // Search by ticker or name
    const query = input.query.toUpperCase();
    let match = null;
    
    for (const [_, company] of Object.entries(tickers)) {
      const comp = company as any;
      if (comp.ticker === query || 
          comp.title.toUpperCase().includes(query)) {
        match = comp;
        break;
      }
    }
    
    if (!match) {
      throw new Error(`Company not found: ${input.query}`);
    }
    
    return outputSchema.parse({
      cik: padCIK(match.cik_str.toString()),
      name: match.title,
      tickers: [match.ticker],
    });
  },
};
```

### Phase 3: Sectionizer Implementation

#### 3.1 Base Sectionizer

```typescript
// apps/web/lib/sectionizers/index.ts

export interface Section {
  label: string;
  text: string;
  start: number;
  end: number;
}

export interface Sectionizer {
  formType: string | string[];
  extract(html: string): Section[];
}

export function getSectionizer(formType: string): Sectionizer {
  const normalizedForm = formType.toUpperCase();
  
  if (normalizedForm.startsWith('10-K') || normalizedForm.startsWith('10-Q')) {
    return form10KSectionizer;
  }
  
  if (normalizedForm.startsWith('8-K')) {
    return form8KSectionizer;
  }
  
  return genericSectionizer;
}
```

#### 3.2 10-K/10-Q Sectionizer

```typescript
// apps/web/lib/sectionizers/form-10k.ts

import * as cheerio from 'cheerio';

const ITEM_PATTERNS = {
  'MD&A': /Item\s+7\.?\s+Management['']s\s+Discussion\s+and\s+Analysis/i,
  'Risk Factors': /Item\s+1A\.?\s+Risk\s+Factors/i,
  'Business': /Item\s+1\.?\s+Business/i,
  'Market Risk': /Item\s+7A\.?\s+Quantitative\s+and\s+Qualitative\s+Disclosures/i,
  'Financial Statements': /Item\s+8\.?\s+Financial\s+Statements/i,
  'Controls and Procedures': /Item\s+9A\.?\s+Controls\s+and\s+Procedures/i,
};

export const form10KSectionizer: Sectionizer = {
  formType: ['10-K', '10-Q'],
  
  extract(html: string): Section[] {
    const $ = cheerio.load(html);
    const sections: Section[] = [];
    
    // Remove navigation and footers
    $('div[style*="display:none"]').remove();
    $('hr').nextAll().remove();
    
    const fullText = $.text();
    
    // Find sections by patterns
    for (const [label, pattern] of Object.entries(ITEM_PATTERNS)) {
      const match = fullText.match(pattern);
      if (match && match.index !== undefined) {
        const start = match.index;
        
        // Find next section or end of document
        let end = fullText.length;
        for (const [_, nextPattern] of Object.entries(ITEM_PATTERNS)) {
          if (nextPattern === pattern) continue;
          const nextMatch = fullText.slice(start + match[0].length)
            .match(nextPattern);
          if (nextMatch && nextMatch.index !== undefined) {
            end = Math.min(end, start + match[0].length + nextMatch.index);
          }
        }
        
        sections.push({
          label,
          text: fullText.slice(start, end).trim(),
          start,
          end,
        });
      }
    }
    
    return sections;
  },
};
```

### Phase 4: RAG Implementation

#### 4.1 Chunking Strategy

```typescript
// apps/web/lib/rag/chunker.ts

export interface Chunk {
  text: string;
  start: number;
  end: number;
  sectionLabel: string;
}

export function createChunks(
  text: string,
  sectionLabel: string,
  chunkSize = 1500,
  overlap = 200
): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const nextPeriod = text.indexOf('.', end - 100);
      if (nextPeriod > 0 && nextPeriod < end + 100) {
        end = nextPeriod + 1;
      }
    }
    
    chunks.push({
      text: text.slice(start, Math.min(end, text.length)),
      start,
      end: Math.min(end, text.length),
      sectionLabel,
    });
    
    start = end - overlap;
  }
  
  return chunks;
}
```

#### 4.2 Hybrid Search

```typescript
// apps/web/lib/rag/search.ts

import { BM25 } from '@faker-js/bm25';

export interface SearchResult {
  chunk: Chunk;
  score: number;
  bm25Score: number;
  vectorScore: number;
}

export async function hybridSearch(
  query: string,
  chunks: Chunk[],
  embeddings: number[][],
  queryEmbedding: number[],
  alpha = 0.5 // Balance between BM25 and vector
): Promise<SearchResult[]> {
  // BM25 scoring
  const documents = chunks.map(c => c.text);
  const bm25 = new BM25(documents);
  const bm25Scores = bm25.search(query);
  
  // Vector scoring
  const vectorScores = embeddings.map(embedding => 
    cosineSimilarity(queryEmbedding, embedding)
  );
  
  // Combine scores
  const results: SearchResult[] = chunks.map((chunk, i) => ({
    chunk,
    bm25Score: bm25Scores[i] || 0,
    vectorScore: vectorScores[i] || 0,
    score: alpha * (bm25Scores[i] || 0) + (1 - alpha) * (vectorScores[i] || 0),
  }));
  
  // Sort by combined score
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### Phase 5: API Implementation

#### 5.1 Chat API Route

```typescript
// apps/web/app/api/chat/route.ts

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { MCPClient } from '@/lib/mcp-client';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
    tools: {
      resolve_company: {
        description: 'Resolve company ticker to CIK',
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          const mcp = new MCPClient();
          return mcp.call('resolve_company', { query });
        },
      },
      list_filings: {
        description: 'List recent filings for a company',
        parameters: z.object({
          cik: z.string(),
          forms: z.array(z.string()).optional(),
          since: z.string().optional(),
        }),
        execute: async (params) => {
          const mcp = new MCPClient();
          return mcp.call('list_filings', params);
        },
      },
      search_filings: {
        description: 'Search within filing content',
        parameters: z.object({
          query: z.string(),
          cik: z.string().optional(),
          forms: z.array(z.string()).optional(),
        }),
        execute: async (params) => {
          // Orchestrate multiple tool calls
          const mcp = new MCPClient();
          
          // Get filings
          const filings = await mcp.call('list_filings', {
            cik: params.cik,
            forms: params.forms,
          });
          
          // Search each filing
          const results = [];
          for (const filing of filings.slice(0, 10)) {
            const content = await mcp.call('fetch_filing', {
              accession: filing.accession,
            });
            
            const sections = await mcp.call('extract_sections', {
              html: content.html,
              form: filing.form,
            });
            
            const searchResults = await mcp.call('search_text', {
              text: Object.values(sections).join('\n'),
              query: params.query,
            });
            
            results.push(...searchResults.map(r => ({
              ...r,
              filing,
            })));
          }
          
          return results;
        },
      },
    },
    system: `You are an SEC filing expert. 
    Always provide citations for your claims.
    Only use information from the retrieved filings.
    If you cannot find evidence, say so clearly.`,
  });
  
  return result.toAIStreamResponse();
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/sec-utils.test.ts
describe('SEC Utilities', () => {
  test('padCIK pads correctly', () => {
    expect(padCIK('320193')).toBe('0000320193');
    expect(padCIK('1234567890')).toBe('1234567890');
  });
  
  test('buildArchiveUrl formats correctly', () => {
    const url = buildArchiveUrl('320193', '0000320193-24-000001', 'form.html');
    expect(url).toBe(
      'https://www.sec.gov/Archives/edgar/data/320193/000032019324000001/form.html'
    );
  });
});
```

### Integration Tests

```typescript
// tests/mcp-tools.test.ts
describe('MCP Tools', () => {
  test('resolve_company finds Apple', async () => {
    const result = await resolveCompanyTool.handler({ query: 'AAPL' });
    expect(result.cik).toBe('0000320193');
    expect(result.name).toContain('Apple');
  });
  
  test('list_filings returns recent filings', async () => {
    const result = await listFilingsTool.handler({
      cik: '0000320193',
      limit: 10,
    });
    expect(result).toHaveLength(10);
    expect(result[0]).toHaveProperty('accession');
  });
});
```

### End-to-End Tests

```typescript
// tests/e2e/chat.test.ts
describe('Chat API', () => {
  test('answers company query', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'What are the last 5 filings from Apple?',
          },
        ],
      }),
    });
    
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let result = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }
    
    expect(result).toContain('10-K');
    expect(result).toContain('AAPL');
  });
});
```

## Debugging Guide

### Common Issues

#### Rate Limiting
```typescript
// Check rate limit status
const status = await secRateLimiter.limit('sec-api');
console.log('Remaining:', status.remaining);
console.log('Reset at:', new Date(status.reset));
```

#### Parsing Failures
```typescript
// Debug sectionizer output
const sections = sectionizer.extract(html);
console.log('Found sections:', sections.map(s => ({
  label: s.label,
  length: s.text.length,
  preview: s.text.slice(0, 100),
})));
```

#### Search Quality
```typescript
// Analyze search scores
const results = await hybridSearch(query, chunks, embeddings, queryEmb);
console.log('Top results:', results.slice(0, 5).map(r => ({
  text: r.chunk.text.slice(0, 100),
  bm25: r.bm25Score.toFixed(3),
  vector: r.vectorScore.toFixed(3),
  combined: r.score.toFixed(3),
})));
```

### Logging

```typescript
// Structured logging
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

// Use in tools
logger.info({ tool: 'resolve_company', query }, 'Resolving company');
logger.error({ error: err.message, stack: err.stack }, 'Tool failed');
```

### Performance Monitoring

```typescript
// Track operation timing
async function timedOperation<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.info({ operation: name, duration }, 'Operation completed');
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error({ operation: name, duration, error }, 'Operation failed');
    throw error;
  }
}

// Usage
const filings = await timedOperation('list_filings', async () => {
  return mcp.call('list_filings', { cik });
});
```

## Development Workflow

### Daily Checklist
- [ ] Pull latest changes
- [ ] Run tests for current phase
- [ ] Check rate limit status
- [ ] Review error logs
- [ ] Update progress in PROJECT_ROADMAP.md

### Before Committing
- [ ] Run linter: `pnpm lint`
- [ ] Run tests: `pnpm test`
- [ ] Check types: `pnpm typecheck`
- [ ] Update documentation if needed

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Rate limits tested
- [ ] Error handling verified
- [ ] Monitoring enabled
- [ ] Prisma binary targets configured for Linux runtime

#### Vercel Deployment Notes
**Critical**: Ensure `apps/web/prisma/schema.prisma` includes:
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "rhel-openssl-3.0.x"]
}
```
The `rhel-openssl-3.0.x` target generates the Linux binary required for Vercel's serverless environment. Without this, deployment will fail with:
`ENOENT: no such file or directory, lstat '/vercel/path0/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node'`

---

*This guide should be read alongside PROJECT_ROADMAP.md for timeline and ARCHITECTURE_REFERENCE.md for system design.*