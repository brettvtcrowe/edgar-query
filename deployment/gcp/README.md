# GCP Deployment for EDGAR MCP

## Quick Start

### Prerequisites
- Google Cloud account with billing enabled
- Project ID: `edgar-query-mcp`
- gcloud CLI installed

### Step 1: Install gcloud CLI (if not installed)

**macOS:**
```bash
brew install google-cloud-sdk
```

**Other platforms:**
Visit: https://cloud.google.com/sdk/docs/install

### Step 2: Run Setup Script

```bash
cd deployment/gcp
./setup-gcp.sh
```

This will:
- Configure your GCP project
- Enable required APIs
- Set up authentication
- Configure default region

### Step 3: Deploy the MCP Service

**Option A: Deploy HTTP Proxy (Recommended)**
```bash
# This creates an HTTP wrapper around the MCP
cd deployment/gcp
npm install
gcloud run deploy edgar-mcp-proxy \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/2.0 (brett.vantil@crowe.com)"
```

**Option B: Use Cloud Build**
```bash
gcloud builds submit --config=cloudbuild.yaml
```

### Step 4: Get Your Service URL

```bash
# Get the deployed service URL
gcloud run services describe edgar-mcp-proxy \
  --region=us-central1 \
  --format='value(status.url)'
```

### Step 5: Update Vercel Environment

Add to your Vercel environment variables:
```
EDGAR_MCP_SERVICE_URL=https://edgar-mcp-proxy-xxxxx-uc.a.run.app
```

## Testing the Deployment

### Test Health Check
```bash
SERVICE_URL=$(gcloud run services describe edgar-mcp-proxy --region=us-central1 --format='value(status.url)')
curl $SERVICE_URL/health
```

### Test MCP Tool
```bash
curl -X POST $SERVICE_URL/mcp \
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

Expected response:
```json
{"success": true, "cik": "0000320193", "ticker": "AAPL"}
```

## Monitoring

View logs:
```bash
gcloud run logs read --service=edgar-mcp-proxy --region=us-central1
```

View in console:
- [GCP Console](https://console.cloud.google.com/home/dashboard?project=edgar-query-mcp)
- [Cloud Run Services](https://console.cloud.google.com/run?project=edgar-query-mcp)

## Troubleshooting

### Authentication Issues
```bash
gcloud auth login
gcloud config set project edgar-query-mcp
```

### API Not Enabled
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Service Not Responding
Check logs:
```bash
gcloud run logs read --service=edgar-mcp-proxy --region=us-central1 --limit=50
```

## Cost Optimization

The service is configured with:
- Auto-scaling from 0 to 10 instances
- 1 CPU, 2GB memory per instance
- Pay only for actual usage
- Estimated cost: $20-50/month for moderate usage

## Files in This Directory

- `setup-gcp.sh` - Initial GCP setup script
- `deploy-mcp.sh` - Deployment helper script
- `mcp-http-proxy.js` - HTTP to STDIO proxy for MCP
- `package.json` - Node.js dependencies
- `Dockerfile` - Container configuration
- `cloudbuild.yaml` - Cloud Build configuration
- `README.md` - This file