# EDGAR Answer Engine - Query Capabilities

## Overview

The EDGAR Answer Engine provides access to SEC EDGAR filings through 21 specialized MCP tools built by stefanoamorelli. Each query is processed using these proven tools to provide accurate, cited responses directly from official SEC data.

## 🛠️ Available MCP Tools (21 Total)

### Company Information Tools

#### `get_cik_by_ticker`
**Purpose**: Convert stock ticker to SEC CIK identifier  
**Example Query**: "What is Apple's CIK?"
```
Input: ticker="AAPL"
Output: {"cik": "0000320193", "name": "Apple Inc."}
```

#### `get_company_info`
**Purpose**: Get comprehensive company details  
**Example Query**: "Tell me about Microsoft as a company"
```
Input: cik="0000789019" 
Output: Company name, business description, industry, address, etc.
```

#### `search_companies`
**Purpose**: Search for companies by name or partial ticker  
**Example Query**: "Find companies with 'Tesla' in the name"
```
Input: query="Tesla"
Output: List of matching companies with CIKs and tickers
```

### Filing Access Tools

#### `get_recent_filings`
**Purpose**: Get recent SEC filings for a company  
**Example Query**: "Show me Apple's recent 10-K filings"
```
Input: cik="0000320193", form="10-K", limit=5
Output: List of recent filings with dates and accession numbers
```

#### `get_filing_content`
**Purpose**: Get full text or HTML content of a specific filing  
**Example Query**: "Get the full text of Apple's latest 10-K"
```
Input: cik="0000320193", accession="0000320193-23-000006"
Output: Complete filing text with proper formatting
```

#### `get_filing_sections`
**Purpose**: Extract specific sections from SEC filings  
**Example Query**: "Show me the risk factors from Tesla's latest 10-K"
```
Input: cik="0000789019", accession="...", sections=["risk_factors"]
Output: Extracted section content with references
```

#### `analyze_8k`
**Purpose**: Analyze 8-K current report filings for events  
**Example Query**: "What events were reported in Microsoft's recent 8-K?"
```
Input: cik="0000789019", accession="..."
Output: Event analysis with item numbers and descriptions
```

### Financial Data Tools

#### `get_financials`
**Purpose**: Extract XBRL financial statements  
**Example Query**: "What was Apple's revenue last quarter?"
```
Input: cik="0000320193", period="quarterly"
Output: Revenue, expenses, net income with exact figures and periods
```

#### `get_key_metrics`
**Purpose**: Calculate key financial metrics  
**Example Query**: "Show me Google's key financial metrics"
```
Input: cik="0001652044"
Output: P/E ratio, revenue growth, margins, etc.
```

#### `get_segment_data`
**Purpose**: Get business segment breakdown  
**Example Query**: "What are Amazon's business segments?"
```
Input: cik="0001018724"
Output: Segment revenue, operating income by business unit
```

#### `compare_financials`
**Purpose**: Compare financial data across periods  
**Example Query**: "Compare Apple's Q3 2024 vs Q3 2023 financials"
```
Input: cik="0000320193", periods=["2024-Q3", "2023-Q3"]
Output: Side-by-side comparison with changes highlighted
```

### Insider Trading Tools (10+ specialized tools)

#### `get_insider_trades`
**Purpose**: Get recent insider trading activity  
**Example Query**: "Show me recent insider trades for Tesla"
```
Input: cik="0000789019", days=90
Output: Insider transactions with dates, amounts, and relationships
```

#### `analyze_insider_sentiment`
**Purpose**: Analyze patterns in insider trading  
**Example Query**: "What's the insider sentiment for Netflix?"
```
Input: cik="0000789019"
Output: Buy/sell ratios, trend analysis, significant transactions
```

Plus 8 additional specialized insider trading analysis tools for comprehensive coverage.

## 🚀 Query Types Supported

### 1. Company-Specific Queries
**Performance**: 1-3 seconds  
**Data Source**: Direct from SEC EDGAR

**Examples**:
- "What is Apple's CIK number?"
- "Show me Microsoft's latest 10-K filing"
- "What was Tesla's revenue last quarter?"
- "Get Google's risk factors from their annual report"
- "Show me Amazon's business segments"

### 2. Financial Analysis Queries
**Performance**: 2-5 seconds  
**Data Source**: XBRL financial data + narrative sections

**Examples**:
- "Compare Apple's Q3 2024 vs Q3 2023 financials"
- "What are Microsoft's key financial metrics?"
- "Show me Tesla's quarterly revenue trend"
- "What's Amazon's operating margin by segment?"

### 3. Filing Content Queries
**Performance**: 1-3 seconds  
**Data Source**: Full SEC filing text

**Examples**:
- "Extract the business description from Apple's 10-K"
- "Show me the MD&A section from Microsoft's latest quarterly report"
- "What events were disclosed in Tesla's recent 8-K?"
- "Get the full text of Amazon's proxy statement"

### 4. Insider Trading Queries
**Performance**: 2-4 seconds  
**Data Source**: SEC insider trading forms

**Examples**:
- "Show me recent insider trades for Apple"
- "What's the insider sentiment for Tesla stock?"
- "Who are the major insider sellers at Microsoft?"
- "Analyze insider trading patterns for Google"

### 5. Discovery and Search Queries
**Performance**: 3-8 seconds  
**Data Source**: SEC filing metadata

**Examples**:
- "Find all companies in the technology sector"
- "Show me recent 10-K filings from automotive companies"
- "Which companies filed 8-K reports this week?"
- "Search for companies mentioning 'artificial intelligence'"

## 📋 Response Format

All responses include:
- **Direct answer** based on SEC data
- **Source citation** with filing type and date
- **Accession number** for verification
- **Direct SEC.gov link** to original filing
- **Data extraction date** for currency

### Example Response Format:
```
Based on Apple Inc.'s Form 10-Q filed on August 3, 2024:

Apple reported net sales of $85.78 billion for Q3 2024, compared to $81.80 billion in Q3 2023, representing a 5% increase year-over-year.

Source: Form 10-Q (Accession: 0000320193-24-000073)
Filed: August 3, 2024
Verify at: https://sec.gov/Archives/edgar/data/320193/000032019324000073/aapl-20240630.htm
```

## ⚡ Performance Characteristics

| Query Type | Typical Response Time | Data Freshness |
|------------|----------------------|----------------|
| Company lookup | 1-2 seconds | Real-time |
| Recent filings | 2-3 seconds | Same day |
| Financial data | 2-5 seconds | Filing date |
| Full filing content | 3-8 seconds | Official SEC |
| Insider trades | 2-4 seconds | 1-2 days |
| Cross-company search | 5-15 seconds | Same day |

## 🔒 Compliance & Reliability

### SEC API Compliance
- **User-Agent**: Properly identified with contact information
- **Rate Limiting**: Maximum 10 requests/second to SEC APIs
- **Caching**: Respectful caching to minimize API load
- **Direct Access**: No data mirroring, always current

### Data Accuracy
- **Official Source**: All data from official SEC EDGAR database
- **No Interpretation**: Raw data presented without analysis bias
- **Verification Links**: Every response includes SEC.gov link for verification
- **Exact Precision**: Financial figures presented exactly as filed

### Error Handling
- Clear error messages when data unavailable
- Graceful degradation if SEC APIs are temporarily unavailable
- Automatic retry with exponential backoff
- Fallback to cached data when appropriate

## 📈 Supported Filing Types

The MCP tools support comprehensive analysis of:

- **10-K**: Annual reports
- **10-Q**: Quarterly reports  
- **8-K**: Current reports (events)
- **DEF 14A**: Proxy statements
- **Form 4**: Insider trading reports
- **Form 3/5**: Initial insider reports
- **S-1**: Registration statements
- **424B**: Prospectuses

Plus many other SEC form types as supported by the underlying MCP server.

---

**Note**: All capabilities are provided through the SEC EDGAR MCP by stefanoamorelli. No custom tools or advanced features are implemented beyond these 21 proven MCP tools.