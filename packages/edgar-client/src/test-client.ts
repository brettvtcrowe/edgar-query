/**
 * Test script for EDGAR client
 */

import { EDGARClient } from './index.js';

async function testClient() {
  console.log('🧪 Testing EDGAR Client with fallback capabilities\n');
  
  // Initialize client with both MCP and SEC API fallback
  const client = new EDGARClient({
    mcpServiceUrl: process.env.EDGAR_MCP_SERVICE_URL || 'http://localhost:3001',
    mcpApiKey: process.env.EDGAR_MCP_API_KEY,
    secUserAgent: process.env.SEC_USER_AGENT || 'TestClient/1.0 (test@example.com)',
    enableFallback: true,
    cacheEnabled: true,
    maxRetries: 3
  });
  
  try {
    // Test 1: Check MCP availability
    console.log('1️⃣ Checking MCP service availability...');
    const mcpAvailable = await client.checkMCPAvailability();
    console.log(`   Data source: ${client.getDataSource()}`);
    console.log(`   MCP Available: ${mcpAvailable}\n`);
    
    // Test 2: Ticker to CIK conversion
    console.log('2️⃣ Testing ticker to CIK conversion...');
    const cik = await client.getCIKByTicker('AAPL');
    console.log(`   AAPL → CIK: ${cik}\n`);
    
    // Test 3: Company info
    console.log('3️⃣ Getting company information...');
    const companyInfo = await client.getCompanyInfo('MSFT');
    console.log(`   Company: ${companyInfo.name}`);
    console.log(`   CIK: ${companyInfo.cik}`);
    console.log(`   Tickers: ${companyInfo.tickers?.join(', ')}\n`);
    
    // Test 4: Search companies
    console.log('4️⃣ Searching for companies...');
    const searchResults = await client.searchCompanies('Tesla');
    console.log(`   Found ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log(`   First result: ${searchResults[0].name} (${searchResults[0].cik})\n`);
    }
    
    // Test 5: Recent filings
    console.log('5️⃣ Getting recent filings...');
    const filings = await client.getRecentFilings({
      identifier: 'AAPL',
      form_type: '10-K',
      limit: 3
    });
    console.log(`   Found ${filings.length} filings`);
    filings.forEach(f => {
      console.log(`   - ${f.form} filed on ${f.filingDate}`);
    });
    console.log();
    
    // Test 6: MCP-specific features (if available)
    if (client.getDataSource() === 'MCP') {
      console.log('6️⃣ Testing MCP-specific features...');
      
      // List available tools
      const tools = await client.listTools();
      console.log(`   Available tools: ${tools.length}`);
      
      // Try filing sections (MCP only)
      if (filings.length > 0) {
        try {
          const sections = await client.getFilingSections({
            identifier: 'AAPL',
            accession_number: filings[0].accessionNumber,
            sections: ['item_1a', 'item_7']
          });
          console.log(`   Extracted ${sections.length} sections from filing\n`);
        } catch (error) {
          console.log(`   Section extraction not available\n`);
        }
      }
    } else {
      console.log('6️⃣ MCP features not available (using SEC API fallback)\n');
    }
    
    // Test 7: Cache functionality
    console.log('7️⃣ Testing cache...');
    const start = Date.now();
    await client.getCIKByTicker('GOOGL');
    const firstCallTime = Date.now() - start;
    
    const cacheStart = Date.now();
    await client.getCIKByTicker('GOOGL'); // Should be cached
    const cachedCallTime = Date.now() - cacheStart;
    
    console.log(`   First call: ${firstCallTime}ms`);
    console.log(`   Cached call: ${cachedCallTime}ms`);
    console.log(`   Cache speedup: ${(firstCallTime / cachedCallTime).toFixed(1)}x\n`);
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testClient().catch(console.error);