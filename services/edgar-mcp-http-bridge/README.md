# EDGAR MCP HTTP Bridge Service

HTTP REST API wrapper for the EDGAR MCP Docker integration, enabling access to 21 sophisticated SEC data tools via standard HTTP endpoints.

## Features

- ✅ All 21 EDGAR MCP tools accessible via REST API
- ✅ Production-ready with health checks and monitoring
- ✅ API key authentication for security
- ✅ CORS support for Vercel integration
- ✅ Docker-based deployment ready

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and MCP connection state.

### List Tools
```
GET /tools
Headers: x-api-key: YOUR_API_KEY
```
Returns all 21 available EDGAR MCP tools.

### Call Tool
```
POST /tools/call
Headers: 
  x-api-key: YOUR_API_KEY
  Content-Type: application/json
Body: {
  "name": "tool_name",
  "arguments": { ... }
}
```

### Convenience Endpoints

#### Ticker to CIK
```
POST /ticker-to-cik
Body: { "ticker": "AAPL" }
```

#### Recent Filings
```
POST /recent-filings
Body: {
  "identifier": "AAPL",
  "form_type": "10-K",
  "days": 365,
  "limit": 10
}
```

#### Filing Content
```
POST /filing-content
Body: {
  "identifier": "0000320193",
  "accession_number": "0000320193-24-000081"
}
```

## Local Development

### Prerequisites
- Docker installed and running
- Node.js 20+
- SEC User Agent configured

### Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Build TypeScript
npm run build

# Start development server
npm run dev
```

### Testing
```bash
# Run test suite
npm test
```

## Production Deployment

### Railway Deployment

1. **Create Railway Project**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Create new project
   railway init
   ```

2. **Configure Environment Variables**
   In Railway dashboard, set:
   - `SEC_EDGAR_USER_AGENT`: Your registered SEC user agent
   - `API_KEY`: Secure API key for authentication
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
   - `NODE_ENV`: production
   - `PORT`: (Railway provides this automatically)

3. **Deploy**
   ```bash
   # Deploy to Railway
   railway up
   
   # Get deployment URL
   railway open
   ```

### Alternative: Render Deployment

1. **Create Render Service**
   - Go to render.com and create new "Web Service"
   - Connect your GitHub repository
   - Choose Docker runtime
   - Set branch to deploy from

2. **Configure Environment Variables**
   Same as Railway variables above

3. **Deploy**
   - Render will auto-deploy on push to configured branch
   - Access service at: `https://your-service.onrender.com`

### Docker Deployment (Generic)

```bash
# Build image
docker build -t edgar-mcp-bridge .

# Run container
docker run -d \
  -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e SEC_EDGAR_USER_AGENT="YourAgent/1.0 (email@example.com)" \
  -e API_KEY="your-secure-key" \
  -e NODE_ENV="production" \
  edgar-mcp-bridge
```

## Security Considerations

1. **API Key**: Always use a strong API key in production
2. **CORS**: Configure allowed origins explicitly
3. **Rate Limiting**: Implement rate limiting for production use
4. **HTTPS**: Always use HTTPS in production (handled by Railway/Render)
5. **Monitoring**: Set up monitoring for API usage and errors

## Integration with Vercel

In your Vercel application, configure these environment variables:

```env
EDGAR_MCP_SERVICE_URL=https://your-service.railway.app
EDGAR_MCP_API_KEY=your-api-key
```

Then use the service from your Vercel functions:

```typescript
const response = await fetch(`${process.env.EDGAR_MCP_SERVICE_URL}/tools/call`, {
  method: 'POST',
  headers: {
    'x-api-key': process.env.EDGAR_MCP_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'get_cik_by_ticker',
    arguments: { ticker: 'AAPL' }
  })
});
```

## Available MCP Tools

The service provides access to all 21 EDGAR MCP tools:

### Company Tools
- `get_cik_by_ticker` - Convert ticker to CIK
- `get_company_info` - Get company details
- `search_companies` - Search for companies
- `get_company_facts` - Get XBRL facts

### Filing Tools  
- `get_recent_filings` - Get recent SEC filings
- `get_recent_filings_smart` - Smart filing search
- `get_filing_content` - Get filing text content
- `get_filing_txt_sections` - Extract specific sections
- `analyze_8k` - Analyze 8-K filings

### Financial Tools
- `get_financials` - Get financial statements
- `get_segments` - Get segment data  
- `get_key_metrics` - Get key financial metrics
- `compare_companies` - Compare company metrics

### Insider Trading Tools
- `get_recent_insider_transactions` - Recent Form 4 data
- `get_insider_summary` - Insider trading summary
- `analyze_insider_trades` - Analyze trading patterns
- `get_insider_roster` - Get list of insiders
- `get_transaction_details` - Detailed transaction info

### Advanced Tools
- `find_similar_companies` - Find peer companies
- `get_financial_statements` - Detailed financials
- `screen_companies` - Screen by criteria

## Monitoring

The service includes:
- Health check endpoint for uptime monitoring
- Structured logging for debugging
- Error tracking with detailed messages
- Request/response timestamps

## Troubleshooting

### MCP Connection Issues
- Ensure Docker daemon is running
- Check Docker socket permissions
- Verify SEC_EDGAR_USER_AGENT is set

### Authentication Errors
- Verify API_KEY matches between service and client
- Check x-api-key header is being sent

### CORS Issues
- Add your domain to ALLOWED_ORIGINS
- Ensure credentials: true in client requests

## Support

For issues or questions:
1. Check the logs: `railway logs` or Render dashboard
2. Verify environment variables are set correctly
3. Test with the health check endpoint first
4. Ensure Docker is available in the deployment environment