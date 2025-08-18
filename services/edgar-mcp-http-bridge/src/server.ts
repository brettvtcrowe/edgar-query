/**
 * EDGAR MCP HTTP Bridge Server
 * 
 * This service wraps our working Docker MCP integration with an HTTP API
 * so it can be called from Vercel serverless functions and deployed to Railway.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { EDGARMCPClient } from './edgar-mcp-client.js';

const app = express();
const port = process.env.PORT || 3002;

// CORS configuration for production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://*.vercel.app'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// API Key authentication middleware (skip for health check)
const API_KEY = process.env.API_KEY;
app.use((req, res, next) => {
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }
  
  // Check API key in production
  if (process.env.NODE_ENV === 'production' && API_KEY) {
    const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (providedKey !== API_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  next();
});

// Request/Response schemas
const ToolCallRequestSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()).optional().default({})
});

const HealthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  service: z.string(),
  timestamp: z.string(),
  mcp_connection: z.boolean(),
  version: z.string()
});

// MCP client instance (will be initialized on startup)
let mcpClient: EDGARMCPClient | null = null;
let isConnected = false;

/**
 * Health check endpoint
 * Railway-compatible: Always returns 200 if server is running
 */
app.get('/health', (req, res) => {
  const response = {
    status: 'ok' as const, // Always OK if server is running
    service: 'edgar-mcp-http-bridge',
    timestamp: new Date().toISOString(),
    mcp_connection: isConnected,
    mcp_status: isConnected ? 'connected' : 'disconnected_but_service_running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Always return 200 for Railway health check
  // MCP connection status is informational only
  res.status(200).json(response);
});

/**
 * List available tools
 */
app.get('/tools', async (req, res) => {
  try {
    if (!mcpClient || !isConnected) {
      return res.status(503).json({
        success: false,
        error: 'MCP client not connected',
        timestamp: new Date().toISOString()
      });
    }

    const tools = await mcpClient.listTools();
    
    res.json({
      success: true,
      tools: tools.tools || [],
      count: tools.tools?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error listing tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list tools',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Call a specific tool
 */
app.post('/tools/call', async (req, res) => {
  try {
    if (!mcpClient || !isConnected) {
      return res.status(503).json({
        success: false,
        error: 'MCP client not connected',
        timestamp: new Date().toISOString()
      });
    }

    const { name, arguments: args } = ToolCallRequestSchema.parse(req.body);
    console.log(`📞 Calling tool: ${name} with args:`, args);

    const result = await mcpClient.callTool(name, args);
    
    res.json({
      success: true,
      tool: name,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error calling tool ${req.body?.name}:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Tool call failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Convenience endpoints for common tools
 */

// Get ticker CIK
app.post('/ticker-to-cik', async (req, res) => {
  try {
    const { ticker } = z.object({ ticker: z.string() }).parse(req.body);
    const result = await mcpClient?.callTool('get_cik_by_ticker', { ticker });
    res.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ticker lookup failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get recent filings
app.post('/recent-filings', async (req, res) => {
  try {
    const params = z.object({
      identifier: z.string().optional(),
      form_type: z.string().optional(),
      days: z.number().optional(),
      limit: z.number().optional()
    }).parse(req.body);
    
    const result = await mcpClient?.callTool('get_recent_filings', params);
    res.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Recent filings lookup failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get filing content
app.post('/filing-content', async (req, res) => {
  try {
    const params = z.object({
      identifier: z.string(),
      accession_number: z.string()
    }).parse(req.body);
    
    const result = await mcpClient?.callTool('get_filing_content', params);
    res.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Filing content lookup failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Error handling middleware
 */
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('HTTP Bridge Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

/**
 * 404 handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

/**
 * Initialize MCP client and start server
 */
async function startServer() {
  try {
    console.log('🚀 Starting EDGAR MCP HTTP Bridge...');
    
    // Start HTTP server first (Railway needs this for health checks)
    app.listen(port, () => {
      console.log(`🌐 HTTP Bridge server running on port ${port}`);
      console.log(`📋 Health check: http://localhost:${port}/health`);
      console.log(`🔍 List tools: http://localhost:${port}/tools`);
      console.log(`📞 Call tools: POST http://localhost:${port}/tools/call`);
    });

    // Initialize MCP client with Python server
    try {
      const userAgent = process.env.SEC_USER_AGENT || process.env.SEC_EDGAR_USER_AGENT || 'EdgarAnswerEngine/1.0 (contact@example.com)';
      console.log('📡 Attempting to connect to EDGAR MCP with User-Agent:', userAgent);
      
      mcpClient = new EDGARMCPClient({ userAgent });
      await mcpClient.connect();
      isConnected = true;
      
      console.log('✅ EDGAR MCP client connected successfully');

      // Test the connection
      const tools = await mcpClient.listTools();
      console.log(`🛠️  Found ${tools.tools?.length || 0} tools available`);
    } catch (mcpError) {
      console.error('❌ MCP connection failed:', mcpError instanceof Error ? mcpError.message : mcpError);
      console.log('📡 HTTP Bridge server running without MCP integration - fallback will be used');
      isConnected = false;
      mcpClient = null;
    }

  } catch (error) {
    console.error('❌ Failed to start HTTP Bridge server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('🛑 Shutting down HTTP Bridge server...');
  
  if (mcpClient) {
    await mcpClient.disconnect();
    mcpClient = null;
    isConnected = false;
  }
  
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer().catch(console.error);