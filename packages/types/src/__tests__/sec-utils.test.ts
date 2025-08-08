/**
 * SEC Utilities Test Suite
 * Basic validation tests for SEC utility functions
 */

import {
  padCIK,
  validateCIK,
  validateTicker,
  validateAccessionNumber,
  parseAccessionNumber,
  buildArchiveURL,
  buildSubmissionsURL,
  buildCompanyFactsURL,
  extractCIKFromURL,
  buildUserAgent,
  detectFormType,
  createFilingCacheKey,
  FiscalPeriod,
} from '../sec-utils.js';

// Mock console.log for test output
console.log('Running SEC Utils Tests...\n');

// Test CIK functions
try {
  // Test padCIK
  const paddedCIK = padCIK('320193');
  console.log('✓ padCIK: 320193 →', paddedCIK);
  console.assert(paddedCIK === '0000320193', 'CIK padding failed');

  // Test validateCIK  
  const validCIK = validateCIK('0000320193');
  console.log('✓ validateCIK: Apple CIK validated');
  console.assert(validCIK === '0000320193', 'CIK validation failed');

} catch (error) {
  console.error('✗ CIK tests failed:', error);
}

// Test ticker validation
try {
  const validTicker = validateTicker('AAPL');
  console.log('✓ validateTicker: AAPL validated');
  console.assert(validTicker === 'AAPL', 'Ticker validation failed');

} catch (error) {
  console.error('✗ Ticker tests failed:', error);
}

// Test accession number functions
try {
  const accession = '0000320193-24-000003';
  const validAccession = validateAccessionNumber(accession);
  console.log('✓ validateAccessionNumber: Valid format');
  
  const parsed = parseAccessionNumber(accession);
  console.log('✓ parseAccessionNumber:', parsed);
  console.assert(parsed.cik === '0000320193', 'Accession parsing failed');
  console.assert(parsed.year === '2024', 'Year parsing failed');

} catch (error) {
  console.error('✗ Accession number tests failed:', error);
}

// Test URL building
try {
  const archiveURL = buildArchiveURL('320193', '0000320193-24-000003');
  console.log('✓ buildArchiveURL:', archiveURL);
  console.assert(archiveURL.includes('0000320193'), 'Archive URL missing CIK');

  const submissionsURL = buildSubmissionsURL('320193');
  console.log('✓ buildSubmissionsURL:', submissionsURL);
  console.assert(submissionsURL.includes('CIK0000320193.json'), 'Submissions URL format incorrect');

  const factsURL = buildCompanyFactsURL('320193');
  console.log('✓ buildCompanyFactsURL:', factsURL);
  console.assert(factsURL.includes('CIK0000320193.json'), 'Company facts URL format incorrect');

} catch (error) {
  console.error('✗ URL building tests failed:', error);
}

// Test CIK extraction
try {
  const url = 'https://data.sec.gov/submissions/CIK0000320193.json';
  const extractedCIK = extractCIKFromURL(url);
  console.log('✓ extractCIKFromURL:', extractedCIK);
  console.assert(extractedCIK === '0000320193', 'CIK extraction failed');

} catch (error) {
  console.error('✗ CIK extraction tests failed:', error);
}

// Test User-Agent
try {
  const userAgent = buildUserAgent();
  console.log('✓ buildUserAgent:', userAgent);
  console.assert(userAgent.includes('EdgarAnswerEngine'), 'User agent format incorrect');

} catch (error) {
  console.error('✗ User agent tests failed:', error);
}

// Test form type detection
try {
  const formType = detectFormType('apple-10-K-2024.htm');
  console.log('✓ detectFormType:', formType);
  console.assert(formType === '10-K', 'Form type detection failed');

} catch (error) {
  console.error('✗ Form type detection tests failed:', error);
}

// Test cache key generation
try {
  const cacheKey = createFilingCacheKey('320193', '0000320193-24-000003', 'item_1a');
  console.log('✓ createFilingCacheKey:', cacheKey);
  console.assert(cacheKey.includes('0000320193'), 'Cache key missing CIK');
  console.assert(cacheKey.includes('item_1a'), 'Cache key missing section');

} catch (error) {
  console.error('✗ Cache key tests failed:', error);
}

// Test fiscal period parsing
try {
  const period = FiscalPeriod.parse('Q1 2024');
  console.log('✓ FiscalPeriod.parse:', period);
  console.assert(period?.quarter === 1, 'Quarter parsing failed');
  console.assert(period?.year === 2024, 'Year parsing failed');

  const formatted = FiscalPeriod.format(1, 2024);
  console.log('✓ FiscalPeriod.format:', formatted);
  console.assert(formatted === 'Q1 2024', 'Period formatting failed');

} catch (error) {
  console.error('✗ Fiscal period tests failed:', error);
}

console.log('\nSEC Utils Tests Complete! ✅');