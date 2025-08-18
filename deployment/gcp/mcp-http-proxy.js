const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Environment configuration
const PORT = process.env.PORT || 8080;
const SEC_USER_AGENT = process.env.SEC_EDGAR_USER_AGENT || 'EdgarAnswerEngine/2.0 (brett.vantil@crowe.com)';

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'edgar-mcp-http-proxy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'edgar-mcp-http-proxy' 
  });
});

// MCP proxy endpoint
app.post('/mcp', async (req, res) => {
  console.log('MCP request received:', JSON.stringify(req.body).substring(0, 200));
  
  try {
    // Spawn the MCP Docker container
    const mcpProcess = spawn('docker', [
      'run', '--rm', '-i',
      '-e', `SEC_EDGAR_USER_AGENT=${SEC_USER_AGENT}`,
      'stefanoamorelli/sec-edgar-mcp:latest'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let response = '';
    let errorOutput = '';
    
    // Collect stdout
    mcpProcess.stdout.on('data', (data) => {
      response += data.toString();
    });
    
    // Collect stderr for debugging
    mcpProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('MCP stderr:', data.toString());
    });

    // Send the request to the MCP process
    mcpProcess.stdin.write(JSON.stringify(req.body) + '\n');
    mcpProcess.stdin.end();

    // Handle process completion
    mcpProcess.on('close', (code) => {
      console.log(`MCP process exited with code ${code}`);
      
      if (code !== 0) {
        console.error('MCP error output:', errorOutput);
        return res.status(500).json({ 
          error: 'MCP process failed',
          code: code,
          stderr: errorOutput.substring(0, 500)
        });
      }

      try {
        // Parse and return the JSON response
        const jsonResponse = JSON.parse(response);
        console.log('MCP response:', JSON.stringify(jsonResponse).substring(0, 200));
        res.json(jsonResponse);
      } catch (e) {
        console.error('Failed to parse MCP response:', e, 'Raw:', response.substring(0, 500));
        res.status(500).json({ 
          error: 'Invalid MCP response',
          details: e.message,
          raw: response.substring(0, 200)
        });
      }
    });

    // Handle process errors
    mcpProcess.on('error', (error) => {
      console.error('Failed to spawn MCP process:', error);
      res.status(500).json({ 
        error: 'Failed to spawn MCP process',
        details: error.message 
      });
    });

  } catch (error) {
    console.error('MCP proxy error:', error);
    res.status(500).json({ 
      error: 'MCP proxy error',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`EDGAR MCP HTTP Proxy running on port ${PORT}`);
  console.log(`SEC User Agent: ${SEC_USER_AGENT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});