#!/usr/bin/env node

/**
 * Test script to verify Amazon filing data freshness
 */

const fetch = require('node-fetch');

async function testAmazonQuery() {
  const apiUrl = process.env.API_URL || 'http://localhost:3000/api/chat';
  
  console.log('🧪 Testing Amazon query at:', apiUrl);
  console.log('---');
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Give me Amazon\'s latest filings'
          }
        ]
      })
    });
    
    const data = await response.json();
    
    console.log('✅ Response received');
    console.log('Success:', data.success);
    console.log('Pattern:', data.pattern);
    console.log('Data source:', data.metadata?.dataSource);
    console.log('---');
    
    if (data.data?.filings) {
      console.log('📄 Filings found:', data.data.filings.length);
      data.data.filings.slice(0, 5).forEach((filing, i) => {
        console.log(`\n${i + 1}. Form ${filing.form || filing.formType}`);
        console.log(`   Filed: ${filing.filingDate}`);
        console.log(`   Accession: ${filing.accessionNumber}`);
      });
    }
    
    if (data.citations) {
      console.log('\n📎 Citations:', data.citations.length);
      data.citations.slice(0, 3).forEach((citation, i) => {
        console.log(`\n${i + 1}. ${citation.title}`);
        console.log(`   URL: ${citation.url}`);
      });
    }
    
    // Check for stale data
    if (data.data?.filings?.[0]) {
      const latestDate = new Date(data.data.filings[0].filingDate);
      const daysSinceLatest = Math.floor((Date.now() - latestDate) / (1000 * 60 * 60 * 24));
      
      console.log('\n⏰ Data Freshness Check:');
      console.log(`Latest filing date: ${data.data.filings[0].filingDate}`);
      console.log(`Days since latest: ${daysSinceLatest} days`);
      
      if (daysSinceLatest > 30) {
        console.log('⚠️  WARNING: Data appears stale (>30 days old)');
      } else {
        console.log('✅ Data appears fresh');
      }
    }
    
    // Full response for debugging
    if (process.env.DEBUG) {
      console.log('\n📋 Full Response:');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testAmazonQuery();