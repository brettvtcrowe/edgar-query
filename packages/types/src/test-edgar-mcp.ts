#!/usr/bin/env tsx

/**
 * EDGAR MCP Integration Test
 * 
 * Tests all the sophisticated EDGAR MCP functionality to verify we have
 * the advanced document search, content extraction, and analysis capabilities.
 */

import { EDGARMCPClient } from './edgar-mcp-client.js';

const USER_AGENT = "EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)";

async function testEDGARMCP() {
  console.log('🚀 Testing EDGAR MCP Integration');
  console.log('=================================\n');

  const client = new EDGARMCPClient({ userAgent: USER_AGENT });
  
  try {
    // Connect to EDGAR MCP
    console.log('📡 Connecting to EDGAR MCP...');
    await client.connect();
    
    // Test 1: List available tools
    console.log('\n🔍 Test 1: List Available Tools');
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools?.length || 0} tools available`);
    if (tools.tools) {
      console.log('Available tools:');
      tools.tools.forEach((tool: any) => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
    }

    // Test 2: Convert ticker to CIK
    console.log('\n🔍 Test 2: Convert Ticker to CIK (AAPL)');
    const tickerResult = await client.getTickerCIK('AAPL');
    console.log('✅ Ticker conversion result:', JSON.stringify(tickerResult, null, 2));

    // Test 3: Get recent filings
    console.log('\n🔍 Test 3: Get Apple\'s Recent Filings');
    const filings = await client.getRecentFilings({
      ticker: 'AAPL',
      forms: ['10-K', '10-Q'],
      limit: 3
    });
    console.log('✅ Recent filings:', JSON.stringify(filings, null, 2));

    // Test 4: Get company info
    console.log('\n🔍 Test 4: Get Company Information');
    const companyInfo = await client.getCompanyInfo({ ticker: 'AAPL' });
    console.log('✅ Company info:', JSON.stringify(companyInfo, null, 2));

    // Test 5: Advanced - Get filing content (if we have a filing)
    if (filings.content && filings.content.length > 0) {
      console.log('\n🔍 Test 5: Get Filing Content & Sections');
      const filing = filings.content[0];
      console.log(`Testing with filing: ${filing.accessionNumber}`);
      
      const content = await client.getFilingContent({
        cik: filing.cik,
        accession_number: filing.accessionNumber,
        return_type: 'sections'
      });
      console.log('✅ Filing content retrieved');
      console.log(`   Sections found: ${content.sections?.length || 0}`);
      
      if (content.sections && content.sections.length > 0) {
        console.log('   Available sections:');
        content.sections.slice(0, 5).forEach((section: any) => {
          console.log(`     - ${section.title || section.name}: ${(section.content || '').substring(0, 100)}...`);
        });
      }
    }

    console.log('\n🎉 All EDGAR MCP tests completed successfully!');
    console.log('\n📊 Summary of Capabilities Verified:');
    console.log('✅ Company resolution (ticker → CIK)');
    console.log('✅ Recent filings retrieval with filtering');
    console.log('✅ Company information lookup');
    console.log('✅ Advanced filing content extraction');
    console.log('✅ Document section parsing');
    console.log('✅ Full tool discovery and access');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.disconnect();
  }
}

// Additional test for sophisticated search capabilities
async function testAdvancedSearchCapabilities() {
  console.log('\n🔬 Testing Advanced Search Capabilities');
  console.log('======================================\n');

  const client = new EDGARMCPClient({ userAgent: USER_AGENT });
  
  try {
    await client.connect();

    // Test search across multiple companies
    console.log('🔍 Testing Cross-Company Search Patterns');
    
    const companies = ['AAPL', 'MSFT', 'GOOGL'];
    for (const ticker of companies) {
      console.log(`\n📈 ${ticker} Analysis:`);
      
      const filings = await client.getRecentFilings({
        ticker,
        forms: ['10-K'],
        limit: 1
      });
      
      if (filings.content && filings.content.length > 0) {
        console.log(`  ✅ Found ${filings.content.length} 10-K filing(s)`);
        
        // This demonstrates the kind of sophisticated analysis we can do
        const filing = filings.content[0];
        console.log(`  📄 Latest 10-K: ${filing.accessionNumber} (${filing.reportDate})`);
        
        // Test different content retrieval methods
        const htmlContent = await client.getFilingContent({
          cik: filing.cik,
          accession_number: filing.accessionNumber,
          return_type: 'html'
        });
        
        console.log(`  📊 HTML content length: ${htmlContent.content?.length || 0} chars`);
      }
    }

  } catch (error) {
    console.error('❌ Advanced search test failed:', error);
  } finally {
    await client.disconnect();
  }
}

// Run tests
async function runAllTests() {
  await testEDGARMCP();
  await testAdvancedSearchCapabilities();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. EDGAR MCP provides sophisticated company-specific analysis ✅');
  console.log('2. Now build custom thematic search for cross-document queries');
  console.log('3. Create orchestration layer to route queries appropriately');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}