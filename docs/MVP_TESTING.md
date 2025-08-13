# MVP End-to-End Testing Guide

## 🧪 Test Commands (Run After Vercel Redeploy)

### 1. Health Check - Verify All Services
```bash
curl https://edgar-query-nu.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "edgar-chat-api",
  "capabilities": {
    "companyQueries": true,
    "thematicQueries": false,
    "hybridQueries": "partial"
  }
}
```

### 2. Simple Company Query
```bash
curl -X POST https://edgar-query-nu.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What was Apple'\''s revenue?"}]}'
```

### 3. Specific Filing Query
```bash
curl -X POST https://edgar-query-nu.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Show me Tesla'\''s recent 8-K filings"}]}'
```

### 4. Ticker Resolution Test
```bash
curl -X POST https://edgar-query-nu.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Get Microsoft'\''s company information"}]}'
```

## 🎯 Success Criteria

### ✅ Working MVP Should Show:
- Health check returns 200 with service status
- Chat API processes company-specific queries
- Query orchestrator classifies queries correctly
- EDGAR client connects to Railway service
- Railway service falls back to SEC API when MCP unavailable
- Results include company data and filing information

### ⚠️ Expected Limitations:
- Thematic queries ("all companies that...") not yet implemented
- MCP connection shows as disconnected (expected in Railway)
- Some advanced MCP tools may not work without Docker

## 🚀 Full Flow Test

**Complete Pipeline Test:**
User Query → Vercel API → Query Orchestrator → EDGAR Client → Railway Service → SEC APIs → Structured Response

This tests the entire MVP architecture end-to-end!

## 🐛 Troubleshooting

### If Health Check Fails:
- Check environment variables are set correctly
- Verify Railway service is running: `curl https://edgar-query-production.up.railway.app/health`
- Check Vercel function logs

### If Chat API Returns Errors:
- Look for specific error messages in response
- Common issues: missing environment variables, Railway service down, SEC API rate limits

### If No Response:
- Check Vercel deployment succeeded
- Verify API route exists and is deployed
- Test with simpler health endpoint first