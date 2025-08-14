# EDGAR Answer Engine - Evidence-First Architecture Reference

## System Architecture Overview

**Evidence-First SEC Query Engine (Cloudflare Workers MCP)**

The EDGAR Answer Engine implements a sophisticated, institutional-grade architecture designed around evidence-first principles, deterministic execution, and zero-hallucination guardrails. Built on Cloudflare Workers with native MCP protocol support, it provides verifiable, citation-backed answers to complex regulatory questions.

## 🎯 Core Architecture Principles

### Evidence-First Design
- **Every claim backed by evidence**: Specific filing, section, character offset, and hash verification
- **No speculation allowed**: No evidence = no claim; system refuses to generate unsupported statements
- **Hash-verified citations**: All evidence cross-checked against official SEC text
- **Numeric cross-validation**: Financial data verified against XBRL facts with narrative corroboration

### Deterministic Query Execution
```
Natural Language Query → LLM Plans Execution → Tools Execute Deterministically → LLM Composes from Evidence
```
- **LLM Role 1**: Query understanding and execution plan generation
- **Tool Execution**: Deterministic, programmatic evidence gathering
- **LLM Role 2**: Evidence composition into natural language (no speculation)

### Domain Expertise Integration
- **Form-specific sectionizers**: 10-K items, 8-K event mapping, comment letter parsing
- **Accounting lexicon**: ASC topic detection, revenue recognition patterns, restatement identification
- **Corporate event correlation**: Temporal linking of acquisitions to segment changes
- **Industry classification**: Life sciences, crypto, financial services domain knowledge

## 🏗️ System Components

### 1. Query Understanding Layer

#### Intent Classification Engine
```typescript
interface QueryClassification {
  pattern: 'COMPANY_SPECIFIC' | 'THEMATIC' | 'CORRELATION' | 'TEMPORAL' | 'NUMERIC';
  confidence: number;
  entities: {
    companies: ResolvedCompany[];
    timeWindows: TemporalRange[];
    forms: SECFormType[];
    ascTopics: AccountingStandard[];
    events: CorporateEventType[];
  }
}
```

#### Entity Resolution System
- **Company Resolution**: Ticker → CIK mapping with fuzzy matching and alias handling
- **Temporal Parsing**: "past 3 years", "within 12 months", "Q3 2024" → precise date ranges
- **ASC Topic Detection**: "revenue recognition", "principal vs agent" → ASC 606 classification
- **Event Classification**: "acquisition", "restatement", "segment change" → structured event types

#### Execution Plan Builder
```typescript
interface ExecutionPlan {
  steps: ExecutionStep[];
  parallelizable: boolean[];
  expectedDuration: number;
  fallbackStrategies: string[];
}

interface ExecutionStep {
  tool: string;
  parameters: Record<string, any>;
  outputSchema: ZodSchema;
  dependencies: string[];
}
```

### 2. Cloudflare Workers MCP Server

#### Native MCP Implementation
```typescript
export class EdgarMcpAgent extends McpAgent {
  server = new McpServer({
    name: "EDGAR Evidence-First Engine",
    version: "2.0.0",
    description: "Institutional-grade SEC filing analysis with evidence verification"
  });

  async init() {
    // Query understanding tools
    this.registerQueryTools();
    
    // Discovery and retrieval
    this.registerDiscoveryTools();
    
    // Domain-specific adapters
    this.registerDomainTools();
    
    // Analysis and correlation
    this.registerAnalysisTools();
  }
}
```

#### Tool Categories

**Query Understanding Tools**:
- `classify_intent` - Intent classification with confidence scoring
- `resolve_entities` - Company, time, form, topic entity extraction
- `build_execution_plan` - DSL compilation from natural language
- `validate_plan` - Feasibility and resource estimation

**Discovery & Retrieval Tools**:
- `discover_filings` - Structured metadata filters (form, date, industry, items)
- `bulk_fetch_sections` - Parallel fetching with SEC rate limit coordination
- `hybrid_search` - BM25 + embeddings + cross-encoder with section priors
- `verify_citations` - Hash verification against official SEC text

**Domain-Specific Adapters**:
- `sectionize_10k` - Items 1, 1A, 7, 7A, 8, 9A with accounting policy extraction
- `sectionize_8k` - Event mapping (2.01, 4.02, 5.02) with structured data extraction
- `parse_comment_letters` - UPLOAD/CORRESP thread parsing with Q&A identification
- `detect_accounting_events` - ASC 606/860, milestone method, early adoption detection
- `extract_numeric_facts` - XBRL-first extraction with narrative validation

**Correlation & Analysis Tools**:
- `link_temporal_events` - Acquisition → segment change correlation within time windows
- `detect_restatements` - 8-K Item 4.02 identification with reason extraction
- `track_policy_changes` - Multi-year accounting policy comparison with diff analysis
- `analyze_failed_sales` - ASC 860 factoring arrangement identification
- `milestone_method_finder` - Life sciences revenue recognition pattern detection

### 3. Evidence Store (Durable Objects)

#### Persistent State Management
```typescript
export class EdgarEvidenceStore extends DurableObject {
  private storage: DurableObjectStorage;
  private sql: SqlStorage;

  // Company events with temporal correlation
  async storeCompanyEvent(event: {
    type: CorporateEventType;
    cik: string;
    filingAccession: string;
    eventDate: string;
    description: string;
    relatedEvents: RelatedEvent[];
    confidence: number;
  }): Promise<void>;

  // Section storage with precise offsets
  async storeSectionWithOffsets(section: {
    filingAccession: string;
    sectionType: SectionType;
    startOffset: number;
    endOffset: number;
    textHash: string;
    topics: ASCTopic[];
    extractedData: StructuredData;
  }): Promise<void>;

  // Accounting topic indexing
  async indexAccountingTopic(topic: {
    ascCode: string;
    keywords: string[];
    negativePatterns: string[];
    typicalSections: SectionType[];
    industrySpecific: boolean;
  }): Promise<void>;
}
```

#### Knowledge Base Structure
- **Company Events**: Acquisitions, restatements, leadership changes with temporal links
- **Section Index**: Text offsets, topic classifications, structured data extraction
- **ASC Topic Library**: Accounting standard patterns, keywords, negative filters
- **Citation Cache**: Hash-verified text snippets with official SEC URLs
- **Correlation Graph**: Event relationships within temporal windows

### 4. Hybrid Search Stack

#### Multi-Stage Retrieval Pipeline
1. **Structured Filtering**: Form type, date range, company, industry, SEC items
2. **BM25 Text Search**: Keyword relevance with domain-specific term weighting
3. **Semantic Embeddings**: Dense vector similarity for conceptual matching
4. **Cross-Encoder Re-ranking**: Final precision ranking of top-200 candidates
5. **Section Priors**: Boost based on query type (risk → Item 1A, earnings → Item 2)

#### Performance Optimization
```typescript
interface SearchConfig {
  bm25Weight: 0.4;
  embeddingWeight: 0.4; 
  sectionBoost: 0.2;
  maxCandidates: 200;
  minRelevanceThreshold: 0.7;
  timeoutMs: 10000;
}
```

### 5. Evidence Verification System

#### Citation Verification Process
1. **Hash Calculation**: SHA-256 of exact text content from SEC filing
2. **Offset Validation**: Start/end character positions in original document
3. **URL Construction**: Direct links to SEC.gov Archives with anchor fragments
4. **Content Freshness**: Verification against latest filed versions
5. **Cross-Reference Check**: Multiple sources for critical claims

#### Guardrail Implementation
```typescript
class EvidenceGuardrails {
  async validateClaim(claim: string, evidence: Evidence[]): Promise<ValidationResult> {
    // No evidence = no claim
    if (evidence.length === 0) {
      return { valid: false, reason: "NO_EVIDENCE_FOUND" };
    }
    
    // Numeric claims require XBRL validation
    if (this.containsNumericClaim(claim)) {
      return await this.validateNumericEvidence(claim, evidence);
    }
    
    // Hash verification for all citations
    return await this.verifyEvidenceHashes(evidence);
  }
}
```

## 🔍 Query Processing Examples

### Complex Restatement Analysis
```typescript
// Query: "Find 8-K Item 4.02 restatements related to ASC 606 principal vs agent (3y)"
const plan: ExecutionPlan = {
  steps: [
    {
      tool: "discover_filings",
      parameters: { form: "8-K", items: ["4.02"], dateRange: "3y" },
      dependencies: []
    },
    {
      tool: "hybrid_search", 
      parameters: { 
        terms: ["revenue recognition", "principal vs agent", "ASC 606"],
        sections: ["item_4_02"],
        minRelevance: 0.8 
      },
      dependencies: ["discover_filings"]
    },
    {
      tool: "extract_evidence_spans",
      parameters: { topK: 3, contextWindow: 500 },
      dependencies: ["hybrid_search"]
    },
    {
      tool: "tabulate_results",
      parameters: { 
        columns: ["company", "date", "reason", "filing_url", "text_offset"] 
      },
      dependencies: ["extract_evidence_spans"]
    }
  ]
};
```

### Temporal Event Correlation
```typescript
// Query: "Show segment changes within 12 months of acquisitions"
const correlationPlan: ExecutionPlan = {
  steps: [
    {
      tool: "detect_acquisitions",
      parameters: { sources: ["8-K_2.01", "10-K_business"] },
      dependencies: []
    },
    {
      tool: "link_temporal_events",
      parameters: { eventType: "segment_change", window: "12mo" },
      dependencies: ["detect_acquisitions"]
    },
    {
      tool: "correlate_events",
      parameters: { correlationType: "causal", confidenceMin: 0.7 },
      dependencies: ["link_temporal_events"]
    }
  ]
};
```

## 📊 Performance Specifications

### Latency Targets
| Query Type | Target Latency | Evidence Sources | Verification Level |
|------------|----------------|------------------|-------------------|
| Company-specific facts | <3s | XBRL + narrative | Hash verified |
| Complex correlation | <15s | Multi-form analysis | Full verification |
| Thematic analysis | <10s | Cross-company search | Sampled verification |
| Numeric validation | <5s | XBRL-first lookup | Full cross-check |

### Accuracy Metrics
- **Citation Accuracy**: 95%+ verified against official SEC text
- **Evidence Coverage**: 90%+ recall@5 for domain queries
- **False Positive Rate**: <2% for claimed correlations
- **Numeric Accuracy**: 99.9% for XBRL-backed financial data

## 🛡️ Security & Compliance

### SEC API Compliance
- **User-Agent**: Descriptive identification with contact information
- **Rate Limiting**: Coordinated 10 req/sec limit across all services
- **Backoff Strategy**: Exponential backoff for 429/503 responses
- **Respectful Caching**: Reasonable TTL to reduce SEC infrastructure load

### Data Security
- **No PII Storage**: Only public filing data processed
- **Ephemeral Processing**: Temporary analysis data with TTL
- **Hash-Only Citations**: Text hashes stored, not full content
- **Audit Logging**: All queries logged with public identifiers only

## 🚀 Deployment Architecture

### Cloudflare Workers Configuration
```toml
name = "edgar-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-08-14"

[durable_objects]
bindings = [
  { name = "EDGAR_EVIDENCE_STORE", class_name = "EdgarEvidenceStore" },
  { name = "QUERY_SESSION", class_name = "QuerySessionState" }
]

[vars]
SEC_USER_AGENT = "EdgarAnswerEngine/2.0 (evidence-first analysis)"
HYBRID_SEARCH_TIMEOUT = "15000"
MAX_CONCURRENT_FETCHES = "10"
EVIDENCE_VERIFICATION_LEVEL = "FULL"
```

### Global Distribution
- **Edge Deployment**: 200+ Cloudflare locations worldwide
- **Regional Optimization**: Evidence store replicated to user regions
- **Failover Strategy**: Multi-region deployment with automatic failover
- **Performance Monitoring**: Sub-second health checks with detailed metrics

## 🔄 Integration Points

### Client Integration
```typescript
interface EdgarClient {
  // Evidence-first query interface
  async queryWithEvidence(
    query: string, 
    options: {
      verificationLevel: 'FULL' | 'SAMPLED' | 'HASH_ONLY';
      maxLatency: number;
      requiredSources: string[];
    }
  ): Promise<EvidenceBackedResponse>;
  
  // Plan preview for complex queries
  async previewExecutionPlan(query: string): Promise<ExecutionPlan>;
  
  // Citation verification
  async verifyCitation(citation: Citation): Promise<VerificationResult>;
}
```

### Monitoring & Observability
- **Query Performance**: Latency distribution by query complexity
- **Evidence Quality**: Citation accuracy and verification rates
- **Tool Performance**: Individual tool latency and success rates
- **SEC API Health**: Rate limiting, error rates, response times
- **User Patterns**: Query types, success rates, error categories

This architecture provides institutional-grade SEC analysis capabilities with verifiable accuracy, comprehensive domain expertise, and zero-hallucination guarantees through evidence-first design principles.