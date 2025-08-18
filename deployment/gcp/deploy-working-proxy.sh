#!/bin/bash

echo "🚀 Deploying Working HTTP Proxy to Cloud Run"
echo ""
echo "This deploys a basic HTTP service that will work on Cloud Run."
echo "MCP integration will be added in the next step."
echo ""

cd /Users/bvantil/Documents/dev/edgar-query/deployment/gcp

# Ensure dependencies are installed
echo "Installing dependencies..."
npm install

# Deploy the service
echo "Deploying to Cloud Run..."
gcloud run deploy edgar-mcp-proxy \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --timeout=60 \
  --max-instances=10 \
  --set-env-vars="SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/2.0 (brett.vantil@crowe.com)" \
  --project=edgar-query-mcp

# Get the service URL
echo ""
echo "Getting service URL..."
SERVICE_URL=$(gcloud run services describe edgar-mcp-proxy --region=us-central1 --format='value(status.url)')
echo ""
echo "✅ Service deployed at: $SERVICE_URL"
echo ""
echo "Test it with:"
echo "  curl $SERVICE_URL/health"
echo ""
echo "This is a working HTTP proxy. Next step: integrate actual MCP tools."