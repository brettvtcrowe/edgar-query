/**
 * Query pattern classification system
 */

import { EntityExtractor } from './entity-extractor.js';
import { 
  QueryPattern, 
  ClassificationError
} from './types.js';
import type { 
  QueryClassification, 
  ExtractedEntities,
  QueryContext
} from './types.js';

export class QueryClassifier {
  private entityExtractor = new EntityExtractor();

  /**
   * Classify a natural language query
   */
  classifyQuery(query: string, context?: QueryContext): QueryClassification {
    if (!query || query.trim().length === 0) {
      throw new ClassificationError('Query cannot be empty');
    }

    // Extract entities from the query
    const entities = this.entityExtractor.extractEntities(query);
    
    // Determine query pattern
    const pattern = this.determinePattern(query, entities, context);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(query, entities, pattern);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(query, entities, pattern, confidence);

    return {
      pattern,
      confidence,
      entities: {
        companies: entities.companies.map(c => c.name),
        tickers: entities.tickers.map(t => t.symbol),
        forms: entities.forms.map(f => f.type),
        timeRanges: entities.timeExpressions.map(t => t.expression),
        topics: entities.topics.map(t => t.topic)
      },
      reasoning
    };
  }

  /**
   * Determine the primary query pattern
   */
  private determinePattern(
    query: string, 
    entities: ExtractedEntities,
    context?: QueryContext
  ): QueryPattern {
    const lowerQuery = query.toLowerCase();
    
    // Check for company-specific indicators
    const companySpecificScore = this.calculateCompanySpecificScore(query, entities);
    
    // Check for thematic/cross-document indicators  
    const thematicScore = this.calculateThematicScore(query, entities);
    
    // Check for metadata-only queries
    const metadataScore = this.calculateMetadataScore(query, entities);
    
    // Determine pattern based on scores
    const scores = {
      [QueryPattern.COMPANY_SPECIFIC]: companySpecificScore,
      [QueryPattern.THEMATIC]: thematicScore,
      [QueryPattern.METADATA_ONLY]: metadataScore,
      [QueryPattern.HYBRID]: Math.min(companySpecificScore + thematicScore, 1.0)
    };
    
    // Find the highest scoring pattern
    const maxPattern = Object.entries(scores).reduce((max, [pattern, score]) => 
      score > max.score ? { pattern: pattern as QueryPattern, score } : max,
      { pattern: QueryPattern.COMPANY_SPECIFIC, score: 0 }
    );
    
    // Apply threshold logic
    if (maxPattern.score < 0.3) {
      // If no clear pattern, default to company-specific if entities exist, otherwise thematic
      return entities.companies.length > 0 || entities.tickers.length > 0
        ? QueryPattern.COMPANY_SPECIFIC 
        : QueryPattern.THEMATIC;
    }
    
    // Check for hybrid pattern
    if (companySpecificScore > 0.4 && thematicScore > 0.4) {
      return QueryPattern.HYBRID;
    }
    
    return maxPattern.pattern;
  }

  /**
   * Calculate company-specific pattern score
   */
  private calculateCompanySpecificScore(query: string, entities: ExtractedEntities): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    
    // Strong company-specific indicators
    const companyIndicators = [
      /\b(?:apple|microsoft|google|amazon|tesla|meta|facebook|nvidia)(?:'s)?\b/gi,
      /\b[A-Z]{2,5}(?:'s)?\s+(?:revenue|earnings|income|performance|results|filing|report|10-k|10-q|8-k)/gi,
      /\b(?:their|its)\s+(?:latest|recent|last|current|annual|quarterly)/gi,
      /\bcompany(?:'s)?\s+(?:latest|recent|last|performance|results|filing)/gi
    ];
    
    // Check for explicit company/ticker mentions
    if (entities.companies.length > 0) {
      score += Math.min(entities.companies.length * 0.3, 0.6);
    }
    
    if (entities.tickers.length > 0) {
      score += Math.min(entities.tickers.length * 0.25, 0.5);
    }
    
    // Check for company-specific language patterns
    for (const indicator of companyIndicators) {
      if (indicator.test(query)) {
        score += 0.2;
      }
    }
    
    // Possessive language ("Apple's revenue", "their latest filing")
    if (/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|[A-Z]{2,5})(?:'s|\s+(?:their|its))/gi.test(query)) {
      score += 0.25;
    }
    
    // Single company focus
    if (entities.companies.length === 1 && !lowerQuery.includes('compan')) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate thematic/cross-document pattern score
   */
  private calculateThematicScore(query: string, entities: ExtractedEntities): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    
    // Strong thematic indicators
    const thematicIndicators = [
      /\b(?:all|every|which|what)\s+(?:companies?|filings?|10-ks?|10-qs?|8-ks?)/gi,
      /\b(?:companies?|filings?)\s+(?:that|which|with|containing|mentioning|discussing)/gi,
      /\b(?:show|find|list|identify)\s+(?:all|companies?|filings?)/gi,
      /\b(?:across|among|between)\s+(?:companies?|multiple|various|different)/gi,
      /\b(?:industry|sector|market)(?:\s+wide|\s+analysis|\s+comparison)?/gi,
      /\b(?:compare|comparison|versus|vs\.?)\b/gi,
      /\bin\s+the\s+(?:past|last)\s+(?:\d+\s+)?(?:year|quarter|month)/gi
    ];
    
    // Check for thematic language patterns
    for (const indicator of thematicIndicators) {
      if (indicator.test(query)) {
        score += 0.3;
      }
    }
    
    // Plural company references
    if (/\bcompanies\b/gi.test(query)) {
      score += 0.25;
    }
    
    // Topic-focused without specific company
    if (entities.topics.length > 0 && entities.companies.length === 0) {
      score += 0.3;
    }
    
    // Time-bound searches across documents
    if (entities.timeExpressions.length > 0 && !lowerQuery.includes('their') && !lowerQuery.includes('its')) {
      score += 0.2;
    }
    
    // Multiple form types (indicates cross-document analysis)
    if (entities.forms.length > 1) {
      score += 0.15;
    }
    
    // No specific company mentioned but has business topics
    if (entities.companies.length === 0 && entities.tickers.length === 0 && entities.topics.length > 0) {
      score += 0.4;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate metadata-only pattern score
   */
  private calculateMetadataScore(query: string, entities: ExtractedEntities): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    
    // Metadata-only indicators
    const metadataIndicators = [
      /\b(?:list|show|get|find)\s+(?:filings?|reports?|documents?)/gi,
      /\b(?:last|recent|latest)\s+\d*\s*(?:filings?|reports?)/gi,
      /\bfiled?\s+(?:in|during|on|since|after|before)/gi,
      /\baccession\s+numbers?/gi,
      /\bfiling\s+(?:dates?|history|list)/gi
    ];
    
    for (const indicator of metadataIndicators) {
      if (indicator.test(query)) {
        score += 0.3;
      }
    }
    
    // Pure metadata queries (no content analysis requested)
    if (!entities.topics.length && (
      lowerQuery.includes('list') || 
      lowerQuery.includes('show') || 
      lowerQuery.includes('filed')
    )) {
      score += 0.4;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall confidence in classification
   */
  private calculateConfidence(
    query: string, 
    entities: ExtractedEntities, 
    pattern: QueryPattern
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Entity confidence boosts
    const avgCompanyConfidence = entities.companies.length > 0 
      ? entities.companies.reduce((sum, c) => sum + c.confidence, 0) / entities.companies.length
      : 0;
    
    const avgTickerConfidence = entities.tickers.length > 0
      ? entities.tickers.reduce((sum, t) => sum + t.confidence, 0) / entities.tickers.length  
      : 0;
    
    confidence += Math.max(avgCompanyConfidence, avgTickerConfidence) * 0.3;
    
    // Pattern-specific confidence adjustments
    switch (pattern) {
      case QueryPattern.COMPANY_SPECIFIC:
        if (entities.companies.length > 0 || entities.tickers.length > 0) {
          confidence += 0.2;
        }
        break;
        
      case QueryPattern.THEMATIC:
        if (entities.topics.length > 0 || query.toLowerCase().includes('companies')) {
          confidence += 0.2;
        }
        break;
        
      case QueryPattern.HYBRID:
        if (entities.companies.length > 0 && entities.topics.length > 0) {
          confidence += 0.15;
        }
        break;
        
      case QueryPattern.METADATA_ONLY:
        if (entities.forms.length > 0 || query.toLowerCase().includes('filing')) {
          confidence += 0.2;
        }
        break;
    }
    
    // Query clarity boost
    if (query.split(' ').length >= 5) { // More detailed queries
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate human-readable reasoning for classification
   */
  private generateReasoning(
    query: string, 
    entities: ExtractedEntities, 
    pattern: QueryPattern, 
    confidence: number
  ): string {
    const reasons: string[] = [];
    
    // Entity-based reasoning
    if (entities.companies.length > 0) {
      reasons.push(`Found ${entities.companies.length} company reference(s): ${entities.companies.map(c => c.name).join(', ')}`);
    }
    
    if (entities.tickers.length > 0) {
      reasons.push(`Identified ${entities.tickers.length} ticker symbol(s): ${entities.tickers.map(t => t.symbol).join(', ')}`);
    }
    
    if (entities.topics.length > 0) {
      reasons.push(`Detected ${entities.topics.length} business topic(s): ${entities.topics.map(t => t.topic).join(', ')}`);
    }
    
    if (entities.forms.length > 0) {
      reasons.push(`Referenced ${entities.forms.length} SEC form type(s): ${entities.forms.map(f => f.type).join(', ')}`);
    }
    
    if (entities.timeExpressions.length > 0) {
      reasons.push(`Found ${entities.timeExpressions.length} time expression(s): ${entities.timeExpressions.map(t => t.expression).join(', ')}`);
    }
    
    // Pattern-specific reasoning
    switch (pattern) {
      case QueryPattern.COMPANY_SPECIFIC:
        reasons.push('Query focuses on specific company/companies with possessive or targeted language');
        break;
        
      case QueryPattern.THEMATIC:
        reasons.push('Query seeks information across multiple companies or documents on a specific theme');
        break;
        
      case QueryPattern.HYBRID:
        reasons.push('Query combines company-specific analysis with broader thematic research');
        break;
        
      case QueryPattern.METADATA_ONLY:
        reasons.push('Query requests filing metadata or document listings without content analysis');
        break;
    }
    
    // Confidence reasoning
    if (confidence >= 0.8) {
      reasons.push('High confidence due to clear entity identification and unambiguous language patterns');
    } else if (confidence >= 0.6) {
      reasons.push('Moderate confidence with some ambiguous elements that may require clarification');
    } else {
      reasons.push('Lower confidence due to ambiguous language or mixed signals requiring fallback strategies');
    }
    
    return reasons.join('. ');
  }
}