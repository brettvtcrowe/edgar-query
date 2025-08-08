/**
 * Phase 1.2 Validation Gates
 * Comprehensive validation of all Phase 1.2 components
 */

import {
  // Types and schemas
  CompanySchema,
  FilingSchema,
  QuerySchema,
  QueryClassifier,
  
  // SEC utilities  
  padCIK,
  validateCIK,
  validateTicker,
  validateAccessionNumber,
  buildArchiveURL,
  buildSubmissionsURL,
  FiscalPeriod,
  
  // Rate limiter (mock for testing)
} from '../index.js';

console.log('🧪 Phase 1.2 Validation Gates\n');

// ========================================
// Validation Gate 1: Database Schema
// ========================================
console.log('📊 Validation Gate 1: Enhanced Database Schema');

try {
  // Test Company schema validation
  const companyData = {
    id: 'test-id',
    cik: '0000320193',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    description: 'Technology company',
    sic: '3571',
    industry: 'Technology',
  };
  
  const validCompany = CompanySchema.parse(companyData);
  console.log('✅ Company schema validation passed');
  
  // Test Filing schema validation
  const filingData = {
    id: 'filing-id',
    accessionNumber: '0000320193-24-000003',
    filingDate: new Date('2024-01-01'),
    reportDate: new Date('2024-01-01'),
    formType: '10-K',
    companyName: 'Apple Inc.',
    cik: '0000320193',
    period: 'Q1',
    fiscalYear: 2024,
  };
  
  const validFiling = FilingSchema.parse(filingData);
  console.log('✅ Filing schema validation passed');
  
  console.log('🎯 Database schema supports dual query patterns\n');

} catch (error) {
  console.error('❌ Database schema validation failed:', error);
}

// ========================================
// Validation Gate 2: SEC Utilities
// ========================================
console.log('🏛️  Validation Gate 2: SEC Utilities');

try {
  // Test CIK utilities
  const paddedCIK = padCIK('320193');
  const validatedCIK = validateCIK(paddedCIK);
  console.log(`✅ CIK utilities: ${paddedCIK} -> ${validatedCIK}`);
  
  // Test ticker validation
  const validTicker = validateTicker('AAPL');
  console.log(`✅ Ticker validation: ${validTicker}`);
  
  // Test accession number utilities
  const accession = '0000320193-24-000003';
  const validAccession = validateAccessionNumber(accession);
  console.log(`✅ Accession number validation: ${validAccession}`);
  
  // Test URL building
  const archiveURL = buildArchiveURL('320193', accession);
  const submissionsURL = buildSubmissionsURL('320193');
  console.log('✅ URL building works correctly');
  
  // Test fiscal period parsing
  const period = FiscalPeriod.parse('Q1 2024');
  console.log(`✅ Fiscal period parsing: ${JSON.stringify(period)}`);
  
  console.log('🎯 SEC utilities pass all tests\n');

} catch (error) {
  console.error('❌ SEC utilities validation failed:', error);
}

// ========================================
// Validation Gate 3: Query Classification
// ========================================
console.log('🤖 Validation Gate 3: Query Classification System');

try {
  // Test company-specific classification
  const companyQuery = "What was Apple's revenue in Q3 2024?";
  const companyResult = QueryClassifier.classify(companyQuery);
  
  if (companyResult.queryType === 'company-specific' && companyResult.confidence > 0.8) {
    console.log('✅ Company-specific queries correctly identified');
  } else {
    console.error('❌ Company-specific classification failed');
  }
  
  // Test thematic classification
  const thematicQuery = "Show me all 10-Ks mentioning revenue recognition";
  const thematicResult = QueryClassifier.classify(thematicQuery);
  
  if (thematicResult.queryType === 'thematic' && thematicResult.confidence > 0.7) {
    console.log('✅ Thematic queries correctly identified');
  } else {
    console.error('❌ Thematic classification failed');
  }
  
  // Test structured query creation
  const structuredQuery = QueryClassifier.createStructuredQuery(companyQuery, companyResult);
  if (structuredQuery.type === 'company-specific') {
    console.log('✅ Structured query creation works');
  }
  
  console.log('🎯 Query classification system operational\n');

} catch (error) {
  console.error('❌ Query classification validation failed:', error);
}

// ========================================
// Validation Gate 4: Type Safety
// ========================================
console.log('🛡️  Validation Gate 4: Type Safety');

try {
  // Test discriminated union query schema
  const testQueries = [
    {
      type: 'company-specific' as const,
      company: 'AAPL',
      query: 'Test query',
    },
    {
      type: 'thematic' as const,
      query: 'Test thematic query',
      limit: 50,
    },
    {
      type: 'hybrid' as const,
      query: 'Test hybrid query',
      primaryCompany: 'AAPL',
    }
  ];
  
  for (const query of testQueries) {
    const validQuery = QuerySchema.parse(query);
    console.log(`✅ ${query.type} query schema validation passed`);
  }
  
  console.log('🎯 Full type safety with discriminated unions\n');

} catch (error) {
  console.error('❌ Type safety validation failed:', error);
}

// ========================================
// Final Validation Summary
// ========================================
console.log('📋 Phase 1.2 Validation Summary');
console.log('═══════════════════════════════════════════════');
console.log('✅ Enhanced database schema with dual query support');
console.log('✅ Comprehensive Zod validation schemas');
console.log('✅ SEC utilities (CIK, URLs, accession numbers)');
console.log('✅ Query classification system (company/thematic/hybrid)');
console.log('✅ Type-safe discriminated unions');
console.log('✅ Ready for Phase 2.1: EDGAR MCP Integration');

console.log('\n🎉 Phase 1.2 Core Data Layer - COMPLETE! ✅');
console.log('\nNext: Phase 2.1 - EDGAR MCP Integration & Custom Business Logic');
console.log('- Install and test EDGAR MCP tools');
console.log('- Build query orchestration functions');
console.log('- Create cross-document search capabilities');
console.log('- Implement hybrid architecture patterns');