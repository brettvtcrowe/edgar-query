/**
 * Query Classifier Test Suite
 * Tests for dual query pattern classification
 */

import { QueryClassifier } from '../query-classifier.js';

console.log('Running Query Classification Tests...\n');

// Test Company-Specific Queries
const companyQueries = [
  "What was Apple's revenue in Q3 2024?",
  "How does Microsoft describe AI risks in their latest 10-K?",
  "Show me Tesla's cash flow from their most recent filing",
  "AAPL's latest quarterly report mentions what about iPhone sales?",
  "What does the company report about cybersecurity risks?",
];

console.log('=== Company-Specific Query Tests ===');
for (const query of companyQueries) {
  const result = QueryClassifier.classify(query);
  console.log(`Query: "${query}"`);
  console.log(`  Type: ${result.queryType} (confidence: ${result.confidence.toFixed(2)})`);
  console.log(`  Reasoning: ${result.reasoning.join('; ')}`);
  console.log(`  Companies: ${result.extractedEntities.companies?.join(', ') || 'None'}`);
  console.log('');
}

// Test Thematic Queries
const thematicQueries = [
  "Show me all 10-Ks in the past year that include language around 'revenue recognition'",
  "Which companies mentioned supply chain disruptions in their latest quarterly filings?",
  "Find all companies that disclosed cybersecurity incidents in 8-K filings this year",
  "How many companies reported AI-related risks in their 10-K filings?",
  "Compare revenue recognition practices across all tech companies",
];

console.log('=== Thematic Query Tests ===');
for (const query of thematicQueries) {
  const result = QueryClassifier.classify(query);
  console.log(`Query: "${query}"`);
  console.log(`  Type: ${result.queryType} (confidence: ${result.confidence.toFixed(2)})`);
  console.log(`  Reasoning: ${result.reasoning.join('; ')}`);
  console.log(`  Themes: ${result.extractedEntities.themes?.join(', ') || 'None'}`);
  console.log(`  Time refs: ${result.extractedEntities.timeReferences?.join(', ') || 'None'}`);
  console.log('');
}

// Test Hybrid Queries
const hybridQueries = [
  "How do tech companies describe AI risks compared to Apple?",
  "Compare Microsoft's cybersecurity disclosures to other cloud companies",
  "How does Tesla's approach to sustainability compare to traditional automakers?",
];

console.log('=== Hybrid Query Tests ===');
for (const query of hybridQueries) {
  const result = QueryClassifier.classify(query);
  console.log(`Query: "${query}"`);
  console.log(`  Type: ${result.queryType} (confidence: ${result.confidence.toFixed(2)})`);
  console.log(`  Reasoning: ${result.reasoning.join('; ')}`);
  console.log(`  Companies: ${result.extractedEntities.companies?.join(', ') || 'None'}`);
  console.log('');
}

// Test Structured Query Creation
console.log('=== Structured Query Creation Tests ===');
const testQuery = "What was Apple's revenue in Q1 2024?";
const classification = QueryClassifier.classify(testQuery);
const structuredQuery = QueryClassifier.createStructuredQuery(testQuery, classification);

console.log(`Original: "${testQuery}"`);
console.log('Structured Query:', JSON.stringify(structuredQuery, null, 2));

console.log('\nQuery Classification Tests Complete! ✅');