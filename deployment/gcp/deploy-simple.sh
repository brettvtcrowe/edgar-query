#!/bin/bash

# Simple deployment using pre-built Docker image from Docker Hub
PROJECT_ID="edgar-query-mcp"
REGION="us-central1"
SERVICE_NAME="edgar-mcp-direct"

echo "🚀 Deploying SEC EDGAR MCP directly from Docker Hub"
echo ""

# Deploy the SEC EDGAR MCP image directly
gcloud run deploy $SERVICE_NAME \
  --image=docker.io/stefanoamorelli/sec-edgar-mcp:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=1Gi \
  --cpu=1 \
  --timeout=60 \
  --max-instances=10 \
  --set-env-vars="SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/2.0 (brett.vantil@crowe.com)" \
  --project=$PROJECT_ID

# Get the service URL
echo ""
echo "Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo ""
echo "✅ Service deployed at: $SERVICE_URL"
echo ""
echo "Note: This is the direct MCP service. It uses STDIO protocol, not HTTP."
echo "You'll need an HTTP wrapper to call it from your web app."