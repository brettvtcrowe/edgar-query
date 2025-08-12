#!/usr/bin/env tsx

/**
 * Debug MCP Connection
 * 
 * Simple script to debug the MCP protocol handshake
 */

import { spawn } from 'child_process';

async function debugMCP() {
  console.log('🔍 Debugging MCP Connection...');
  
  const process = spawn('docker', [
    'run',
    '--rm',
    '--interactive',
    '--env', 'SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)',
    'sha256:16f40558c81c4e4496e02df704fe1cf5d4e65f8ed48af805bf6eee43f8afb32b'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  process.stdout?.on('data', (data) => {
    console.log('STDOUT:', data.toString());
  });

  process.stderr?.on('data', (data) => {
    console.log('STDERR:', data.toString());
  });

  process.on('error', (error) => {
    console.error('Process error:', error);
  });

  process.on('exit', (code) => {
    console.log(`Process exited with code ${code}`);
  });

  // Wait a moment for the process to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Try to send an initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {}
      },
      clientInfo: {
        name: 'edgar-answer-engine',
        version: '1.0.0'
      }
    }
  };

  console.log('📤 Sending initialize request:', JSON.stringify(initRequest));
  process.stdin?.write(JSON.stringify(initRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Try to list tools
  const toolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  };

  console.log('📤 Sending tools/list request:', JSON.stringify(toolsRequest));
  process.stdin?.write(JSON.stringify(toolsRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 5000));

  process.kill('SIGTERM');
}

debugMCP().catch(console.error);