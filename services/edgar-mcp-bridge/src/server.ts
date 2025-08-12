/**
 * EDGAR MCP HTTP Bridge Server
 * 
 * This server acts as an HTTP bridge between our Node.js application
 * and the Python-based EDGAR MCP server running in Docker.
 * 
 * It translates HTTP requests to MCP tool calls and returns JSON responses.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { MCPClient } from './mcp-client.js';
import { EDGARToolsRouter } from './edgar-tools-router.js';

const app = express();
const port = process.env.PORT || 3001;

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'edgar-mcp-bridge',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// MCP Client instance
const mcpClient = new MCPClient({
  transport: 'docker',
  dockerImage: 'stefanoamorelli/sec-edgar-mcp:latest',
  userAgent: process.env.SEC_EDGAR_USER_AGENT || 'EdgarAnswerEngine/1.0 (contact@example.com)'
});

// EDGAR Tools Router
const edgarRouter = new EDGARToolsRouter(mcpClient);

// Mount the EDGAR tools routes
app.use('/api/edgar', edgarRouter.getRouter());

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Bridge Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    // Initialize MCP connection
    await mcpClient.connect();
    console.log('✅ Connected to EDGAR MCP server');

    // Start HTTP server
    app.listen(port, () => {
      console.log(`🚀 EDGAR MCP Bridge server running on port ${port}`);
      console.log(`📋 Health check: http://localhost:${port}/health`);
      console.log(`🔍 EDGAR API: http://localhost:${port}/api/edgar`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await mcpClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await mcpClient.disconnect();
  process.exit(0);
});

startServer().catch(console.error);