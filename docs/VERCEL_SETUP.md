# Vercel Environment Variables Setup

## 🚀 Required Environment Variables

Add these **exact values** to your Vercel dashboard:

### 1. Railway Service Integration
```bash
EDGAR_MCP_SERVICE_URL=https://edgar-query-production.up.railway.app
EDGAR_MCP_API_KEY=edgar-mcp-8d9ec9252e76507b2ea650306f68d783
```

### 2. SEC Compliance (Required)
```bash
SEC_USER_AGENT=EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)
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

### 6. Application Config
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