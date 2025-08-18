# EDGAR MCP HTTP Bridge Service - LEGACY

⚠️ **NOTICE**: This HTTP bridge service is now **LEGACY** and has been superseded by direct Google Cloud Run deployment of the SEC EDGAR MCP.

## Current Recommended Approach

Instead of using this custom HTTP bridge, deploy the SEC EDGAR MCP directly to Google Cloud Run:

- **Docker Image**: `stefanoamorelli/sec-edgar-mcp:latest` (confirmed working)
- **Platform**: Google Cloud Run (official MCP hosting platform)
- **Documentation**: See `docs/GCP_DEPLOYMENT_GUIDE.md`

## What This Service Was

This was a Node.js/Express HTTP wrapper around the SEC EDGAR MCP, designed to bridge the gap between Railway deployment limitations and the MCP's stdio transport requirements.

### Why It's No Longer Needed

1. **Direct MCP Deployment**: Google Cloud Run can host the MCP Docker image directly
2. **Transport Protocol**: HTTP transport wrappers can be minimal and purpose-built
3. **Reduced Complexity**: Fewer moving parts and potential failure points
4. **Official Platform**: Google Cloud Run is the recommended MCP hosting platform

## Historical Context

This service provided:
- ✅ REST API wrapper for 21 EDGAR MCP tools
- ✅ API key authentication 
- ✅ CORS support for Vercel integration
- ✅ Docker-based MCP client integration

### Migration Path

If you're currently using this service:

1. **Deploy MCP to Google Cloud Run** following `docs/GCP_DEPLOYMENT_GUIDE.md`
2. **Update environment variables** in Vercel to point to the new GCP endpoint
3. **Test end-to-end functionality** with the direct MCP deployment
4. **Decommission** this HTTP bridge service

## Development Reference

For development or debugging purposes, this service can still be run locally:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server (requires Docker)
npm run dev
```

### Local Testing
```bash
# Health check
curl http://localhost:3002/health

# Test MCP tool
curl -X POST http://localhost:3002/tools/call \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "get_cik_by_ticker", "arguments": {"ticker": "AAPL"}}'
```

## Available MCP Tools (Reference)

The SEC EDGAR MCP provides these 21 tools:

### Company Tools
- `get_cik_by_ticker` - Convert ticker to CIK
- `get_company_info` - Get company details
- `search_companies` - Search for companies

### Filing Tools  
- `get_recent_filings` - Get recent SEC filings
- `get_filing_content` - Get filing text content
- `get_filing_sections` - Extract specific sections
- `analyze_8k` - Analyze 8-K filings

### Financial Tools
- `get_financials` - Get financial statements
- `get_key_metrics` - Get key financial metrics
- `get_segment_data` - Get segment data
- `compare_financials` - Compare company metrics

### Insider Trading Tools (10 tools)
- `get_insider_trades` - Recent insider transactions
- `analyze_insider_sentiment` - Trading pattern analysis
- Plus 8 more specialized insider analysis tools

---

**For current deployment instructions, see: `docs/GCP_DEPLOYMENT_GUIDE.md`**