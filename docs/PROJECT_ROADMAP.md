# EDGAR Answer Engine - Project Roadmap

## Project Overview

Build a cloud-hosted web application that answers natural language queries about SEC EDGAR filings with evidence-grounded citations, without mirroring EDGAR data.

### Core Principles
- **Accuracy first** - Every statement must be supported by retrieved evidence
- **No EDGAR mirroring** - Fetch on demand with short TTL caching
- **Tool-first orchestration** - LLM plans and composes; tools provide facts
- **Progressive results** - Stream partial results for broad scans
- **Compliance & respect** - Proper User-Agent, rate limiting, backoff
- **Dual query patterns** - Support both company-specific AND cross-document thematic queries

## Development Phases

### Foundation Phase
*Build once, never rebuild*

#### Phase 1.1: Project Setup & Infrastructure
**Duration**: 2-3 days

**Tasks**:
1. Initialize monorepo structure
   ```
   edgar-query/
   ├── apps/
   │   └── web/              # Next.js application
   ├── services/
   │   └── edgar-mcp/        # MCP server
   ├── packages/
   │   └── types/            # Shared TypeScript types
   ├── infra/                # Infrastructure configs
   └── package.json          # Root package.json
   ```

2. Setup Vercel project
   - Create new project linked to GitHub repo
   - Configure environment variables
   - Set Node.js runtime (not Edge)

3. Configure PostgreSQL with pgvector
   - Create Neon or Supabase database
   - Enable pgvector extension
   - Save connection string

4. Setup Upstash Redis
   - Create global Redis instance
   - Configure for rate limiting

5. Environment configuration
   ```env
   DATABASE_URL=
   REDIS_URL=
   USER_AGENT="EdgarAnswerEngine/1.0 (contact@example.com)"
   OPENAI_API_KEY= or ANTHROPIC_API_KEY=
   VERCEL_BLOB_READ_WRITE_TOKEN=
   ```

**Validation Gate**: 
- [ ] Deploy "hello world" endpoint that connects to all services
- [ ] Verify database connection
- [ ] Verify Redis connection
- [ ] Verify Blob storage access

#### Phase 1.2: Core Data Layer
**Duration**: 2-3 days

**Tasks**:
1. Design and implement database schema
   - Companies table
   - Filings table
   - Sections table
   - Chunks table with vector column
   - Answers table

2. Create shared type definitions
   - Zod schemas for validation
   - TypeScript interfaces
   - API contracts

3. Build SEC utilities
   - CIK padding functions
   - URL composition helpers
   - Accession number parsers

4. Implement rate limiter
   - Token bucket algorithm
   - Redis-backed
   - Configurable limits

**Validation Gate**:
- [ ] All database migrations run successfully
- [ ] Unit tests for utilities pass
- [ ] Rate limiter prevents >10 req/sec

#### Phase 1.3: SEC Data Foundation
**Duration**: 2-3 days

**Tasks**:
1. Build company resolver
   - Fetch and store ticker mappings
   - Implement ticker → CIK lookup
   - Handle name searches

2. Implement submissions fetcher
   - Proper User-Agent header
   - Parse submissions JSON
   - Map to internal types

3. Create retry/backoff mechanism
   - Exponential backoff
   - Handle 429/503 responses
   - Max retry limits

**Validation Gate**:
- [ ] Can resolve "AAPL" → CIK 0000320193
- [ ] Can fetch last 10 filings for any CIK
- [ ] Retry logic handles rate limits gracefully

### MCP Tool Layer Phase
*Isolated, testable, reusable*

#### Phase 2.1: MCP Server Setup & EDGAR MCP Integration
**Duration**: 3 days

**Tasks**:
1. Integrate EDGAR MCP as primary SEC data layer
   - Install and configure EDGAR MCP package
   - Test MCP tool connectivity and rate limiting
   - Validate compliance with SEC guidelines

2. Bootstrap custom MCP server for business logic
   - Configure MCP SDK for custom tools
   - Setup tool registry with EDGAR MCP + custom tools
   - Implement error handling and fallback mechanisms

3. Build validation layer
   - Zod schemas for all tools (EDGAR MCP + custom)
   - Input validation and output formatting
   - Tool orchestration patterns

4. Implement dual-pattern query routing:
   - `classify_query` - Determine company-specific vs. thematic
   - `resolve_company` - Company-specific queries (fallback to custom)
   - `discover_filings` - Cross-document discovery by criteria
   - `list_filings` - Company-specific filing lists

**Validation Gate**:
- [ ] EDGAR MCP tools working with proper rate limiting
- [ ] Custom MCP server starts and exposes tools
- [ ] Query classification correctly identifies patterns
- [ ] Company-specific queries route to resolve_company
- [ ] Thematic queries route to discover_filings
- [ ] Validation rejects invalid inputs

#### Phase 2.2: Filing Fetch & Parse Tools
**Duration**: 4 days

**Tasks**:
1. Build `fetch_filing` tool (uses EDGAR MCP as primary)
   - Leverage EDGAR MCP filing fetch capabilities
   - Fallback to custom archive URL composition
   - Handle HTML/TXT formats with proper encoding
   - Store in Blob with TTL and filing metadata

2. Create robust HTML parser
   - Remove SEC boilerplate and navigation
   - Extract clean text while preserving structure
   - Handle XBRL inline markup
   - Normalize whitespace and formatting

3. Build `extract_sections` tool
   - Generic heading detection with confidence scoring
   - Section boundary identification
   - Text extraction with offset tracking
   - Metadata preservation (filing type, date, etc.)

4. Add `bulk_discover` tool for thematic queries
   - Search across filing indexes by form type
   - Date range filtering (e.g., "past year")
   - Filing type prioritization (10-K over 8-K for fundamental analysis)
   - Progressive result streaming for large result sets

**Validation Gate**:
- [ ] Can fetch any filing by accession (EDGAR MCP + fallback)
- [ ] HTML cleaned properly with structure preserved
- [ ] Basic sections extracted with accurate boundaries
- [ ] Bulk discovery returns relevant filings for thematic queries
- [ ] Progressive streaming works for large result sets

### Sectionizer Phase
*Get this right early - it's core to everything*

#### Phase 3.1: Form-Specific Adapters
**Duration**: 3-4 days

**Tasks**:
1. Build 10-K/10-Q sectionizer
   - Item pattern matching
   - MD&A extraction
   - Risk Factors extraction
   - Notes extraction

2. Build 8-K sectionizer
   - Item number mapping
   - Event categorization
   - Exhibit handling

3. Create section storage
   - Store in Blob
   - Track with database
   - Hash for deduplication

**Validation Gate**:
- [ ] MD&A correctly extracted from 5 different 10-Ks
- [ ] Risk Factors properly identified
- [ ] 8-K items mapped to correct labels

#### Phase 3.2: Search Foundation
**Duration**: 2-3 days

**Tasks**:
1. Implement BM25 search
   - Text tokenization
   - Score calculation
   - Result ranking

2. Build `search_text` tool for dual patterns
   - Company-specific: Search within known company sections
   - Thematic: Search across all cached sections by criteria
   - Return spans with precise offsets and source metadata
   - Score-based ranking with relevance and recency

3. Add section priorities and discovery rules
   - Query-based weighting for different section types
   - Form-specific boosts (10-K MD&A > 8-K for fundamental analysis)
   - Thematic query rules (revenue recognition → accounting sections)
   - Configurable discovery patterns

**Validation Gate**:
- [ ] Company-specific: Can find "goodwill impairment" in AAPL 10-K
- [ ] Thematic: Can find "revenue recognition" across multiple 10-Ks
- [ ] Section priorities affect ranking appropriately
- [ ] Offsets correctly map to source documents
- [ ] Discovery patterns work for common thematic queries

### RAG Pipeline Phase
*Now we can answer questions*

#### Phase 4.1: Embeddings & Vector Search
**Duration**: 3 days

**Tasks**:
1. Implement chunking
   - 1-2k char chunks
   - 200 char overlap
   - Maintain boundaries

2. Add embedding generation
   - Choose embedding model
   - Batch processing
   - Store in pgvector

3. Implement hybrid search
   - Combine BM25 + vector scores
   - Weighted combination
   - Re-ranking logic

**Validation Gate**:
- [ ] Chunks properly overlapped
- [ ] Embeddings stored and queryable
- [ ] Hybrid search improves recall

#### Phase 4.2: Answer Composition
**Duration**: 3 days

**Tasks**:
1. Build evidence assembler
   - Collect relevant spans
   - Track sources
   - Maintain offsets

2. Create LLM prompts
   - System prompt for accuracy
   - Citation requirements
   - No-speculation rules

3. Implement citation formatter
   - URL generation
   - Section references
   - Offset anchors

**Validation Gate**:
- [ ] Answers include proper citations
- [ ] No unsupported claims
- [ ] Citations link to correct sections

### API & UI Phase
*User-facing layer*

#### Phase 5.1: API Routes
**Duration**: 3 days

**Tasks**:
1. Implement `/api/chat`
   - Tool orchestration
   - Streaming responses
   - Error handling

2. Build `/api/filings/[cik]`
   - Parameter validation
   - Response formatting
   - Caching headers

3. Create `/api/search`
   - Query parsing
   - Progress streaming
   - Result pagination

**Validation Gate**:
- [ ] Chat endpoint handles conversations
- [ ] Filings endpoint returns correct data
- [ ] Search streams results progressively

#### Phase 5.2: Chat Interface
**Duration**: 3 days

**Tasks**:
1. Build chat UI
   - Message history
   - Input handling
   - Response rendering

2. Implement streaming
   - Partial results
   - Progress indicators
   - Error states

3. Add citation rendering
   - Inline links
   - Hover previews
   - Source indicators

**Validation Gate**:
- [ ] Full conversation flow works
- [ ] Citations are clickable
- [ ] Errors handled gracefully

### Enhancement Phase
*Only after core is solid*

#### Phase 6.1: XBRL Integration
**Duration**: 2-3 days

**Tasks**:
1. Add `xbrl_facts` tool
   - Company facts API
   - Frames API
   - Data parsing

2. Implement numeric verification
   - Cross-check narratives
   - Flag discrepancies
   - Format numbers

**Validation Gate**:
- [ ] Can fetch XBRL data
- [ ] Revenue queries work
- [ ] Numbers properly formatted

#### Phase 6.2: Advanced Features
**Duration**: Ongoing

**Tasks**:
1. Additional sectionizers
   - S-1/S-3 registration
   - 20-F foreign filers
   - Proxy statements

2. Third-party search
   - Integration setup
   - Re-verification flow
   - Feature flag control

3. Background jobs
   - Queue implementation
   - Progress tracking
   - Result caching

## Query Architecture Patterns

### Dual Query Pattern Support

**Company-Specific Queries**:
```
"What was Apple's revenue in Q3 2024?" 
"How does Microsoft describe AI risks in their latest 10-K?"
"Show me Tesla's cash flow from their most recent filing"
```

**Flow**: Query → Classify → Company Resolution → Filing Discovery → Section Search → Answer

**Thematic/Cross-Document Queries**:
```
"Show me all 10-Ks in the past year that include language around 'revenue recognition'"
"Which companies mentioned supply chain disruptions in their latest quarterly filings?"
"Find all companies that disclosed cybersecurity incidents in 8-K filings this year"
```

**Flow**: Query → Classify → Bulk Discovery → Cross-Document Search → Aggregated Answer

### Query Classification Logic

**Company-Specific Indicators**:
- Company names, tickers, or CIK numbers mentioned
- Possessive language ("Apple's revenue", "their latest filing")
- Specific company context cues

**Thematic Indicators**:
- Plural references ("companies that", "all 10-Ks")
- Comparative language ("which companies", "show me all")
- Time-bound document searches ("past year", "this quarter")
- Topic-focused without company specification

### Tool Orchestration Patterns

**Pattern 1: Company-Specific**
```
classify_query → resolve_company → list_filings → fetch_filing → 
extract_sections → search_text → compose_answer
```

**Pattern 2: Thematic Discovery**
```  
classify_query → discover_filings → bulk_fetch → extract_sections →
cross_search → aggregate_results → compose_answer
```

**Pattern 3: Hybrid (Company + Thematic)**
```
classify_query → resolve_company + discover_filings → merge_results →
unified_search → compose_answer
```

## Critical Path Dependencies

```mermaid
graph TD
    A[Project Setup] --> B[Core Data Layer]
    B --> C[SEC Foundation]
    C --> D[MCP Server]
    D --> E[Fetch Tools]
    E --> F[Sectionizers]
    F --> G[Search]
    G --> H[Embeddings]
    H --> I[Answer Composition]
    I --> J[API Routes]
    J --> K[Chat UI]
    K --> L[XBRL]
    K --> M[Advanced Features]
```

## Risk Mitigation

### Technical Risks
1. **SEC Rate Limiting**
   - Mitigation: EDGAR MCP handles compliance; build robust retry logic
   - Fallback: Queue and batch requests with intelligent prioritization

2. **Parsing Complexity**
   - Mitigation: Start with common forms (10-K, 10-Q, 8-K)
   - Fallback: Generic section extraction with confidence scoring

3. **Search Quality for Thematic Queries**
   - Mitigation: Implement hybrid BM25 + vector search early
   - Fallback: Multiple ranking strategies and progressive refinement

4. **Query Classification Accuracy**
   - Mitigation: Test with diverse query patterns and edge cases
   - Fallback: Allow manual query pattern override

5. **Cross-Document Performance**
   - Mitigation: Progressive streaming and result caching
   - Fallback: Result pagination and background processing

### Timeline Risks
1. **Scope Creep**
   - Mitigation: Strict phase gates
   - Fallback: Defer enhancements

2. **Integration Issues**
   - Mitigation: Test each layer independently
   - Fallback: Mock services for development

## Success Metrics

### Phase Metrics
- Foundation: All services connected
- MCP Tools: 100% validation coverage
- Sectionizers: 95% accuracy on test set
- RAG Pipeline: <3s response time
- API & UI: End-to-end working

### Overall Metrics
- Query accuracy: >90% correct citations for both patterns
- Response time: <5s for company-specific, <15s for thematic queries
- Query classification: >95% accuracy on pattern detection
- Cross-document recall: >85% relevant filings found for thematic queries
- Uptime: 99.9% availability
- Rate limiting: Zero 429 errors in production

## Team Allocation

### Single Developer Path
Follow phases sequentially, approximately 1-2 weeks total

### Multiple Developer Path
- Developer 1: Foundation → MCP Tools → API
- Developer 2: Sectionizers → Search → UI
- Developer 3: Embeddings → RAG → XBRL

Sync points after each phase completion.

## Next Steps

1. Complete Foundation Phase setup
2. Run validation gates
3. Proceed to MCP Tool Layer
4. Daily progress tracking against roadmap
5. Daily phase reviews

---

*This roadmap is a living document. Update completion status and adjust timelines based on actual progress.*