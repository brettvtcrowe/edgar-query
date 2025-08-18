const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Environment configuration
const PORT = process.env.PORT || 8080;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'edgar-mcp-simple-proxy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    note: 'This is a placeholder proxy. MCP integration pending.'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'edgar-mcp-simple-proxy' 
  });
});

// Placeholder MCP endpoint - will forward to actual MCP later
app.post('/mcp', async (req, res) => {
  console.log('MCP request received:', JSON.stringify(req.body).substring(0, 200));
  
  try {
    // For now, return mock responses for testing
    const { method, params } = req.body;
    
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: true
            }
          },
          serverInfo: {
            name: 'edgar-mcp-proxy',
            version: '1.0.0'
          }
        }
      });
    }
    
    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        result: {
          tools: [
            {
              name: 'get_cik_by_ticker',
              description: 'Get CIK from ticker symbol',
              inputSchema: {
                type: 'object',
                properties: {
                  ticker: { type: 'string' }
                },
                required: ['ticker']
              }
            }
          ]
        }
      });
    }
    
    if (method === 'tools/call') {
      // Mock response for testing
      if (params?.name === 'get_cik_by_ticker' && params?.arguments?.ticker === 'AAPL') {
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  cik: '0000320193',
                  ticker: 'AAPL'
                })
              }
            ]
          }
        });
      }
    }
    
    // Default response
    res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32601,
        message: 'Method not found'
      }
    });
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`EDGAR MCP Simple Proxy running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});