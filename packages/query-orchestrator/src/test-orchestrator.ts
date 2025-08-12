/**
 * Test script for Query Orchestrator
 */

import { EDGARClient } from '@edgar-query/edgar-client';
import { QueryOrchestrator, QueryClassifier } from './index.js';

async function testOrchestrator() {
  console.log('🧪 Testing Query Orchestrator\n');

  // Initialize EDGAR client
  const edgarClient = new EDGARClient({
    secUserAgent: 'TestOrchestrator/1.0 (test@example.com)',
    enableFallback: true,
    cacheEnabled: true
  });

  // Initialize orchestrator
  const orchestrator = new QueryOrchestrator(edgarClient);
  const classifier = new QueryClassifier();

  // Test queries representing different patterns
  const testQueries = [
    {
      query: "What was Apple's revenue in their latest 10-K?",
      expectedPattern: 'company_specific',
      description: 'Company-specific with financial topic'
    },
    {
      query: "Show me all companies that mentioned cybersecurity risks in their recent filings",
      expectedPattern: 'thematic', 
      description: 'Thematic cross-document search'
    },
    {
      query: "How does Microsoft's AI strategy compare to industry trends?",
      expectedPattern: 'hybrid',
      description: 'Hybrid: company-specific + thematic'
    },
    {
      query: "List Tesla's recent 8-K filings",
      expectedPattern: 'metadata_only',
      description: 'Simple metadata retrieval'
    },
    {
      query: "NVDA quarterly results",
      expectedPattern: 'company_specific',
      description: 'Ticker-based company query'
    }
  ];

  console.log('🔍 Testing Query Classification\n');

  for (const test of testQueries) {
    console.log(`Query: "${test.query}"`);
    console.log(`Expected: ${test.expectedPattern}`);
    
    try {
      const classification = classifier.classifyQuery(test.query);
      
      console.log(`✅ Classified as: ${classification.pattern}`);
      console.log(`   Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
      
      if (classification.entities?.companies?.length) {
        console.log(`   Companies: ${classification.entities.companies.join(', ')}`);
      }
      if (classification.entities?.tickers?.length) {
        console.log(`   Tickers: ${classification.entities.tickers.join(', ')}`);
      }
      if (classification.entities?.topics?.length) {
        console.log(`   Topics: ${classification.entities.topics.join(', ')}`);
      }
      
      console.log(`   Reasoning: ${classification.reasoning}\n`);
      
    } catch (error: any) {
      console.log(`❌ Classification failed: ${error.message}\n`);
    }
  }

  console.log('🎭 Testing Query Orchestration\n');

  // Test a simple company-specific query that should work with current implementation
  const testQuery = "What are Apple's recent 10-K filings?";
  console.log(`Orchestrating: "${testQuery}"`);

  try {
    const result = await orchestrator.orchestrateQuery(testQuery, {
      preferences: { maxResults: 5 }
    });

    console.log(`✅ Orchestration completed:`);
    console.log(`   Pattern: ${result.pattern}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Execution time: ${result.metadata.executionTime}ms`);
    console.log(`   Tools called: ${result.metadata.toolsCalled.join(', ')}`);
    console.log(`   Data sources: ${result.sources.map(s => s.type).join(', ')}`);
    
    if (result.success && result.data) {
      console.log(`   Result preview: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`);
    }
    
    if (result.metadata.errors) {
      console.log(`   Errors: ${result.metadata.errors.join(', ')}`);
    }

  } catch (error: any) {
    console.log(`❌ Orchestration failed: ${error.message}`);
  }

  console.log('\n🎯 Query Orchestrator Test Complete!');
}

// Run tests
testOrchestrator().catch(console.error);