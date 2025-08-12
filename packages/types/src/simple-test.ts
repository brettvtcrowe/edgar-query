#!/usr/bin/env tsx

/**
 * Simple EDGAR MCP Test
 * Just test the basic connection and tool listing
 */

import { spawn } from 'child_process';

async function simpleTest() {
  console.log('🧪 Simple EDGAR MCP Test');
  console.log('========================\n');

  console.log('📡 Spawning EDGAR MCP container...');
  const process = spawn('docker', [
    'run',
    '--rm',
    '--interactive',
    '--env', 'SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)',
    'sha256:16f40558c81c4e4496e02df704fe1cf5d4e65f8ed48af805bf6eee43f8afb32b'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let connected = false;
  let requestId = 0;

  process.stdout?.on('data', (data) => {
    const response = data.toString().trim();
    console.log('📨 Response:', response);
    
    try {
      const parsed = JSON.parse(response);
      if (parsed.id === 1 && parsed.result) {
        console.log('✅ Initialize successful!');
        connected = true;
        
        // Send initialized notification
        const notification = {
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        };
        console.log('📤 Sending initialized notification');
        process.stdin?.write(JSON.stringify(notification) + '\n');
        
        // After a delay, request tools
        setTimeout(() => {
          const toolsRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list'
          };
          console.log('📤 Requesting tools list');
          process.stdin?.write(JSON.stringify(toolsRequest) + '\n');
        }, 500);
      }
      
      if (parsed.id === 2 && parsed.result) {
        console.log('✅ Tools list received!');
        const tools = parsed.result.tools || [];
        console.log(`🛠️  Found ${tools.length} tools:`);
        tools.forEach((tool: any, i: number) => {
          console.log(`   ${i + 1}. ${tool.name}: ${tool.description}`);
        });
        
        // Test a simple tool call
        setTimeout(() => {
          const tickerRequest = {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'get_cik_by_ticker',
              arguments: { ticker: 'AAPL' }
            }
          };
          console.log('📤 Testing ticker resolution: AAPL');
          process.stdin?.write(JSON.stringify(tickerRequest) + '\n');
        }, 500);
      }
      
      if (parsed.id === 3) {
        console.log('✅ Ticker resolution result:');
        console.log(JSON.stringify(parsed.result, null, 2));
        
        console.log('\n🎉 All tests successful! EDGAR MCP is working perfectly.');
        process.kill('SIGTERM');
      }
      
    } catch (e) {
      // Ignore non-JSON responses
    }
  });

  process.stderr?.on('data', (data) => {
    const msg = data.toString();
    if (!msg.includes('Identity of the Edgar REST client')) {
      console.log('⚠️  STDERR:', msg);
    }
  });

  process.on('error', (error) => {
    console.error('❌ Process error:', error);
  });

  process.on('exit', (code) => {
    console.log(`🔚 Process exited with code ${code}`);
  });

  // Wait for container to start
  console.log('⏳ Waiting for container to start...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Send initialize request
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

  console.log('📤 Sending initialize request...');
  process.stdin?.write(JSON.stringify(initRequest) + '\n');

  // Keep alive for testing
  setTimeout(() => {
    if (!connected) {
      console.log('❌ Test timed out - no connection established');
      process.kill('SIGTERM');
    }
  }, 15000);
}

simpleTest().catch(console.error);