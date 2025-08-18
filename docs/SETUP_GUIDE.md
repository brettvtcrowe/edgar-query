# EDGAR Answer Engine - Setup Guide

## Prerequisites

### Required Software
- **Node.js**: v20.0.0 or higher
- **pnpm**: v8.0.0 or higher (`npm install -g pnpm`)
- **Python**: v3.11+ (for MCP server)
- **Git**: v2.0.0 or higher

### Required Accounts
- **GitHub**: For repository and version control
- **Vercel**: For Next.js web application hosting
- **Google Cloud**: For MCP server hosting (Google Cloud Run)
- **OpenAI/Anthropic**: For LLM API access

### Required Services
- **PostgreSQL**: Database (Neon/Supabase recommended)
- **Redis**: Rate limiting (Upstash recommended)

## Architecture Overview

🎉 **BREAKTHROUGH**: SEC EDGAR MCP confirmed working perfectly!

Simple, reliable architecture using the proven SEC EDGAR MCP:

```
User Browser
     ↓
Vercel (Next.js App)
     ↓
Google Cloud Run ← MCP HTTP Service
     ↓
SEC EDGAR MCP ✅ TESTED (21 tools)
     ↓
SEC EDGAR API ✅ LIVE DATA

Supporting Services:
- PostgreSQL (metadata & caching)
- Redis (rate limiting)
- Vercel Blob (filing cache)
```

**Status**: MCP tested locally with all 21 tools working. Ready for GCP deployment.

## Step-by-Step Setup

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd edgar-query
pnpm install
```

### Step 2: Database Setup

#### Option A: Neon PostgreSQL (Recommended)
1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Enable pgvector extension:
   ```sql
   CREATE EXTENSION vector;
   ```
4. Copy connection string

#### Option B: Supabase PostgreSQL  
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor and run:
   ```sql
   CREATE EXTENSION vector;
   ```
4. Copy connection string from Settings → Database

### Step 3: Redis Setup (Upstash)

1. Create account at [upstash.com](https://upstash.com)
2. Create new Redis database
3. Choose global replication for best performance
4. Copy connection URL

### Step 4: Test MCP Locally (NEW STEP!)

🎯 **CRITICAL**: Test the MCP locally before deploying!

```bash
# Pull the official Docker image
docker pull stefanoamorelli/sec-edgar-mcp:latest

# Test with MCP Inspector
npx @modelcontextprotocol/inspector docker run --rm -i \
  -e SEC_EDGAR_USER_AGENT="EdgarAnswerEngine/2.0 (your-email@example.com)" \
  stefanoamorelli/sec-edgar-mcp:latest
```

**Expected Result**: 
- ✅ MCP Inspector opens at `http://localhost:6274`
- ✅ All 21 SEC EDGAR tools visible
- ✅ Test `get_cik_by_ticker("AAPL")` → Should return `0000320193`

### Step 5: Configure Environment Variables

#### Vercel Environment Variables
```env
# Database
DATABASE_URL=postgresql://username:password@host/database

# Redis  
REDIS_URL=redis://username:password@host:port

# Google Cloud Run MCP Service (after deployment)
EDGAR_MCP_SERVICE_URL=https://edgar-mcp-XXXXXX-uc.a.run.app

# LLM API
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...

# Storage
VERCEL_BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### Step 6: Deploy Next.js App to Vercel

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy:
   ```bash
   git push origin main
   ```
4. Vercel will auto-deploy

### Step 7: Deploy MCP Service to Google Cloud Run

🎯 **NEW APPROACH**: Deploy the proven Docker image directly

#### Prerequisites
```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

#### Deploy MCP Service
```bash
# Deploy the confirmed working Docker image
gcloud run deploy edgar-mcp \
  --image stefanoamorelli/sec-edgar-mcp:latest \
  --port 8080 \
  --set-env-vars SEC_EDGAR_USER_AGENT="EdgarAnswerEngine/2.0 (your-email@example.com)" \
  --allow-unauthenticated \
  --region us-central1 \
  --memory 1Gi \
  --cpu 1
```

#### Get Service URL
```bash
# Get the deployed service URL
GCP_URL=$(gcloud run services describe edgar-mcp --region=us-central1 --format="value(status.url)")
echo "MCP Service deployed at: $GCP_URL"
```

**Note**: You'll need to configure HTTP transport wrapper - see GCP_DEPLOYMENT_GUIDE.md for details.

### Step 8: Local Development

#### Start Local Development
```bash
# Test MCP locally first
npx @modelcontextprotocol/inspector docker run --rm -i \
  -e SEC_EDGAR_USER_AGENT="EdgarAnswerEngine/2.0 (your-email@example.com)" \
  stefanoamorelli/sec-edgar-mcp:latest

# Start local development servers
pnpm dev

# (Optional) Start local HTTP bridge for development
cd services/edgar-mcp-http-bridge
npm run dev
```

#### Test Local Setup
```bash
# Test Vercel app health
curl http://localhost:3000/api/health

# Test MCP locally via Inspector
# Visit http://localhost:6274 to test all 21 tools

# Test specific tool: get_cik_by_ticker
# Should return: {"success": true, "cik": "0000320193", "ticker": "AAPL"}
```

## Verification

### Test Production Deployment

1. **Frontend Health Check**:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```
   Should return: `{"status":"ok","db":true,"redis":true,"blob":true}`

2. **Google Cloud Run MCP Health Check**:
   ```bash
   curl https://edgar-mcp-XXXXXX-uc.a.run.app/health
   ```
   Should return health status (once HTTP wrapper is configured)

3. **MCP Tools Test**:
   ```bash
   # Test via MCP Inspector first
   npx @modelcontextprotocol/inspector docker run --rm -i \
     -e SEC_EDGAR_USER_AGENT="EdgarAnswerEngine/2.0 (your-email@example.com)" \
     stefanoamorelli/sec-edgar-mcp:latest
   
   # Expected: All 21 SEC EDGAR tools available
   ```

4. **End-to-End Test**:
   - Go to your Vercel app
   - Try query: "What is Apple's CIK?"
   - Should get response: `0000320193` with proper citation

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Test PostgreSQL connection
pnpm prisma db pull

# Generate Prisma client
pnpm prisma generate
```

#### Redis Connection  
```bash
# Test Redis (requires redis-cli)
redis-cli -u $REDIS_URL ping
```

#### MCP Connection Issues
- **FIRST**: Test MCP locally with Docker + MCP Inspector
- Check Google Cloud Run logs for container errors
- Verify `SEC_EDGAR_USER_AGENT` environment variable is set
- Confirm HTTP transport wrapper is configured correctly

#### SEC API Compliance
- ✅ **CONFIRMED**: SEC EDGAR MCP handles compliance automatically
- Verify `SEC_EDGAR_USER_AGENT` is set with your contact email
- Check rate limiting (should be ≤10 requests/second)
- Monitor for 429 (rate limit) errors

### Environment-Specific Issues

#### Vercel Deployment
- Check build logs for missing environment variables
- Verify Prisma client generation succeeds
- Ensure binary targets include `rhel-openssl-3.0.x`

#### Google Cloud Run Deployment
- Ensure Docker image `stefanoamorelli/sec-edgar-mcp:latest` is accessible
- Verify HTTP transport wrapper is configured
- Monitor memory and CPU usage
- Check container logs for startup errors

## Success Criteria

Your setup is complete when:
- ✅ **Local MCP Testing**: All 21 tools work via MCP Inspector
- ✅ **Apple CIK Test**: `get_cik_by_ticker("AAPL")` returns `0000320193`
- ✅ **Vercel Health Check**: DB, Redis, Blob all true
- ✅ **GCP MCP Service**: Deployed and responding to HTTP requests
- ✅ **End-to-End Queries**: Full query workflow functional
- ✅ **SEC Compliance**: Proper rate limiting and User-Agent handling

## Next Steps

After successful setup:
1. Test various query types (company-specific, thematic)
2. Monitor performance and error rates
3. Configure monitoring/alerting as needed
4. Scale services based on usage patterns

---

This setup provides a complete SEC EDGAR query engine using the proven SEC EDGAR MCP with 21 specialized tools.