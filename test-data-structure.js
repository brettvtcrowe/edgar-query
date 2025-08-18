#!/usr/bin/env node

/**
 * Test to verify the data structure from SEC API
 */

const { SECAPIClient } = require('./packages/edgar-client/dist/sec-client.js');

async function testDataStructure() {
  console.log('🔍 Testing data structure from SEC API\n');
  
  const client = new SECAPIClient({
    secUserAgent: 'EdgarAnswerEngine/1.0 (test@example.com)'
  });
  
  try {
    // Get Apple's recent filings
    const filings = await client.getRecentFilings({
      identifier: 'AAPL',
      limit: 3
    });
    
    console.log('Filings returned from SECAPIClient:\n');
    console.log(JSON.stringify(filings, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('Field Analysis:\n');
    
    filings.forEach((filing, i) => {
      console.log(`Filing ${i + 1}:`);
      console.log(`  form: ${filing.form}`);
      console.log(`  formType: ${filing.formType}`);
      console.log(`  primaryDocument: ${filing.primaryDocument}`);
      console.log(`  accessionNumber: ${filing.accessionNumber}`);
      console.log(`  Has primaryDocument? ${filing.primaryDocument ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
    
    if (filings.some(f => !f.primaryDocument)) {
      console.log('⚠️  WARNING: Some filings missing primaryDocument!');
      console.log('This should not happen - SEC always provides this field.');
    } else {
      console.log('✅ All filings have primaryDocument as expected');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDataStructure();