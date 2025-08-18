#!/usr/bin/env node

/**
 * Direct test of SEC API to verify we can get fresh Amazon data
 */

async function testSECDirect() {
  const userAgent = 'EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)';
  
  console.log('🔍 Testing direct SEC API for Amazon (AMZN)');
  console.log('---');
  
  try {
    // Step 1: Get Amazon's CIK
    console.log('1️⃣ Getting company tickers...');
    const tickersResponse = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'www.sec.gov'
      }
    });
    
    const tickers = await tickersResponse.json();
    let amazonCIK = null;
    
    for (const [key, company] of Object.entries(tickers)) {
      if (company.ticker === 'AMZN') {
        amazonCIK = String(company.cik_str).padStart(10, '0');
        console.log(`✅ Found Amazon: ${company.title}`);
        console.log(`   CIK: ${amazonCIK}`);
        break;
      }
    }
    
    if (!amazonCIK) {
      throw new Error('Could not find Amazon in tickers');
    }
    
    // Step 2: Get Amazon's recent submissions
    console.log('\n2️⃣ Getting Amazon submissions...');
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${amazonCIK}.json`;
    
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const submissionsResponse = await fetch(submissionsUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'data.sec.gov'
      }
    });
    
    const submissions = await submissionsResponse.json();
    
    console.log(`✅ Got submissions for: ${submissions.name}`);
    console.log(`   Tickers: ${submissions.tickers?.join(', ')}`);
    console.log(`   SIC: ${submissions.sicDescription}`);
    
    // Step 3: Show recent filings
    console.log('\n3️⃣ Recent Filings:');
    const recentFilings = submissions.filings.recent;
    
    for (let i = 0; i < Math.min(10, recentFilings.accessionNumber.length); i++) {
      const form = recentFilings.form[i];
      const filingDate = recentFilings.filingDate[i];
      const accession = recentFilings.accessionNumber[i];
      const primaryDoc = recentFilings.primaryDocument[i];
      
      console.log(`\n${i + 1}. Form ${form}`);
      console.log(`   Filed: ${filingDate}`);
      console.log(`   Accession: ${accession}`);
      
      // Generate SEC URL
      const accessionNoHyphens = accession.replace(/-/g, '');
      const url = `https://www.sec.gov/Archives/edgar/data/${amazonCIK.replace(/^0+/, '')}/${accessionNoHyphens}/${primaryDoc || accession + '.txt'}`;
      console.log(`   URL: ${url}`);
      
      // Check data freshness
      const filingDateObj = new Date(filingDate);
      const daysSince = Math.floor((Date.now() - filingDateObj) / (1000 * 60 * 60 * 24));
      
      if (i === 0) {
        console.log(`   📅 Days since filing: ${daysSince} days`);
        if (daysSince > 30) {
          console.log('   ⚠️  WARNING: Latest filing is >30 days old');
        } else {
          console.log('   ✅ Recent filing');
        }
      }
    }
    
    // Summary
    console.log('\n📊 Summary:');
    const latestDate = new Date(recentFilings.filingDate[0]);
    console.log(`Latest filing: ${recentFilings.form[0]} on ${recentFilings.filingDate[0]}`);
    console.log(`Total recent filings: ${recentFilings.accessionNumber.length}`);
    
    // Year check
    const year = latestDate.getFullYear();
    if (year < 2024) {
      console.log(`\n⚠️  ERROR: Latest filing is from ${year}, not current year!`);
      console.log('This suggests the SEC API is returning current data,');
      console.log('but something in the app is caching or filtering old data.');
    } else {
      console.log(`\n✅ Latest filing is from ${year} (current/recent)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testSECDirect();