# EDGAR Answer Engine - Evidence-First Setup Guide

## Prerequisites

### Required Software
- **Node.js**: v20.0.0 or higher
- **pnpm**: v8.0.0 or higher (`npm install -g pnpm`)
- **Wrangler CLI**: Latest version (`npm install -g wrangler`)
- **Git**: v2.0.0 or higher

### Required Accounts
- **GitHub**: For repository and version control
- **Vercel**: For Next.js web application hosting
- **Cloudflare**: For Workers MCP server deployment
- **OpenAI**: For LLM API access (evidence composition)

### Optional Services
- **Neon/Supabase**: PostgreSQL for advanced caching (basic functionality works without)
- **Upstash**: Redis for enhanced rate limiting (fallback available)

## Architecture Overview

The evidence-first EDGAR Answer Engine consists of:

```
Vercel (Next.js App) ←→ Cloudflare Workers (MCP Server) ←→ SEC APIs
        ↓                        ↓                         ↓
   User Interface        Evidence-First Tools        Official Data
     Chat API           Domain Adapters              SEC Filings
   Progress Updates     Hash Verification            XBRL Facts
```

## Step-by-Step Setup

### Step 1: Repository Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/edgar-query.git
cd edgar-query

# Install all dependencies
pnpm install

# Verify installation
pnpm --version
node --version
wrangler --version
```

### Step 2: Cloudflare Workers MCP Server

#### 2.1 Create Cloudflare Project

```bash
# Authenticate with Cloudflare
wrangler login

# Create MCP server project
mkdir edgar-mcp-server
cd edgar-mcp-server

# Initialize Workers project
wrangler init edgar-mcp-server
```

#### 2.2 Install MCP Dependencies

```bash
# Install Cloudflare MCP SDK
npm install @cloudflare/mcp-sdk
npm install @cloudflare/workers-oauth-provider

# Install SEC analysis dependencies
npm install zod node-fetch cheerio crypto
```

#### 2.3 Configure Wrangler

Create `wrangler.toml`:
```toml
name = "edgar-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-08-14"

[durable_objects]
bindings = [
  { name = "EDGAR_EVIDENCE_STORE", class_name = "EdgarEvidenceStore" },
  { name = "QUERY_SESSION", class_name = "QuerySessionState" }
]

[[migrations]]
tag = "v1"
new_classes = ["EdgarEvidenceStore", "QuerySessionState"]

[vars]
SEC_USER_AGENT = "EdgarAnswerEngine/2.0 (evidence-first analysis)"
HYBRID_SEARCH_TIMEOUT = "15000"
MAX_CONCURRENT_FETCHES = "10"
EVIDENCE_VERIFICATION_LEVEL = "FULL"

[env.production.vars]
OAUTH_CLIENT_ID = "your-oauth-client-id"
OAUTH_CLIENT_SECRET = "your-oauth-client-secret"
```

#### 2.4 Deploy MCP Server

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Note the deployment URL (e.g., https://edgar-mcp-server.your-subdomain.workers.dev)
```

### Step 3: Vercel Web Application

#### 3.1 Configure Environment Variables

Create `apps/web/.env.local`:
```bash
# OpenAI API for LLM composition
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Cloudflare MCP Server
EDGAR_MCP_SERVICE_URL="https://edgar-mcp-server.your-subdomain.workers.dev"
EDGAR_MCP_API_KEY="your-cloudflare-mcp-token"

# SEC Compliance
SEC_USER_AGENT="EdgarAnswerEngine/2.0 (your-email@example.com)"

# Optional: Database for advanced caching
# DATABASE_URL="postgresql://user:password@host:5432/edgar_query"
# REDIS_URL="redis://default:password@host:6379"

# Vercel Blob Storage (optional)
# BLOB_READ_WRITE_TOKEN="vercel_blob_token"

# Application Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### 3.2 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy application
vercel --prod

# Set environment variables in Vercel dashboard
vercel env add OPENAI_API_KEY
vercel env add EDGAR_MCP_SERVICE_URL
vercel env add EDGAR_MCP_API_KEY
vercel env add SEC_USER_AGENT
```

### Step 4: Local Development

#### 4.1 Start Development Environment

```bash
# Start Cloudflare Workers dev server (in edgar-mcp-server directory)
wrangler dev

# Start Next.js development server (in project root)
cd ../
pnpm dev
```

#### 4.2 Verify Setup

```bash
# Test MCP server health
curl https://edgar-mcp-server.your-subdomain.workers.dev/health

# Test local application
curl http://localhost:3000/api/health

# Test end-to-end query
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What was Apple revenue last quarter?"}]}'
```

## Advanced Configuration

### Database Setup (Optional)

For advanced caching and query optimization:

```bash
# Create PostgreSQL database
createdb edgar_query

# Enable pgvector extension
psql edgar_query -c "CREATE EXTENSION vector;"

# Run Prisma migrations
cd apps/web
pnpm prisma db push
pnpm prisma generate
```

### Redis Setup (Optional)

For enhanced rate limiting and caching:

```bash
# Local Redis
brew install redis
brew services start redis

# Or use Upstash cloud Redis
# Add REDIS_URL to environment variables
```

### Custom Domain Setup

#### Cloudflare Workers Custom Domain

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your MCP server worker
3. Go to Settings → Triggers
4. Add custom domain (e.g., `edgar-mcp.yourdomain.com`)

#### Vercel Custom Domain

1. Go to Vercel Dashboard → Your Project
2. Go to Settings → Domains
3. Add custom domain (e.g., `edgar.yourdomain.com`)

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM responses | `sk-proj-...` |
| `EDGAR_MCP_SERVICE_URL` | Cloudflare Workers MCP server URL | `https://edgar-mcp.workers.dev` |
| `SEC_USER_AGENT` | SEC-compliant User-Agent string | `EdgarAnswerEngine/2.0 (email@domain.com)` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Uses Durable Objects |
| `REDIS_URL` | Redis connection string | Uses in-memory fallback |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | Uses temp storage |
| `EDGAR_MCP_API_KEY` | Authentication for MCP server | Optional for development |

## Troubleshooting

### Common Issues

#### MCP Server Connection Failure
```bash
# Check MCP server deployment
wrangler tail edgar-mcp-server

# Verify environment variables
wrangler secret list
```

#### SEC API Rate Limiting
- Verify `SEC_USER_AGENT` is properly set
- Check Cloudflare Workers logs for rate limit errors
- Ensure only one query runs at a time during development

#### LLM Response Errors
- Verify `OPENAI_API_KEY` is valid and has credits
- Check API key permissions and rate limits
- Monitor token usage in OpenAI dashboard

#### Citation Verification Failures
- Check network connectivity to SEC.gov
- Verify hash calculation consistency
- Review evidence extraction accuracy

### Performance Optimization

#### Development Environment
```bash
# Use local caching
export NODE_ENV="development"
export ENABLE_LOCAL_CACHE="true"

# Increase timeout for complex queries
export QUERY_TIMEOUT="30000"
```

#### Production Environment
```bash
# Enable all optimizations
export NODE_ENV="production"
export ENABLE_EVIDENCE_CACHE="true"
export ENABLE_QUERY_OPTIMIZATION="true"
```

## Health Checks

### System Health Verification

```bash
# Check all systems
curl https://your-app.vercel.app/api/health

# Expected response:
{
  "status": "ok",
  "services": {
    "mcp": true,
    "sec_api": true,
    "llm": true
  },
  "evidence_verification": "enabled",
  "version": "2.0.0"
}
```

### Performance Monitoring

```bash
# Test query performance
time curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Test query"}]}'
```

This setup provides a complete evidence-first EDGAR analysis platform with institutional-grade accuracy, verifiable citations, and comprehensive domain expertise.