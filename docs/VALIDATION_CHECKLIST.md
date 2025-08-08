# EDGAR Answer Engine - Validation Checklist

## Overview

This checklist provides acceptance criteria for each development phase. Check off items as you complete them to ensure nothing is missed.

## Phase 1: Foundation

### 1.1 Project Setup & Infrastructure

#### Environment Setup
- [ ] Monorepo structure created with correct folders
- [ ] Package manager configured (pnpm with workspaces)
- [ ] TypeScript configured for all packages
- [ ] ESLint and Prettier configured
- [ ] Git repository initialized with .gitignore

#### Vercel Setup
- [ ] Project created in Vercel dashboard
- [ ] Connected to GitHub repository
- [ ] Environment variables panel accessible
- [ ] Deployment successful (shows "Ready" status)
- [ ] Custom domain configured (optional)

#### Database Setup
- [ ] PostgreSQL instance created (Neon or Supabase)
- [ ] pgvector extension enabled
- [ ] Connection string obtained
- [ ] Can connect from local environment
- [ ] Connection pooling configured

#### Redis Setup
- [ ] Upstash Redis instance created
- [ ] Global region selected
- [ ] Connection credentials obtained
- [ ] Can connect and set/get test key
- [ ] Eviction policy configured

#### Blob Storage
- [ ] Vercel Blob storage enabled
- [ ] Read/write token obtained
- [ ] Can upload test file
- [ ] Can retrieve test file
- [ ] TTL settings understood

#### Validation Gate
- [ ] Test endpoint deployed: `GET /api/health`
- [ ] Returns: `{ status: "ok", db: true, redis: true, blob: true }`
- [ ] All connections verified
- [ ] Response time <500ms

### 1.2 Core Data Layer

#### Database Schema
- [ ] All tables created via migration
- [ ] Indexes created and verified
- [ ] Foreign key constraints working
- [ ] Vector column type working
- [ ] Can insert test data

#### Type Definitions
- [ ] Shared types package compiles
- [ ] No TypeScript errors
- [ ] Zod schemas match database schema
- [ ] Types exported correctly
- [ ] Can import in other packages

#### SEC Utilities
- [ ] `padCIK()` handles all test cases
- [ ] `formatAccession()` handles all formats
- [ ] `buildArchiveUrl()` generates correct URLs
- [ ] `buildSubmissionsUrl()` generates correct URLs
- [ ] All utility functions have unit tests

#### Rate Limiter
- [ ] Token bucket implementation working
- [ ] Limits to 10 req/sec verified
- [ ] Retry logic with backoff working
- [ ] Rate limit headers returned
- [ ] Can handle burst traffic

#### Validation Gate
- [ ] All unit tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] Rate limiter prevents >10 req/sec
- [ ] 100% test coverage for utilities

### 1.3 SEC Data Foundation

#### Company Resolver
- [ ] Ticker mapping data loaded
- [ ] Can resolve ticker "AAPL" → CIK
- [ ] Can search by company name
- [ ] Returns multiple tickers if applicable
- [ ] Handles invalid queries gracefully

#### Submissions Fetcher
- [ ] Fetches submissions with correct User-Agent
- [ ] Parses recent filings correctly
- [ ] Maps to internal types
- [ ] Handles pagination
- [ ] Respects rate limits

#### Retry Mechanism
- [ ] Retries on 429 status
- [ ] Retries on 503 status
- [ ] Exponential backoff working
- [ ] Max retry limit enforced
- [ ] Logs retry attempts

#### Validation Gate
- [ ] Can resolve "AAPL" → "0000320193"
- [ ] Can fetch last 10 filings for any CIK
- [ ] Retry logic handles rate limits
- [ ] No unhandled promise rejections

## Phase 2: MCP Tool Layer

### 2.1 MCP Server Setup

#### Server Bootstrap
- [ ] MCP server starts without errors
- [ ] Registers all tools correctly
- [ ] Handles tool listing requests
- [ ] Handles tool execution requests
- [ ] Error handling for unknown tools

#### Validation Layer
- [ ] Zod schemas for all tool inputs
- [ ] Zod schemas for all tool outputs
- [ ] Validation rejects invalid inputs
- [ ] Error messages are helpful
- [ ] Type inference working

#### Core Tools
- [ ] `resolve_company` tool working
- [ ] `list_filings` tool working
- [ ] Tools return correct schema
- [ ] Tools handle errors gracefully
- [ ] Tools respect rate limits

#### Validation Gate
- [ ] MCP server starts: `npm run dev`
- [ ] Can list tools: `tools/list`
- [ ] Can execute tools via test harness
- [ ] All tool schemas valid

### 2.2 Filing Fetch & Parse Tools

#### Fetch Filing Tool
- [ ] Composes archive URLs correctly
- [ ] Fetches HTML filings
- [ ] Fetches TXT filings
- [ ] Stores in Blob storage
- [ ] Returns storage URL

#### HTML Parser
- [ ] Removes navigation elements
- [ ] Removes hidden divs
- [ ] Extracts clean text
- [ ] Preserves structure
- [ ] Handles encoding issues

#### Extract Sections Tool
- [ ] Detects major headings
- [ ] Identifies section boundaries
- [ ] Extracts section text
- [ ] Returns section metadata
- [ ] Handles malformed HTML

#### Validation Gate
- [ ] Can fetch 10-K by accession
- [ ] Can fetch 8-K by URL
- [ ] HTML properly cleaned
- [ ] At least 3 sections extracted

## Phase 3: Sectionizer

### 3.1 Form-Specific Adapters

#### 10-K/10-Q Sectionizer
- [ ] Identifies Item 1 (Business)
- [ ] Identifies Item 1A (Risk Factors)
- [ ] Identifies Item 7 (MD&A)
- [ ] Identifies Item 8 (Financial Statements)
- [ ] Handles variations in formatting

#### 8-K Sectionizer
- [ ] Maps Item 1.01 correctly
- [ ] Maps Item 2.02 correctly
- [ ] Maps Item 4.02 correctly
- [ ] Maps Item 8.01 correctly
- [ ] Extracts exhibit references

#### Section Storage
- [ ] Sections stored in Blob
- [ ] Database records created
- [ ] Text hash computed
- [ ] Character count accurate
- [ ] Deduplication working

#### Validation Gate
- [ ] MD&A extracted from 5 different 10-Ks
- [ ] Risk Factors found consistently
- [ ] 8-K items mapped correctly
- [ ] Section boundaries accurate

### 3.2 Search Foundation

#### BM25 Implementation
- [ ] Tokenization working
- [ ] Stop words removed
- [ ] Scoring algorithm correct
- [ ] Results ranked properly
- [ ] Performance acceptable (<200ms)

#### Search Text Tool
- [ ] Searches within sections
- [ ] Returns character offsets
- [ ] Scoring makes sense
- [ ] Handles multi-word queries
- [ ] Case-insensitive search

#### Section Priorities
- [ ] MD&A boosted for business queries
- [ ] Risk Factors boosted for risk queries
- [ ] Configurable boost factors
- [ ] Priorities affect ranking
- [ ] Can disable priorities

#### Validation Gate
- [ ] Find "goodwill impairment" mentions
- [ ] Find "revenue recognition" mentions
- [ ] Section priorities working
- [ ] Offsets map to source correctly

## Phase 4: RAG Pipeline

### 4.1 Embeddings & Vector Search

#### Chunking
- [ ] Creates 1-2k char chunks
- [ ] 200 char overlap working
- [ ] Respects sentence boundaries
- [ ] No duplicate chunks
- [ ] Chunk metadata preserved

#### Embedding Generation
- [ ] Embedding model selected
- [ ] Batch processing working
- [ ] Stored in pgvector
- [ ] Dimension count correct
- [ ] Can query by similarity

#### Hybrid Search
- [ ] BM25 scores computed
- [ ] Vector scores computed
- [ ] Scores combined correctly
- [ ] Alpha parameter working
- [ ] Results properly ranked

#### Validation Gate
- [ ] Chunks have proper overlap
- [ ] Embeddings queryable
- [ ] Hybrid search improves recall by >20%
- [ ] Search latency <500ms

### 4.2 Answer Composition

#### Evidence Assembly
- [ ] Collects relevant spans
- [ ] Tracks source metadata
- [ ] Maintains character offsets
- [ ] Deduplicates evidence
- [ ] Formats for LLM

#### LLM Prompts
- [ ] System prompt enforces accuracy
- [ ] Citation requirements clear
- [ ] No speculation allowed
- [ ] Examples provided
- [ ] Token limits respected

#### Citation Formatter
- [ ] Generates SEC URLs
- [ ] Includes section labels
- [ ] Character offsets preserved
- [ ] Links are clickable
- [ ] Format is consistent

#### Validation Gate
- [ ] Every answer has citations
- [ ] No unsupported claims
- [ ] Citations link correctly
- [ ] Answers are accurate

## Phase 5: API & UI

### 5.1 API Routes

#### Chat Endpoint
- [ ] Handles conversation history
- [ ] Executes tool calls
- [ ] Streams responses
- [ ] Error handling robust
- [ ] Rate limiting applied

#### Filings Endpoint
- [ ] Validates CIK parameter
- [ ] Returns filing list
- [ ] Supports pagination
- [ ] Includes metadata
- [ ] Cache headers set

#### Search Endpoint
- [ ] Parses query parameters
- [ ] Executes search
- [ ] Streams progress
- [ ] Returns citations
- [ ] Handles timeouts

#### Validation Gate
- [ ] Chat: "What are NVDA's last 10 filings?"
- [ ] Filings: Returns correct data
- [ ] Search: Finds relevant results
- [ ] All endpoints have <5s response time

### 5.2 Chat Interface

#### UI Components
- [ ] Message input working
- [ ] Message history displayed
- [ ] Streaming updates smooth
- [ ] Error states handled
- [ ] Loading indicators clear

#### Citation Rendering
- [ ] Citations displayed inline
- [ ] Links are clickable
- [ ] Hover shows preview
- [ ] Source indicated
- [ ] Mobile responsive

#### User Experience
- [ ] Can have conversation
- [ ] Can click citations
- [ ] Can copy responses
- [ ] Can clear history
- [ ] Keyboard shortcuts work

#### Validation Gate
- [ ] Full conversation works end-to-end
- [ ] Citations link to SEC.gov
- [ ] No UI errors in console
- [ ] Mobile layout works

## Phase 6: Enhancement

### 6.1 XBRL Integration

#### XBRL Facts Tool
- [ ] Fetches company facts
- [ ] Fetches frames data
- [ ] Parses JSON correctly
- [ ] Handles units properly
- [ ] Maps to periods

#### Numeric Verification
- [ ] Cross-checks with text
- [ ] Flags discrepancies
- [ ] Formats numbers
- [ ] Handles currencies
- [ ] Percentage calculations

#### Validation Gate
- [ ] "What was AAPL's revenue last quarter?"
- [ ] Returns formatted number with citation
- [ ] Year-over-year comparisons work
- [ ] Multi-company comparisons work

### 6.2 Advanced Features

#### Additional Sectionizers
- [ ] S-1 registration statements
- [ ] 20-F foreign filers
- [ ] DEF 14A proxy statements
- [ ] 424B prospectuses
- [ ] Generic fallback

#### Third-party Search
- [ ] Integration configured
- [ ] Re-verification working
- [ ] Feature flag controls
- [ ] Fallback to official
- [ ] Cost tracking

#### Background Jobs
- [ ] Queue implementation
- [ ] Job processing
- [ ] Progress tracking
- [ ] Result caching
- [ ] Error recovery

## Acceptance Test Suite

### Core Functionality Tests

#### Test 1: Metadata Query
**Query**: "What are the last 10 filings from NVDA?"
- [ ] Returns exactly 10 filings
- [ ] Each has form type, date, accession
- [ ] Links go to SEC.gov
- [ ] Sorted by date (newest first)
- [ ] Company name correct

#### Test 2: Content Search
**Query**: "Find an example of a goodwill triggering event with no impairment"
- [ ] Finds relevant MD&A section
- [ ] Quotes include "triggering event"
- [ ] Confirms "no impairment"
- [ ] Provides filing context
- [ ] Links to source

#### Test 3: Hybrid Query
**Query**: "Show all 8-K filings about revenue corrections in the last 6 months"
- [ ] Filters to 8-K forms only
- [ ] Date range applied correctly
- [ ] Finds revenue-related items
- [ ] Groups by company
- [ ] Sorted by relevance

#### Test 4: Numeric Query
**Query**: "Compare AAPL's quarterly revenue for the last 4 quarters"
- [ ] Returns 4 data points
- [ ] Numbers match XBRL
- [ ] Shows period endings
- [ ] Calculates % changes
- [ ] Citations to 10-Q/10-K

#### Test 5: Edge Cases
**Query**: "Find risk factors for a small-cap biotech"
- [ ] Handles unknown company gracefully
- [ ] Suggests how to search
- [ ] No crashes or timeouts
- [ ] Helpful error message
- [ ] Recovery options provided

## Performance Benchmarks

### Response Time Targets

| Operation | Target | Actual | Pass |
|-----------|--------|--------|------|
| Company resolution | <300ms | ___ | [ ] |
| List 10 filings | <500ms | ___ | [ ] |
| Fetch filing | <2s | ___ | [ ] |
| Extract sections | <300ms | ___ | [ ] |
| Search filing | <500ms | ___ | [ ] |
| Simple query | <5s | ___ | [ ] |
| Complex query | <15s | ___ | [ ] |

### Quality Metrics

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Citation accuracy | >95% | ___ | [ ] |
| Section extraction | >90% | ___ | [ ] |
| Search relevance | >80% | ___ | [ ] |
| Answer completeness | >85% | ___ | [ ] |
| Error rate | <1% | ___ | [ ] |

### Scale Testing

- [ ] Handles 10 concurrent users
- [ ] Handles 100 queries/hour
- [ ] Respects SEC rate limits
- [ ] No memory leaks after 1hr
- [ ] Database connections stable

## Production Readiness

### Security
- [ ] Environment variables secured
- [ ] SQL injection prevented
- [ ] XSS prevention in place
- [ ] CORS configured
- [ ] Rate limiting active

### Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Alerts configured
- [ ] Logs aggregated
- [ ] Metrics dashboard created

### Documentation
- [ ] README complete
- [ ] API documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Architecture diagram

### Deployment
- [ ] Production environment configured
- [ ] CI/CD pipeline working
- [ ] Rollback procedure tested
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan

## Sign-off

### Phase Completion

| Phase | Completed | Tested | Deployed | Sign-off |
|-------|-----------|---------|----------|----------|
| Foundation | [ ] | [ ] | [ ] | _______ |
| MCP Tools | [ ] | [ ] | [ ] | _______ |
| Sectionizers | [ ] | [ ] | [ ] | _______ |
| RAG Pipeline | [ ] | [ ] | [ ] | _______ |
| API & UI | [ ] | [ ] | [ ] | _______ |
| Enhancements | [ ] | [ ] | [ ] | _______ |

### Final Acceptance

- [ ] All acceptance tests pass
- [ ] Performance targets met
- [ ] Quality metrics achieved
- [ ] Production readiness confirmed
- [ ] Documentation complete

**Project Accepted By**: ___________________ **Date**: ___________

---

*Use this checklist throughout development. Check items as completed. Update actual metrics during testing.*