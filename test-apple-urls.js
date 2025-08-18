#!/usr/bin/env node

/**
 * Test Apple's actual SEC filing URLs to understand the correct format
 */

async function testAppleURLs() {
  const userAgent = 'EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)';
  
  console.log('🍎 Testing Apple (AAPL) SEC filing URLs\n');
  
  try {
    // Get Apple's CIK
    const tickersResponse = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'www.sec.gov'
      }
    });
    
    const tickers = await tickersResponse.json();
    let appleCIK = null;
    
    for (const [key, company] of Object.entries(tickers)) {
      if (company.ticker === 'AAPL') {
        appleCIK = String(company.cik_str).padStart(10, '0');
        console.log(`Found Apple: ${company.title}`);
        console.log(`CIK: ${appleCIK}\n`);
        break;
      }
    }
    
    // Get Apple's submissions
    await new Promise(resolve => setTimeout(resolve, 100));
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${appleCIK}.json`;
    
    const submissionsResponse = await fetch(submissionsUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'data.sec.gov'
      }
    });
    
    const submissions = await submissionsResponse.json();
    const recent = submissions.filings.recent;
    
    console.log('Recent Apple Filings - URL Analysis:\n');
    console.log('=' .repeat(80));
    
    for (let i = 0; i < Math.min(5, recent.accessionNumber.length); i++) {
      const form = recent.form[i];
      const filingDate = recent.filingDate[i];
      const accession = recent.accessionNumber[i];
      const primaryDoc = recent.primaryDocument[i];
      const primaryDocDesc = recent.primaryDocDescription[i];
      
      console.log(`\n${i + 1}. Form ${form} - ${filingDate}`);
      console.log(`   Accession: ${accession}`);
      console.log(`   Primary Doc: ${primaryDoc || 'NOT PROVIDED'}`);
      console.log(`   Doc Description: ${primaryDocDesc || 'N/A'}`);
      
      // Generate URL variations to test
      const cikNum = appleCIK.replace(/^0+/, '');
      const accessionNoHyphens = accession.replace(/-/g, '');
      
      console.log('\n   Possible URLs:');
      
      // Version 1: Using primaryDocument if available
      if (primaryDoc) {
        const url1 = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoHyphens}/${primaryDoc}`;
        console.log(`   ✅ With primary doc: ${url1}`);
      }
      
      // Version 2: Using accession number + .txt
      const url2 = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoHyphens}/${accession}.txt`;
      console.log(`   📄 With .txt: ${url2}`);
      
      // Version 3: Using accession number + .htm
      const url3 = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoHyphens}/${accession}.htm`;
      console.log(`   📄 With .htm: ${url3}`);
      
      // Version 4: Index page
      const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoHyphens}/`;
      console.log(`   📁 Index: ${indexUrl}`);
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 Key Findings:');
    console.log('- primaryDocument field contains the actual filename (e.g., "aapl-20250628.htm")');
    console.log('- This is different from the accession number');
    console.log('- URL format: /data/{CIK}/{ACCESSION_NO_HYPHENS}/{PRIMARY_DOCUMENT}');
    console.log('- If no primaryDocument, try accession + .txt or check index page');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAppleURLs();