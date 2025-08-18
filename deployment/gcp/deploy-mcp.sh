#!/bin/bash

# Deployment configuration
PROJECT_ID="edgar-query-mcp"
REGION="us-central1"
SERVICE_NAME="edgar-mcp"
PROXY_SERVICE_NAME="edgar-mcp-proxy"

echo "🚀 Deploying SEC EDGAR MCP to Google Cloud Run"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Option 1: Deploy the SEC EDGAR MCP directly (without HTTP proxy initially)
echo -e "${YELLOW}Option 1: Deploying SEC EDGAR MCP directly...${NC}"
echo "This will deploy the MCP but it needs an HTTP wrapper for web access"

gcloud run deploy $SERVICE_NAME \
  --image=stefanoamorelli/sec-edgar-mcp:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --timeout=60 \
  --concurrency=10 \
  --set-env-vars="SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/2.0 (brett.vantil@crowe.com)" \
  --project=$PROJECT_ID

echo ""
echo -e "${YELLOW}Option 2: Deploy the HTTP Proxy (recommended)${NC}"
echo "This wraps the MCP with an HTTP interface for web access"
echo ""
echo "To deploy the proxy, run:"
echo "  cd deployment/gcp"
echo "  gcloud builds submit --config=cloudbuild.yaml"
echo ""
echo "Or deploy from source:"
echo "  gcloud run deploy $PROXY_SERVICE_NAME --source . --region=$REGION --allow-unauthenticated"

# Get the service URL
echo ""
echo -e "${GREEN}Getting service URLs...${NC}"
echo ""

# Try to get MCP service URL
MCP_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null)
if [ ! -z "$MCP_URL" ]; then
    echo "MCP Service URL: $MCP_URL"
fi

# Try to get proxy service URL
PROXY_URL=$(gcloud run services describe $PROXY_SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null)
if [ ! -z "$PROXY_URL" ]; then
    echo "Proxy Service URL: $PROXY_URL"
    echo ""
    echo -e "${GREEN}✅ Use this URL in your Vercel environment:${NC}"
    echo "EDGAR_MCP_SERVICE_URL=$PROXY_URL"
fi

echo ""
echo "View logs:"
echo "  gcloud run logs read --service=$SERVICE_NAME --region=$REGION"
echo ""
echo "View in console:"
echo "  https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"