# Vercel Environment Variables Setup

## 🚀 Required Environment Variables

Add these **exact values** to your Vercel dashboard:

### 1. Google Cloud Run MCP Service Integration
```bash
# After deploying MCP to Google Cloud Run
EDGAR_MCP_SERVICE_URL=https://edgar-mcp-XXXXXX-uc.a.run.app
# Note: API key may not be needed for unauthenticated GCP service
```

### 2. SEC Compliance (Built into MCP)
```bash
# SEC User-Agent is handled by the MCP service itself
# No longer needed in Vercel environment variables
# Configured during GCP deployment with:
# SEC_EDGAR_USER_AGENT="EdgarAnswerEngine/2.0 (brett.vantil@crowe.com)"
```

### 3. Database (Already set)
```bash
DATABASE_URL=your-existing-neon-connection-string
```

### 4. Redis (Already set)
```bash
REDIS_URL=your-existing-upstash-connection-string
```

### 5. Blob Storage (Already set)
```bash
BLOB_READ_WRITE_TOKEN=your-existing-vercel-blob-token
```

### 6. LLM Configuration (Required for Chat API)
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 7. Application Config
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://edgar-query-nu.vercel.app
```

## 📝 Steps to Add Environment Variables

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Navigate to your `edgar-query` project
   - Click on **Settings** tab
   - Click on **Environment Variables**

2. **Add New Variables**
   For each variable above:
   - Click **"Add New"**
   - Enter the **Name** (e.g., `EDGAR_MCP_SERVICE_URL`)
   - Enter the **Value** (e.g., `https://edgar-query-production.up.railway.app`)
   - Select environment: **All** (Production, Preview, Development)
   - Click **Save**

3. **Redeploy**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a new commit to trigger deployment

## ✅ Verification

After adding variables and redeploying, test:

```bash
# Health check should show EDGAR client status
curl https://edgar-query-nu.vercel.app/api/health

# Chat API should work
curl -X POST https://edgar-query-nu.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What was Apple'\''s revenue?"}]}'
```

## 🎯 Expected Results

After setup:
- Health check shows all services connected
- Chat API returns company data via Railway → SEC APIs
- Full MVP functionality operational

## 🔧 Priority Variables to Add First

If you want to test incrementally, add these first:
1. `EDGAR_MCP_SERVICE_URL`
2. `EDGAR_MCP_API_KEY` 
3. `SEC_USER_AGENT`

Then redeploy and test the chat API.

## 🐛 Common Deployment Issues

### Prisma Binary Targets Error

**Error**: `ENOENT: no such file or directory, lstat '/vercel/path0/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node'`

**Solution**: Ensure your `prisma/schema.prisma` includes the correct binary targets:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "rhel-openssl-3.0.x"]
}
```

The `rhel-openssl-3.0.x` target is required for Vercel's Linux serverless environment.