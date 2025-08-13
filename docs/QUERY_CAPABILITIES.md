# EDGAR Answer Engine - Query Capabilities & Examples

**Current Capabilities**: Company-specific + Thematic search implemented

## Overview

This document outlines the full range of query capabilities supported by the EDGAR Answer Engine. The system now supports both **company-specific queries** (routed to EDGAR MCP service) and **thematic queries** (processed by custom cross-document search tools).

## Query Classification & Routing

The system automatically classifies queries into patterns and routes them to the appropriate processing system:

| Query Pattern | Processing System | Example |
|---------------|------------------|---------|
| **Company-Specific** | EDGAR MCP via HTTP | "Apple's latest 10-K filing" |
| **Thematic** | Thematic Search Package | "All companies mentioning cybersecurity" |
| **Hybrid** | Both systems (parallel) | "Compare Apple vs Microsoft revenue recognition" |
| **Metadata** | Direct SEC API | "How many 8-Ks were filed today?" |

## New Thematic Search Capabilities ✅

### Cross-Company Analysis
**Status**: ✅ **IMPLEMENTED**

The thematic search system enables queries that span multiple companies and documents:

#### Industry-Wide Trend Analysis
- ✅ "All technology companies mentioning artificial intelligence in their latest 10-Ks"
- ✅ "Show me financial services companies that disclosed credit losses in the past year"
- ✅ "Which healthcare companies mentioned FDA regulatory changes?"
- ✅ "Find all energy companies discussing renewable energy investments"

#### Cross-Document Topic Search  
- ✅ "All companies mentioning revenue recognition changes in the past 2 years"
- ✅ "Show me cybersecurity incident disclosures across all sectors"
- ✅ "Find companies that mentioned supply chain disruptions"
- ✅ "Which companies disclosed ASC 842 lease accounting impacts?"

#### Temporal Pattern Analysis
- ✅ "Compare AI risk disclosures between 2023 and 2024 10-Ks"
- ✅ "Show me the evolution of climate change disclosures over time"
- ✅ "Track mentions of inflation across quarterly filings"
- ✅ "Find increasing mentions of cybersecurity in risk factors"

#### Processing Architecture:
```typescript
// 1. Bulk Filing Discovery
bulkFilingDiscovery({
  industries: ['technology', 'financial'],
  formTypes: ['10-K', '10-Q'],
  dateRange: { start: '2024-01-01', end: '2024-12-31' }
}) 

// 2. Cross-Document Search
crossDocumentSearch({
  filings: discoveredFilings,
  query: 'artificial intelligence',
  sections: ['risk-factors', 'md&a'],
  includeSnippets: true
})

// 3. Result Aggregation
→ Ranked results with citations and company clustering
```

## EDGAR Database Coverage

The EDGAR database provides access to far more than just standard financial filings:

### Accessible Filing Types

| Filing Type | Form Codes | Description | Example Use Cases |
|-------------|------------|-------------|-------------------|
| **Annual/Quarterly Reports** | 10-K, 10-Q, 20-F | Comprehensive financial statements | Revenue analysis, risk factors, MD&A |
| **Current Reports** | 8-K, 6-K | Material events and changes | Acquisitions, restatements, leadership changes |
| **SEC Comment Letters** | UPLOAD | SEC staff review comments | Regulatory compliance patterns |
| **Company Responses** | CORRESP | Responses to SEC comments | Disclosure clarifications |
| **Registration Statements** | S-1, S-3, S-4 | Securities offerings | IPO analysis, merger documents |
| **Proxy Statements** | DEF 14A, DEFM14A | Shareholder voting materials | Executive compensation, governance |
| **Insider Trading** | Forms 3, 4, 5 | Ownership changes | Insider sentiment analysis |

## Supported Query Patterns

### 1. Regulatory Compliance Queries

**Capability**: Search across SEC comment letters and company responses to identify regulatory patterns and compliance issues.

**Example Queries**:
- ✅ "Find all SEC comment letters to cryptocurrency companies addressing revenue recognition in the past 2 years"
- ✅ "Show me companies that received SEC comments about segment reporting changes"
- ✅ "What are common SEC concerns about AI risk disclosures?"

**Processing Flow**:
1. Identify relevant companies (industry classification)
2. Search UPLOAD/CORRESP forms
3. Extract regulatory themes
4. Aggregate and summarize patterns

### 2. Financial Restatement Analysis

**Capability**: Identify and analyze financial restatements, particularly Item 4.02 disclosures in 8-K filings.

**Example Queries**:
- ✅ "Find all 8-K Item 4.02 restatements related to revenue recognition under ASC 606 in the past 3 years"
- ✅ "Which companies restated earnings due to principal vs. agent determinations?"
- ✅ "Show me restatements related to lease accounting changes"

**Processing Flow**:
1. Search 8-K filings for Item 4.02
2. Extract restatement reasons
3. Identify accounting standard references
4. Create structured summaries with links

### 3. Accounting Policy Tracking

**Capability**: Track changes in accounting policies and methods across time periods and companies.

**Example Queries**:
- ✅ "Compare Microsoft's revenue recognition policy changes over the last 5 years"
- ✅ "Find life sciences companies using the milestone method for revenue recognition"
- ✅ "Identify companies that early adopted new FASB standards"
- ✅ "Show me factoring arrangements accounted for as failed sales under ASC 860"

**Processing Flow**:
1. Extract accounting policy sections from 10-K/10-Q
2. Perform semantic comparison across periods
3. Identify specific accounting treatments
4. Highlight changes and adoptions

### 4. Corporate Event Correlation

**Capability**: Link corporate events across different filing types and time periods.

**Example Queries**:
- ✅ "Find companies that changed reportable segments within 12 months of an acquisition"
- ✅ "Show me companies with goodwill impairments following revenue declines"
- ⚠️ "Correlate insider selling with subsequent earnings misses" (Requires sophisticated temporal analysis)

**Processing Flow**:
1. Identify triggering event (e.g., acquisition in 8-K)
2. Search subsequent filings for related changes
3. Establish temporal relationships
4. Present correlated findings

### 5. Industry-Specific Analysis

**Capability**: Perform targeted analysis within specific industries or sectors.

**Example Queries**:
- ✅ "How do semiconductor companies describe supply chain risks?"
- ✅ "Find all biotech companies discussing FDA approval risks"
- ✅ "Compare AI investment disclosures across big tech companies"

**Processing Flow**:
1. Industry classification and company selection
2. Targeted content extraction
3. Cross-company comparison
4. Thematic aggregation

### 6. Thematic Cross-Document Search

**Capability**: Search for themes and topics across the entire EDGAR database.

**Example Queries**:
- ✅ "Find all mentions of 'carbon neutrality' commitments in recent 10-Ks"
- ✅ "Which companies disclosed cybersecurity incidents in the past year?"
- ✅ "Show me all references to Russia/Ukraine impact on operations"

**Processing Flow**:
1. Bulk filing discovery across all companies
2. Content search with relevance scoring
3. Progressive result streaming
4. Aggregated insights with citations

## Query Classification System

The system automatically classifies queries into four primary patterns:

### Pattern 1: Company-Specific
**Examples**:
- "What was Apple's Q3 2024 revenue?"
- "Show me Tesla's latest 8-K filings"

**Routing**: EDGAR MCP tools → Company resolution → Filing retrieval

### Pattern 2: Thematic
**Examples**:
- "All companies mentioning supply chain disruption"
- "Find revenue recognition policy changes industry-wide"

**Routing**: Custom thematic search → Cross-document analysis

### Pattern 3: Hybrid
**Examples**:
- "Compare Apple's AI disclosures to other tech companies"
- "How does Microsoft's revenue recognition compare to industry standards?"

**Routing**: Both EDGAR MCP (company-specific) + Thematic search (industry-wide)

### Pattern 4: Temporal/Correlation
**Examples**:
- "Track segment changes post-acquisition"
- "Correlate restatements with executive turnover"

**Routing**: Multi-phase search with temporal analysis

## Advanced Capabilities

### Table Generation
The system can create structured tables from search results:
- Company name, filing date, filing link
- Extracted summaries and key metrics
- Comparative analysis across companies
- Temporal progression tracking

### Citation Management
Every answer includes:
- Direct links to source documents on SEC.gov
- Specific section references
- Excerpt highlighting
- Confidence scores for extracted information

### Progressive Streaming
For large-scale queries:
- Results stream as discovered
- Early partial results while search continues
- Ability to refine search based on initial findings
- Pagination for extensive result sets

## Limitations and Considerations

### Current Limitations
1. **Real-time data**: System accesses filed documents, not real-time market data
2. **Historical depth**: Practical limits on searching very old filings (pre-2000)
3. **Correlation complexity**: Some multi-factor correlations require manual analysis
4. **Non-EDGAR content**: Cannot access documents not filed with EDGAR

### Accuracy Considerations
- All answers are grounded in retrieved evidence
- System indicates confidence levels for interpretations
- Complex accounting interpretations may require professional review
- Temporal correlations are identified but causation is not implied

## Example Query Walkthroughs

### Example 1: Complex Restatement Analysis
**Query**: "Find all 8-K filings from the past three years that report a restatement under Item 4.02 related to revenue recognition, particularly ASC 606 principal vs. agent determinations"

**System Process**:
1. `bulkFilingDiscovery(form="8-K", dateRange="3years")`
2. Filter for Item 4.02 presence
3. `crossDocumentSearch("revenue recognition", "ASC 606", "principal agent")`
4. Extract restatement details with sectionizer
5. Generate table with company, date, link, and summary

**Expected Output**: Structured table with ~10-50 companies, depending on market conditions

### Example 2: SEC Comment Letter Pattern Analysis
**Query**: "Search for SEC comment letters issued to cryptocurrency or blockchain companies over the past two years that address revenue recognition disclosures"

**System Process**:
1. Identify crypto/blockchain companies via industry classification
2. `bulkFilingDiscovery(form=["UPLOAD", "CORRESP"], dateRange="2years")`
3. `crossDocumentSearch("revenue recognition", "digital assets", "token sales")`
4. Extract SEC concerns and company responses
5. Identify recurring themes and patterns

**Expected Output**: Summary of 3-5 common SEC concerns with specific examples

### Example 3: Accounting Policy Evolution
**Query**: "Compare Microsoft's revenue recognition policy disclosures in its last five 10-K filings"

**System Process**:
1. `get_recent_filings(cik="MSFT", form="10-K", count=5)`
2. Extract revenue recognition sections from each filing
3. Semantic comparison to identify changes
4. Highlight policy updates and standard adoptions
5. Create timeline of policy evolution

**Expected Output**: Year-by-year comparison with specific changes highlighted

## Best Practices for Query Formulation

### For Best Results
1. **Be specific about time ranges**: "past 3 years" vs. "recent"
2. **Include form types when known**: "in 10-K filings" vs. "in filings"
3. **Specify output format needs**: "create a table" vs. "summarize"
4. **Include relevant accounting standards**: "under ASC 606" when applicable

### Query Optimization Tips
- For company-specific queries, include ticker symbols
- For thematic searches, include multiple related keywords
- For compliance queries, reference specific regulations
- For comparative analysis, specify comparison criteria

---

*This document represents the full intended capabilities of the EDGAR Answer Engine based on architectural design and EDGAR database access. Not all features may be implemented in the current version.*