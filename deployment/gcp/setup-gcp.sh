#!/bin/bash

# GCP Project Configuration
PROJECT_ID="edgar-query-mcp"
PROJECT_NUMBER="650742540503"
REGION="us-central1"
SERVICE_NAME="edgar-mcp-proxy"

echo "🚀 Setting up Google Cloud Platform for EDGAR MCP deployment"
echo "Project ID: $PROJECT_ID"
echo "Project Number: $PROJECT_NUMBER"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if gcloud is installed
echo -e "${YELLOW}Step 1: Checking gcloud CLI installation...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}gcloud CLI is not installed!${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    echo "On macOS, you can use: brew install google-cloud-sdk"
    exit 1
fi
echo -e "${GREEN}✓ gcloud CLI found${NC}"

# Step 2: Set the project
echo -e "\n${YELLOW}Step 2: Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✓ Project set to $PROJECT_ID${NC}"

# Step 3: Check authentication
echo -e "\n${YELLOW}Step 3: Checking authentication...${NC}"
if ! gcloud auth list --format="value(account)" | grep -q "@"; then
    echo "You need to authenticate with Google Cloud"
    echo "Running: gcloud auth login"
    gcloud auth login
fi
echo -e "${GREEN}✓ Authenticated${NC}"

# Step 4: Enable required APIs
echo -e "\n${YELLOW}Step 4: Enabling required APIs...${NC}"
echo "This may take a few minutes..."

apis=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "containerregistry.googleapis.com"
    "compute.googleapis.com"
)

for api in "${apis[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api --project=$PROJECT_ID
done
echo -e "${GREEN}✓ All required APIs enabled${NC}"

# Step 5: Set default region
echo -e "\n${YELLOW}Step 5: Setting default region...${NC}"
gcloud config set run/region $REGION
echo -e "${GREEN}✓ Default region set to $REGION${NC}"

# Step 6: Create Cloud Build trigger (optional)
echo -e "\n${YELLOW}Step 6: Build and Deploy Options${NC}"
echo "You have two options for deployment:"
echo ""
echo "Option A: Deploy using Cloud Build (recommended)"
echo "  Run: gcloud builds submit --config=cloudbuild.yaml"
echo ""
echo "Option B: Deploy directly using the SEC EDGAR MCP Docker image"
echo "  Run the deployment script: ./deploy-mcp.sh"
echo ""

# Step 7: Display next steps
echo -e "\n${GREEN}✅ GCP Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Choose your deployment option (A or B above)"
echo "2. After deployment, get your service URL:"
echo "   gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'"
echo "3. Update your Vercel environment variables with the service URL"
echo ""
echo "Project Dashboard: https://console.cloud.google.com/home/dashboard?project=$PROJECT_ID"
echo "Cloud Run Console: https://console.cloud.google.com/run?project=$PROJECT_ID"