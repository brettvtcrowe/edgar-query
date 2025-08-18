#!/usr/bin/env node

/**
 * Test with a RANDOM company to prove we're hitting real SEC API
 * Not hardcoded - this will fetch LIVE data from SEC
 */

async function testRandomCompany() {
  const userAgent = 'EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)';
  
  // Pick a random ticker
  const randomTickers = ['NVDA', 'TSLA', 'META', 'NFLX', 'AMD', 'INTC', 'ORCL', 'CRM'];
  const ticker = randomTickers[Math.floor(Math.random() * randomTickers.length)];
  
  console.log(`🎲 Random test with: ${ticker}`);
  console.log('📡 Fetching LIVE data from SEC.gov...\n');
  
  try {
    // REAL API CALL #1: Get all company tickers from SEC
    console.log(`Calling: https://www.sec.gov/files/company_tickers.json`);
    const tickersResponse = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'www.sec.gov'
      }
    });
    
    if (!tickersResponse.ok) {
      throw new Error(`SEC API returned ${tickersResponse.status}`);
    }
    
    const tickers = await tickersResponse.json();
    let companyCIK = null;
    let companyName = null;
    
    // Find our random company in the REAL SEC data
    for (const [key, company] of Object.entries(tickers)) {
      if (company.ticker === ticker) {
        companyCIK = String(company.cik_str).padStart(10, '0');
        companyName = company.title;
        console.log(`✅ Found in SEC database: ${companyName}`);
        console.log(`   CIK: ${companyCIK}`);
        break;
      }
    }
    
    if (!companyCIK) {
      throw new Error(`${ticker} not found in SEC database`);
    }
    
    // REAL API CALL #2: Get company's submissions from SEC
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${companyCIK}.json`;
    console.log(`\nCalling: ${submissionsUrl}`);
    
    // Respect SEC rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const submissionsResponse = await fetch(submissionsUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate', 
        'Host': 'data.sec.gov'
      }
    });
    
    if (!submissionsResponse.ok) {
      throw new Error(`SEC API returned ${submissionsResponse.status}`);
    }
    
    const submissions = await submissionsResponse.json();
    
    console.log(`\n✅ LIVE SEC DATA for ${submissions.name}:`);
    console.log(`   Exchange: ${submissions.exchanges?.[0]}`);
    console.log(`   Industry: ${submissions.sicDescription}`);
    console.log(`   Website: ${submissions.website}`);
    
    // Show the ACTUAL latest filings from SEC
    console.log('\n📄 REAL-TIME Filings (from SEC.gov):');
    const recent = submissions.filings.recent;
    
    for (let i = 0; i < Math.min(5, recent.accessionNumber.length); i++) {
      const filingDate = recent.filingDate[i];
      const form = recent.form[i];
      const accession = recent.accessionNumber[i];
      
      console.log(`\n${i + 1}. ${form} - Filed ${filingDate}`);
      console.log(`   Accession: ${accession}`);
      
      // Generate the REAL SEC document URL
      const cikNum = companyCIK.replace(/^0+/, '');
      const accessionNoHyphens = accession.replace(/-/g, '');
      const docUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoHyphens}/${recent.primaryDocument[i]}`;
      console.log(`   📎 Live URL: ${docUrl}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ This data came DIRECTLY from SEC.gov APIs');
    console.log('✅ Nothing was hardcoded - all fetched in real-time');
    console.log('✅ Try running again - you\'ll get a different company!');
    
  } catch (error) {
    console.error('❌ Error calling SEC API:', error.message);
    console.error('This proves we\'re calling real APIs - they can fail!');
  }
}

// Run it
testRandomCompany();