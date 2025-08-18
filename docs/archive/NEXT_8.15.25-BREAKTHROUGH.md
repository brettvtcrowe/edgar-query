# EDGAR Answer Engine - Deploy to Google Cloud Run

## 🎉 BREAKTHROUGH: MCP Confirmed Working!

**Status**: SEC EDGAR MCP tested and working perfectly with all 21 tools  
**Total Estimated Time**: 2-3 hours (now that we know MCP works)  
**Approach**: Deploy proven Docker image to Google Cloud Run with HTTP transport  
**Foundation**: Verified working MCP with real SEC data retrieval

---

## Current Situation

### What's Working ✅
- **Vercel Frontend**: Deployed at https://edgar-query-nu.vercel.app/
- **Database & Services**: PostgreSQL, Redis, Blob storage all healthy
- **SEC EDGAR MCP**: ✅ **CONFIRMED WORKING** with Docker image
- **Local Testing**: All 21 tools functional, real SEC data retrieved
- **MCP Inspector**: Full protocol verification successful

### What We Discovered 🎉
- **Docker Image Perfect**: `stefanoamorelli/sec-edgar-mcp:latest` works flawlessly
- **21 Tools Confirmed**: All SEC EDGAR tools accessible and functional
- **Real Data Verified**: Apple CIK lookup successful (`0000320193`)
- **Transport Understanding**: STDIO (local) vs HTTP (web) protocols clear

### Next Step 🚀
Deploy the working Docker image to Google Cloud Run with streamable HTTP transport.

---

## Implementation Plan

### Phase 1: Set Up Google Cloud Run (45 minutes)

**Prerequisites**: 
- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated

**Deployment Command**:
```bash
# Deploy the proven Docker image
gcloud run deploy edgar-mcp \
  --image stefanoamorelli/sec-edgar-mcp:latest \
  --port 8080 \
  --set-env-vars SEC_EDGAR_USER_AGENT="EdgarAnswerEngine/2.0 (brett.vantil@crowe.com)" \
  --allow-unauthenticated \
  --region us-central1 \
  --memory 1Gi \
  --cpu 1
```

**Expected Result**: HTTP endpoint available at `https://edgar-mcp-*.run.app`

### Phase 2: Configure HTTP Transport Wrapper (30 minutes)

**Option A: Use mcp-proxy (Recommended)**
```bash
# Install MCP proxy for HTTP transport
npm install -g mcp-proxy

# Create wrapper service
mcp-proxy --stdio-command "docker run --rm -i -e SEC_EDGAR_USER_AGENT=... stefanoamorelli/sec-edgar-mcp:latest" --port 8080
```

**Option B: Create Simple FastAPI Wrapper**
```python
# If needed, create minimal HTTP wrapper
from fastapi import FastAPI
import subprocess
import json

app = FastAPI()

@app.post("/mcp")
async def mcp_proxy(request: dict):
    # Proxy HTTP requests to stdio MCP
    return await proxy_to_stdio_mcp(request)
```

**Result**: HTTP API that wraps the stdio MCP transport

### Phase 3: Test Google Cloud Run Deployment (30 minutes)

**Step 1: Verify GCP Service**
```bash
# Test the deployed service
GCP_URL=$(gcloud run services describe edgar-mcp --region=us-central1 --format="value(status.url)")

# Health check (if HTTP wrapper provides it)
curl $GCP_URL/health

# Test MCP endpoint
curl -X POST $GCP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_cik_by_ticker",
      "arguments": {"ticker": "AAPL"}
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "cik": "0000320193",
  "ticker": "AAPL"
}
```

### Phase 4: Update Vercel Frontend (30 minutes)

**Update Environment Variables in Vercel**:
```bash
# Replace Railway URL with GCP URL
EDGAR_MCP_SERVICE_URL=$GCP_URL
# Remove Railway API key (if using unauthenticated GCP service)
# Or configure GCP authentication
```

**Update Frontend Code** (if needed):
```typescript
// In apps/web/src/lib/edgar-client.ts
// Update API calls to use GCP endpoint format
const response = await fetch(`${process.env.EDGAR_MCP_SERVICE_URL}/mcp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(mcpRequest)
});
```

### Phase 5: End-to-End Testing (30 minutes)

1. **Test Vercel App**: Go to https://edgar-query-nu.vercel.app/
2. **Test Queries**:
   - "What is Apple's CIK?" → Should return `0000320193`
   - "Show me Microsoft's latest 10-K"
   - "Get Tesla's recent 8-K filings"
3. **Verify Performance**: Check response times and error rates
4. **Monitor GCP Logs**: Ensure proper SEC compliance and rate limiting

---

## Success Criteria ✅

- [ ] Railway health check shows `"mcp_connection": true`
- [ ] `/tools` endpoint returns all 21 SEC EDGAR MCP tools
- [ ] Tool calls return actual SEC data
- [ ] No Docker dependencies
- [ ] Python MCP server runs directly
- [ ] Queries work from the Vercel frontend

---

## Troubleshooting

### If Python module not found:
- Check PYTHONPATH is set correctly
- Verify `pip install -e ./sec-edgar-mcp` ran during build
- Ensure sec_edgar_mcp folder structure is correct

### If MCP connection times out:
- Increase timeout in edgar-mcp-client.ts
- Check Python dependencies installed correctly
- Review Railway logs for Python errors

### If tools don't appear:
- Verify MCP initialization completes
- Check the initialized notification is sent
- Review stderr output for MCP server errors

---

## What We're NOT Doing

- ❌ NOT building a new MCP server
- ❌ NOT using Cloudflare Workers
- ❌ NOT creating "evidence-first" architecture
- ❌ NOT implementing A/B testing
- ❌ NOT building parallel systems

We're simply fixing the existing Railway deployment to properly run the Python MCP server we already have.

---

## Next Steps (After This Works)

Once the MCP connection is working:
1. Test all 21 tools thoroughly
2. Optimize performance with caching
3. Add monitoring and alerting
4. Document the working system
5. Consider adding more sophisticated query orchestration

But FIRST, we just need to get the basic connection working.