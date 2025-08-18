#!/usr/bin/env node

/**
 * Test the deployed API directly to see what's happening
 */

async function testDeployedAPI() {
  console.log('🔍 Testing deployed API for NVIDIA\n');
  
  try {
    const response = await fetch('https://edgar-query-nu.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'What is NVIDIA\'s latest filing date? Just give me the date.'
          }
        ]
      })
    });
    
    const data = await response.json();
    
    console.log('Response success:', data.success);
    console.log('Pattern:', data.pattern);
    console.log('Data source:', data.metadata?.dataSource);
    console.log('\nAnswer:', data.answer);
    
    if (data.data?.filings?.[0]) {
      console.log('\nFirst filing returned:');
      console.log('  Form:', data.data.filings[0].form);
      console.log('  Date:', data.data.filings[0].filingDate);
      console.log('  Accession:', data.data.filings[0].accessionNumber);
    }
    
    // Now test direct SEC API
    console.log('\n' + '='.repeat(60));
    console.log('Direct SEC API comparison:\n');
    
    const secResponse = await fetch('https://data.sec.gov/submissions/CIK0001045810.json', {
      headers: {
        'User-Agent': 'EdgarAnswerEngine/1.0 (test@example.com)',
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'data.sec.gov'
      }
    });
    
    const secData = await secResponse.json();
    console.log('Latest from SEC API:');
    console.log('  Form:', secData.filings.recent.form[0]);
    console.log('  Date:', secData.filings.recent.filingDate[0]);
    console.log('  Accession:', secData.filings.recent.accessionNumber[0]);
    
    // Compare dates
    const appDate = data.data?.filings?.[0]?.filingDate;
    const secDate = secData.filings.recent.filingDate[0];
    
    console.log('\n' + '='.repeat(60));
    if (appDate === secDate) {
      console.log('✅ App is returning current data');
    } else {
      console.log('❌ DATA MISMATCH!');
      console.log(`App returns: ${appDate || 'unknown'}`);
      console.log(`SEC has: ${secDate}`);
      
      if (appDate && appDate.includes('2023')) {
        console.log('\n🚨 App is returning 2023 data - over a year old!');
        console.log('This means the deployment is NOT using our fixes.');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDeployedAPI();