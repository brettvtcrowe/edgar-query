# Railway Deployment Troubleshooting

## Error: "Dockerfile `Dockerfile` does not exist"

### Cause
Railway is looking for Dockerfile from repository root, but our service is in `services/edgar-mcp-http-bridge/`

### Solution 1: Set Root Directory (RECOMMENDED)
1. In Railway dashboard, go to your service
2. Click "Settings" tab
3. Scroll to "Source Repo" section
4. Set **Root Directory** to: `services/edgar-mcp-http-bridge`
5. Click "Deploy" or trigger redeploy

### Solution 2: Update Build Configuration
1. In Railway dashboard, go to "Settings" 
2. Find "Build" section
3. Set **Dockerfile Path** to: `services/edgar-mcp-http-bridge/Dockerfile`
4. Save and redeploy

### Verify Settings
Your Railway configuration should show:
- **Repository**: `brettvtcrowe/edgar-query`
- **Branch**: `main`
- **Root Directory**: `services/edgar-mcp-http-bridge`
- **Build Command**: (empty - uses Dockerfile)

## After Fixing Directory Issue

### 1. Set Environment Variables
```
SEC_EDGAR_USER_AGENT = EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)
API_KEY = edgar-mcp-8d9ec9252e76507b2ea650306f68d783
ALLOWED_ORIGINS = https://edgar-query-nu.vercel.app,https://*.vercel.app
NODE_ENV = production
```

### 2. Deploy and Test
Once deployed:
```bash
# Test health endpoint (replace with your Railway URL)
curl https://your-service.railway.app/health

# Should return:
{
  "status": "healthy",
  "mcp": {
    "connected": true,
    "tools": 21
  },
  "timestamp": "2025-08-12T..."
}
```

### 3. Test Authenticated Endpoint
```bash
curl -H "x-api-key: edgar-mcp-8d9ec9252e76507b2ea650306f68d783" \
     https://your-service.railway.app/tools

# Should return list of 21 EDGAR MCP tools
```

## Common Issues

### Docker Socket Permission Error
If you see Docker socket errors:
- This is expected in Railway (no Docker-in-Docker support)
- The service will work, but MCP features may be limited
- Health check will still pass

### Build Timeouts
If builds timeout:
- Railway's Docker build can be slow
- The multi-stage build should complete in ~5-10 minutes
- Monitor build logs for progress

### Environment Variable Issues
Ensure all required variables are set:
- `SEC_EDGAR_USER_AGENT` - Required by SEC
- `API_KEY` - Required for authentication
- `ALLOWED_ORIGINS` - Required for CORS

## Next Steps After Successful Deployment

1. **Get your Railway service URL** (something like `https://edgar-mcp-production.up.railway.app`)
2. **Update Vercel environment variables:**
   - `EDGAR_MCP_SERVICE_URL` = your Railway URL
   - `EDGAR_MCP_API_KEY` = `edgar-mcp-8d9ec9252e76507b2ea650306f68d783`
3. **Test end-to-end** by making queries through your Vercel app