#!/usr/bin/env tsx

/**
 * EDGAR MCP HTTP Bridge Test
 * 
 * Tests the HTTP bridge service to ensure it properly wraps
 * our working Docker MCP integration.
 */

const BASE_URL = 'http://localhost:3001';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck(): Promise<boolean> {
  console.log('🔍 Testing health check...');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    console.log('📊 Health check response:', data);
    
    if (data.status === 'ok' && data.mcp_connection === true) {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('⚠️  Health check shows issues');
      return false;
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

async function testListTools(): Promise<boolean> {
  console.log('\n🛠️  Testing tools list...');
  
  try {
    const response = await fetch(`${BASE_URL}/tools`);
    const data = await response.json();
    
    if (data.success && data.tools && data.tools.length > 0) {
      console.log(`✅ Found ${data.count} tools available`);
      console.log('Available tools:');
      data.tools.slice(0, 5).forEach((tool: any, i: number) => {
        console.log(`   ${i + 1}. ${tool.name}: ${tool.description?.substring(0, 80)}...`);
      });
      
      if (data.tools.length > 5) {
        console.log(`   ... and ${data.tools.length - 5} more tools`);
      }
      
      return true;
    } else {
      console.log('❌ Failed to get tools list');
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Tools list failed:', error);
    return false;
  }
}

async function testTickerResolution(): Promise<boolean> {
  console.log('\n🔍 Testing ticker resolution (AAPL)...');
  
  try {
    const response = await fetch(`${BASE_URL}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'get_cik_by_ticker',
        arguments: { ticker: 'AAPL' }
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.result) {
      console.log('✅ Ticker resolution successful');
      console.log('Result:', JSON.stringify(data.result, null, 2));
      return true;
    } else {
      console.log('❌ Ticker resolution failed');
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Ticker resolution error:', error);
    return false;
  }
}

async function testConvenienceEndpoint(): Promise<boolean> {
  console.log('\n📞 Testing convenience endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/ticker-to-cik`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: 'MSFT' })
    });
    
    const data = await response.json();
    
    if (data.success && data.result) {
      console.log('✅ Convenience endpoint successful');
      console.log('MSFT CIK lookup result:', JSON.stringify(data.result, null, 2));
      return true;
    } else {
      console.log('❌ Convenience endpoint failed');
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Convenience endpoint error:', error);
    return false;
  }
}

async function testRecentFilings(): Promise<boolean> {
  console.log('\n📄 Testing recent filings...');
  
  try {
    const response = await fetch(`${BASE_URL}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'get_recent_filings',
        arguments: {
          identifier: 'AAPL',
          form_type: '10-K',
          limit: 2
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.result) {
      console.log('✅ Recent filings successful');
      console.log('Found filings for AAPL');
      return true;
    } else {
      console.log('❌ Recent filings failed');
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Recent filings error:', error);
    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.log('🧪 EDGAR MCP HTTP Bridge Test Suite');
  console.log('=====================================\n');
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to start...');
  await sleep(2000);
  
  const results = [];
  
  // Run tests
  results.push(await testHealthCheck());
  results.push(await testListTools()); 
  results.push(await testTickerResolution());
  results.push(await testConvenienceEndpoint());
  results.push(await testRecentFilings());
  
  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n=====================================');
  console.log('📊 Test Results Summary');
  console.log('=====================================');
  console.log(`✅ Tests passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! HTTP bridge is working perfectly.');
    console.log('\n🚀 Ready for deployment to Railway/Render.');
  } else {
    console.log('❌ Some tests failed. Check the logs above.');
  }
  
  console.log('\n📋 API Endpoints Available:');
  console.log(`   GET  ${BASE_URL}/health`);
  console.log(`   GET  ${BASE_URL}/tools`);
  console.log(`   POST ${BASE_URL}/tools/call`);
  console.log(`   POST ${BASE_URL}/ticker-to-cik`);
  console.log(`   POST ${BASE_URL}/recent-filings`);
  console.log(`   POST ${BASE_URL}/filing-content`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}