# Railway Deployment Guide for EDGAR MCP HTTP Bridge

## Quick Deploy Options

### Option 1: GitHub Integration (Recommended)
1. Go to [railway.app](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Select `brettvtcrowe/edgar-query`
4. Choose "services/edgar-mcp-http-bridge" as root directory
5. Set environment variables (see below)
6. Deploy!

### Option 2: CLI with API Token
```bash
# Set your Railway token
export RAILWAY_TOKEN="your-api-token-here"

# Navigate to service directory
cd services/edgar-mcp-http-bridge

# Login with token
railway login --browserless

# Initialize project
railway init

# Set environment variables
railway variables set SEC_EDGAR_USER_AGENT="EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)"
railway variables set API_KEY="edgar-mcp-8d9ec9252e76507b2ea650306f68d783"
railway variables set ALLOWED_ORIGINS="https://edgar-query-nu.vercel.app,https://*.vercel.app"
railway variables set NODE_ENV="production"

# Deploy
railway up
```

## Required Environment Variables

### Variable Definitions and Sources:

| Variable | Value | Source | Purpose |
|----------|-------|--------|---------|
| `SEC_EDGAR_USER_AGENT` | `EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)` | **YOU CREATE** - identifies your app to SEC | Required by SEC.gov for all API requests |
| `API_KEY` | `edgar-mcp-8d9ec9252e76507b2ea650306f68d783` | **YOU GENERATE** - acts like password | Prevents unauthorized access to your service |
| `ALLOWED_ORIGINS` | `https://edgar-query-nu.vercel.app,https://*.vercel.app` | **YOU SET** - your app domains | CORS security - which sites can call your service |
| `NODE_ENV` | `production` | **STANDARD** - Node.js convention | Tells app it's in production mode |
| `PORT` | `3001` | **RAILWAY SETS** - auto-provided | Railway overrides this automatically |

### Set these exact values in Railway dashboard:

```bash
SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)
API_KEY=edgar-mcp-8d9ec9252e76507b2ea650306f68d783
ALLOWED_ORIGINS=https://edgar-query-nu.vercel.app,https://*.vercel.app
NODE_ENV=production
```

⚠️ **IMPORTANT**: Save the API key `edgar-mcp-8d9ec9252e76507b2ea650306f68d783` - you'll need it for Vercel configuration!

## After Deployment

1. **Get your service URL** from Railway dashboard
2. **Update Vercel environment variables:**
   ```bash
   # In Vercel dashboard, add these EXACT values:
   EDGAR_MCP_SERVICE_URL="https://your-service.railway.app"  # Replace with actual Railway URL
   EDGAR_MCP_API_KEY="edgar-mcp-8d9ec9252e76507b2ea650306f68d783"
   ```

3. **Test the deployment:**
   ```bash
   # Health check (no auth needed)
   curl https://your-service.railway.app/health
   
   # Test authenticated endpoint (use YOUR Railway URL)
   curl -H "x-api-key: edgar-mcp-8d9ec9252e76507b2ea650306f68d783" https://your-service.railway.app/tools
   ```

## Quick Setup Commands

If you provide your Railway API token, I can run these commands for you:

```bash
export RAILWAY_TOKEN="your-token"
railway login --browserless
cd services/edgar-mcp-http-bridge
railway init
railway variables set SEC_EDGAR_USER_AGENT="EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)"
railway variables set API_KEY="edgar-mcp-8d9ec9252e76507b2ea650306f68d783"
railway variables set ALLOWED_ORIGINS="https://edgar-query-nu.vercel.app,https://*.vercel.app"
railway up
```

## Service Features

Once deployed, you'll have access to all 21 EDGAR MCP tools:
- Company resolution (ticker → CIK)
- Filing retrieval and analysis
- Financial data extraction
- Insider trading analysis
- Advanced SEC data tools

The service includes:
- ✅ Health monitoring
- ✅ API key authentication
- ✅ CORS support for Vercel
- ✅ Automatic scaling
- ✅ Docker-based deployment