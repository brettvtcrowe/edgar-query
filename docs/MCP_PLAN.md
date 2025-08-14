# MCP_PLAN: Best-in-Class SEC EDGAR Query Engine via Cloudflare Workers

**Objective**: Implement a sophisticated, evidence-first SEC EDGAR query engine using Cloudflare Workers MCP server that provides deterministic query execution, hybrid retrieval, domain-specific adapters, and zero-hallucination guardrails.

## 🏛️ Architecture Principles (Evidence-First Approach)

### Core Design Philosophy
- **Evidence-first answers**: Every claim tied to specific filings/sections with offsets and URLs
- **Deterministic execution**: LLM plans query → deterministic tools execute → LLM composes from evidence
- **Hybrid retrieval**: Structured metadata filters + high-recall text search + domain re-ranking
- **Domain adapters**: Form-specific sectionizers, accounting lexicon (ASC topics), event detectors
- **Temporal correlation**: Time windows, event linking (acquisition → segment changes)
- **Zero-hallucination**: No evidence = no claim; numeric cross-checked against XBRL

## 📋 Step-by-Step Implementation Plan

### Phase 1: Setup Cloudflare Workers Environment (30 minutes)

#### Step 1.1: Install Cloudflare Tools
```bash
# Install Wrangler CLI
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login

# Create new Workers project
wrangler init edgar-mcp-server
cd edgar-mcp-server
```

#### Step 1.2: Install MCP Dependencies
```bash
# Install Cloudflare MCP SDK
npm install @cloudflare/mcp-sdk
npm install @cloudflare/workers-oauth-provider

# Install SEC EDGAR dependencies
npm install zod node-fetch cheerio
```

#### Step 1.3: Configure Project Structure
```
edgar-mcp-server/
├── src/
│   ├── index.ts           # Main Worker entry point
│   ├── mcp-agent.ts       # MCP server implementation
│   ├── tools/             # SEC EDGAR tools
│   │   ├── company-tools.ts
│   │   ├── filing-tools.ts
│   │   ├── financial-tools.ts
│   │   └── index.ts
│   └── auth/              # Authentication layer
│       ├── oauth.ts
│       └── tokens.ts
├── wrangler.toml          # Cloudflare configuration
└── package.json
```

### Phase 2: Implement Core MCP Server (2-3 hours)

#### Step 2.1: Create MCP Agent Base Class
File: `src/mcp-agent.ts`
```typescript
import { McpAgent } from '@cloudflare/mcp-sdk';
import { z } from 'zod';

export class EdgarMcpAgent extends McpAgent {
  server = new McpServer({
    name: "EDGAR Answer Engine MCP",
    version: "1.0.0",
    description: "SEC EDGAR filing analysis tools"
  });

  async init() {
    // Initialize all 21 SEC tools
    await this.initializeCompanyTools();
    await this.initializeFilingTools();
    await this.initializeFinancialTools();
  }
}
```

#### Step 2.2: Implement Deterministic Query Execution Tools

**Query Understanding Tools** (`src/tools/query-tools.ts`):
- `classify_intent` - Intent classification: company-specific, thematic, hybrid, metadata, numeric
- `resolve_entities` - Extract companies, time windows, forms, ASC topics
- `build_execution_plan` - Compile NL → structured plan (DSL)

**Discovery & Retrieval Tools** (`src/tools/discovery-tools.ts`):
- `discover_filings` - Structured metadata filters (form, date, industry, items)
- `bulk_fetch_sections` - Parallel fetching with SEC rate limits
- `hybrid_search` - BM25 + embeddings + cross-encoder re-ranking
- `verify_citations` - Hash check against official SEC text

**Domain-Specific Adapters** (`src/tools/domain-tools.ts`):
- `sectionize_10k` - Items 1, 1A, 7, 7A, 8, 9A with accounting policies
- `sectionize_8k` - Item mapping (2.01, 4.02, 5.02) with event detection
- `parse_comment_letters` - UPLOAD/CORRESP thread extraction
- `detect_accounting_events` - ASC 606/860, restatements, early adoption
- `extract_numeric_facts` - XBRL-first with narrative corroboration

**Correlation & Analysis Tools** (`src/tools/analysis-tools.ts`):
- `link_temporal_events` - Acquisition → segment changes within 12mo
- `detect_restatements` - 8-K Item 4.02 + reason extraction
- `track_policy_changes` - Compare accounting policies across years
- `analyze_failed_sales` - ASC 860 factoring arrangements
- `milestone_method_finder` - Life sciences revenue recognition

#### Step 2.3: Add Authentication Layer
File: `src/auth/oauth.ts`
```typescript
import { WorkersOAuthProvider } from '@cloudflare/workers-oauth-provider';

export class EdgarAuthProvider {
  private oauthProvider: WorkersOAuthProvider;

  constructor(env: Env) {
    this.oauthProvider = new WorkersOAuthProvider({
      clientId: env.OAUTH_CLIENT_ID,
      clientSecret: env.OAUTH_CLIENT_SECRET,
      scopes: ['edgar:read', 'edgar:analyze']
    });
  }

  async authenticateRequest(request: Request): Promise<boolean> {
    // Validate OAuth token and permissions
  }
}
```

### Phase 3: Evidence Store & Domain Knowledge Base (2 hours)

#### Step 3.1: Create Evidence Storage with Domain Models
File: `src/state/evidence-store.ts`
```typescript
export class EdgarEvidenceStore extends DurableObject {
  private storage: DurableObjectStorage;
  private sql: SqlStorage;

  // Domain-specific data models
  async storeCompanyEvent(event: {
    type: 'acquisition' | 'restatement' | 'segment_change' | 'early_adoption';
    cik: string;
    filingAccession: string;
    eventDate: string;
    description: string;
    relatedEvents?: string[]; // Link to other events within 12mo
  }): Promise<void> { }

  async storeSectionWithOffsets(section: {
    filingAccession: string;
    sectionType: string;
    startOffset: number;
    endOffset: number;
    textHash: string;
    topics: string[]; // ASC codes, keywords
  }): Promise<void> { }

  async getCachedAnalysis(
    queryPlan: ExecutionPlan,
    maxAge: number = 3600000 // 1 hour
  ): Promise<AnalysisResult | null> { }

  async indexAccountingTopic(topic: {
    ascCode: string;
    keywords: string[];
    negativePatterns: string[];
    sections: string[]; // Which sections typically contain this
  }): Promise<void> { }
}
```

#### Step 3.2: Configure Wrangler for Durable Objects
File: `wrangler.toml`
```toml
name = "edgar-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-08-14"

[durable_objects]
bindings = [
  { name = "EDGAR_SESSION", class_name = "EdgarSessionState" }
]

[[migrations]]
tag = "v1"
new_classes = ["EdgarSessionState"]

[vars]
ENVIRONMENT = "production"
SEC_USER_AGENT = "EdgarAnswerEngine-MCP/1.0"

[env.production.vars]
OAUTH_CLIENT_ID = "your-oauth-client-id"
OAUTH_CLIENT_SECRET = "your-oauth-client-secret"
```

### Phase 4: Deploy and Test (1 hour)

#### Step 4.1: Deploy to Cloudflare
```bash
# Deploy to production
wrangler deploy

# Get deployment URL
wrangler tail # Monitor logs
```

#### Step 4.2: Test MCP Connection
```bash
# Test health endpoint
curl https://edgar-mcp-server.your-subdomain.workers.dev/health

# Test MCP tools listing
curl https://edgar-mcp-server.your-subdomain.workers.dev/mcp/tools

# Test specific tool
curl -X POST https://edgar-mcp-server.your-subdomain.workers.dev/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_cik_by_ticker", "arguments": {"ticker": "AAPL"}}'
```

### Phase 5: Update Client Integration (30 minutes)

#### Step 5.1: Update EDGAR Client Configuration
File: `packages/edgar-client/src/index.ts`
```typescript
export class EDGARClient {
  constructor(config: EDGARClientConfig) {
    if (config.mcpServiceUrl) {
      this.mcpClient = new CloudflareMCPClient({
        url: config.mcpServiceUrl,
        apiKey: config.mcpApiKey,
        transport: 'sse' // Server-sent events
      });
    }
  }
}
```

#### Step 5.2: Update Environment Variables
File: `apps/web/.env.example`
```bash
# Cloudflare MCP Server
EDGAR_MCP_SERVICE_URL="https://edgar-mcp-server.your-subdomain.workers.dev"
EDGAR_MCP_API_KEY="your-cloudflare-mcp-token"
```

### Phase 6: Production Deployment (15 minutes)

#### Step 6.1: Update Production Environment
```bash
# Set Vercel environment variables
vercel env add EDGAR_MCP_SERVICE_URL
vercel env add EDGAR_MCP_API_KEY

# Deploy updated client
git add -A
git commit -m "🔄 UPDATE: Switch to Cloudflare Workers MCP server"
git push origin main
```

#### Step 6.2: Verify End-to-End Integration
```bash
# Test production query
curl -X POST https://edgar-query-nu.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What was Apple revenue last quarter?"}]}'
```

## 🎯 Success Criteria & Example Query Handling

### Evidence-First Query Examples
```
✅ "Find all 8-K Item 4.02 restatements related to ASC 606 principal vs agent issues (3 years)"
→ discover_filings(form='8-K', date='3y') → filter_items(['4.02']) 
→ hybrid_search(['revenue recognition','principal vs agent','ASC 606'])
→ extract_spans(top_k=3/filing) → table[company, date, url, reason]

✅ "Which life sciences companies use milestone method for revenue recognition?"
→ filter_industry('life_sciences') → discover_filings(form=['10-K','10-Q'])
→ sectionize_accounting_policies() → search('milestone method')
→ extract_excerpts() → table[company, form, year, citation]

✅ "Show segment changes within 12 months of acquisitions"
→ detect_acquisitions(source='8-K_2.01') → link_temporal_events(window='12mo')
→ find_segment_changes() → correlate_events()
→ table[acquisition_date, segment_change_date, citation_pair]

✅ "Compare Microsoft's revenue recognition across last 5 years"
→ fetch_10k_series(cik='MSFT', years=5) → extract_accounting_policies()
→ align_by_topic('revenue_recognition') → diff_analysis()
→ timeline[year, policy_text, changes_highlighted]
```

### Technical Requirements
- [ ] **Zero-hallucination guardrails**: No evidence = no claim
- [ ] **Deterministic execution**: LLM plans → tools execute → LLM composes
- [ ] **Domain expertise**: ASC topic detection, event correlation, numeric verification
- [ ] **Evidence verification**: Hash-checked citations with exact offsets
- [ ] **Hybrid retrieval**: BM25 + embeddings + cross-encoder + section priors

### Domain Coverage Requirements  
- [ ] **Accounting standards**: ASC 606/860, milestone method, failed sales
- [ ] **Corporate events**: Acquisitions, restatements, segment changes, early adoption
- [ ] **SEC forms mastery**: 10-K/10-Q items, 8-K event mapping, comment letters
- [ ] **Temporal correlation**: Event linking with 12-month windows
- [ ] **Numeric accuracy**: XBRL-first with narrative cross-checking

### Performance Requirements
- [ ] **Complex queries**: <15s for cross-document correlation analysis
- [ ] **Simple queries**: <3s for company-specific fact retrieval  
- [ ] **Accuracy metrics**: 95%+ citation accuracy, 90%+ recall@5
- [ ] **Evidence quality**: Every claim backed by specific filing/section/offset

## 📊 Benefits Over Railway Approach

### Technical Advantages
- **Native MCP Support**: Purpose-built SDK vs custom HTTP bridge
- **No Docker Issues**: Serverless functions vs container deployment problems
- **Global Performance**: Edge network vs single-region deployment
- **Built-in Auth**: OAuth provider vs manual token management
- **State Management**: Durable Objects with SQL vs external database requirements

### Operational Advantages  
- **Zero Maintenance**: Managed service vs server administration
- **Auto-scaling**: Handles traffic spikes automatically
- **Cost Efficient**: Pay-per-request vs fixed server costs
- **Future-Proof**: Built for MCP protocol evolution

## 🚀 Timeline & Migration Path

### Immediate Implementation (Phase A: 8-10 hours)
**Goal**: Deploy sophisticated MCP server with evidence-first architecture

- **Phase 1**: 30 minutes (Cloudflare Setup)
- **Phase 2**: 4-5 hours (Deterministic Tools & Domain Adapters)  
- **Phase 3**: 2 hours (Evidence Store & Knowledge Base)
- **Phase 4**: 1 hour (Deploy & Test Complex Queries)
- **Phase 5**: 30 minutes (Client Integration)
- **Phase 6**: 15 minutes (Production Deployment)

### Future Enhancements (Phase B: 15-20 hours)
**Goal**: Add advanced correlation, event linking, and evaluation framework

- **Domain Sectionizers**: Advanced parsing for all SEC forms
- **Event Graph**: Materialized acquisition → segment change correlations  
- **Hybrid Search**: BM25 + embeddings + cross-encoder stack
- **Evaluation Suite**: Gold datasets for regression testing
- **Performance Optimization**: Sub-10s complex queries

## 📋 Next Actions

1. **Create Cloudflare account** if not already available
2. **Set up Workers project** following Phase 1 steps
3. **Implement core MCP agent** with all 21 SEC tools
4. **Deploy and test** before switching production traffic
5. **Update client integration** and deploy to Vercel

## 📊 Integration with Best-in-Class Analysis

This implementation directly addresses the sophisticated analysis insights:

### Evidence-First Implementation
- **Deterministic execution**: Query → Plan → Execute → Compose (no prompt-only hallucination)
- **Citation verification**: Hash-checked offsets to official SEC text
- **Numeric cross-checking**: XBRL facts validated against narrative mentions
- **Domain lexicon**: ASC topic dictionaries, accounting pattern matching

### Advanced Query Capabilities
```typescript
// Example: Complex restatement analysis
const plan = buildExecutionPlan(`
  Find 8-K Item 4.02 restatements related to ASC 606 principal vs agent (3y)
`);
// → discover_filings(form='8-K', items=['4.02'], date='3y')
// → filter_by_topic(['ASC 606', 'principal vs agent', 'revenue recognition'])  
// → extract_evidence_spans(min_relevance=0.8)
// → tabulate_results([company, date, reason, filing_url, text_offset])
```

### Domain Expertise Integration
- **Form-specific sectionizers**: 10-K items, 8-K event mapping, comment letter parsing
- **Accounting standards**: ASC 606/860 detection, milestone method identification
- **Event correlation**: Acquisition → segment change linking with temporal windows
- **Industry filtering**: Life sciences, crypto, financial services classification

### Quality Assurance Framework
- **Regression testing**: Gold datasets for each query pattern
- **Performance metrics**: Citation accuracy, recall@k, response time monitoring
- **Evaluation dashboard**: Automated testing of variant phrasings and edge cases

This provides a production-ready foundation for sophisticated SEC analysis that can handle complex regulatory queries with institutional-grade accuracy and evidence backing.