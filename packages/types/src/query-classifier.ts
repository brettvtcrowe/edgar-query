/**
 * Query Classification System
 * Determines whether a query is company-specific, thematic, or hybrid
 */

import { QueryType, CompanyQuery, ThematicQuery, HybridQuery } from './index.js';

export interface ClassificationResult {
  queryType: QueryType;
  confidence: number;
  reasoning: string[];
  extractedEntities: {
    companies?: string[];
    tickers?: string[];
    formTypes?: string[];
    timeReferences?: string[];
    themes?: string[];
  };
}

export class QueryClassifier {
  // Company indicators (names, tickers, possessive patterns)
  private static readonly COMPANY_PATTERNS = [
    // Major tech companies
    /\b(Apple|Microsoft|Google|Amazon|Meta|Tesla|Netflix|Adobe|Salesforce|Oracle)\b/gi,
    
    // Common ticker patterns
    /\b[A-Z]{1,5}\b/g, // 1-5 letter uppercase (potential tickers)
    
    // Possessive patterns
    /\b(Apple|Microsoft|Google|Amazon|Meta|Tesla|Netflix|Adobe|Salesforce|Oracle)['']s\b/gi,
    /\b[A-Z]{1,5}['']s\b/g, // Ticker possessives like "AAPL's"
    
    // Company reference patterns
    /\bthe company\b/gi,
    /\bthis company\b/gi,
    /\btheir (latest|most recent|current)\b/gi,
  ];
  
  // Thematic indicators (plural, comparative, cross-document)
  private static readonly THEMATIC_PATTERNS = [
    // Plural company references
    /\b(companies|firms|corporations|entities) (that|which|with|mentioning|describing|reporting)\b/gi,
    /\ball (companies|firms|corporations|entities)\b/gi,
    /\bwhich companies\b/gi,
    /\bhow many companies\b/gi,
    
    // Comparative language
    /\b(compare|comparison|versus|vs\.?|against|relative to)\b/gi,
    /\b(similar|different|better|worse|higher|lower) than\b/gi,
    
    // Cross-document search patterns
    /\b(all|every|any) (10-?[KQ]s?|8-?Ks?|filings?)\b/gi,
    /\bacross (all|multiple|various) (companies|filings|documents)\b/gi,
    /\bindustry.?(wide|analysis|comparison|trends?)\b/gi,
    
    // Time-bound document searches
    /\bin the (past|last) (year|quarter|month)\b/gi,
    /\b(this|last) (year|quarter)\b/gi,
    /\bsince \d{4}\b/gi,
  ];
  
  // Time reference patterns
  private static readonly TIME_PATTERNS = [
    /\b(Q[1-4]|quarter [1-4]|first quarter|second quarter|third quarter|fourth quarter)\b/gi,
    /\b(FY|fiscal year) ?\d{4}\b/gi,
    /\b\d{4}\b/g, // Years
    /\b(past|last|previous|current|recent|latest) (year|quarter|month|filing)\b/gi,
    /\b(this|last) (year|quarter|month)\b/gi,
  ];
  
  // Filing type patterns
  private static readonly FORM_TYPE_PATTERNS = [
    /\b10-?K\b/gi,
    /\b10-?Q\b/gi,
    /\b8-?K\b/gi,
    /\bS-?[13]\b/gi,
    /\b20-?F\b/gi,
    /\bDEF 14A\b/gi,
    /\bproxy statement\b/gi,
    /\bannual report\b/gi,
    /\bquarterly report\b/gi,
  ];
  
  // Common financial/business themes
  private static readonly THEME_PATTERNS = [
    // Financial themes
    /\b(revenue recognition|accounting|financial performance|cash flow)\b/gi,
    /\b(earnings|profits?|losses?|income|expenses?)\b/gi,
    
    // Risk themes
    /\b(risk factors?|cybersecurity|data breach|supply chain)\b/gi,
    /\b(regulatory|compliance|litigation|competition)\b/gi,
    
    // Business themes
    /\b(AI|artificial intelligence|machine learning|automation)\b/gi,
    /\b(ESG|sustainability|climate|environmental)\b/gi,
    /\b(merger|acquisition|restructuring|spinoff)\b/gi,
  ];
  
  /**
   * Classify a natural language query
   * @param query - The user's query string
   * @returns Classification result with type, confidence, and reasoning
   */
  static classify(query: string): ClassificationResult {
    const reasoning: string[] = [];
    let confidence = 0.5; // Start neutral
    
    // Extract entities
    const extractedEntities = this.extractEntities(query);
    
    // Count pattern matches
    const companyMatches = this.countMatches(query, this.COMPANY_PATTERNS);
    const thematicMatches = this.countMatches(query, this.THEMATIC_PATTERNS);
    
    // Company-specific scoring
    let companyScore = 0;
    if (companyMatches > 0) {
      companyScore += companyMatches * 0.3;
      reasoning.push(`Found ${companyMatches} company-specific pattern(s)`);
    }
    
    if (extractedEntities.companies && extractedEntities.companies.length > 0) {
      companyScore += extractedEntities.companies.length * 0.25;
      reasoning.push(`Identified company names: ${extractedEntities.companies.join(', ')}`);
    }
    
    if (extractedEntities.tickers && extractedEntities.tickers.length > 0) {
      companyScore += extractedEntities.tickers.length * 0.2;
      reasoning.push(`Found potential tickers: ${extractedEntities.tickers.join(', ')}`);
    }
    
    // Thematic scoring
    let thematicScore = 0;
    if (thematicMatches > 0) {
      thematicScore += thematicMatches * 0.3;
      reasoning.push(`Found ${thematicMatches} thematic pattern(s)`);
    }
    
    if (extractedEntities.themes && extractedEntities.themes.length > 0) {
      thematicScore += extractedEntities.themes.length * 0.2;
      reasoning.push(`Identified themes: ${extractedEntities.themes.join(', ')}`);
    }
    
    // Time references can indicate thematic queries
    if (extractedEntities.timeReferences && extractedEntities.timeReferences.length > 0) {
      thematicScore += 0.15;
      reasoning.push(`Time references suggest cross-document search`);
    }
    
    // Form type references
    if (extractedEntities.formTypes && extractedEntities.formTypes.length > 0) {
      reasoning.push(`Form types mentioned: ${extractedEntities.formTypes.join(', ')}`);
    }
    
    // Determine query type based on scores
    let queryType: QueryType;
    
    if (companyScore > thematicScore && companyScore > 0.4) {
      queryType = 'company-specific';
      confidence = Math.min(0.95, 0.6 + companyScore);
      reasoning.push('Classified as company-specific based on company references');
      
    } else if (thematicScore > companyScore && thematicScore > 0.4) {
      queryType = 'thematic';
      confidence = Math.min(0.95, 0.6 + thematicScore);
      reasoning.push('Classified as thematic based on cross-document patterns');
      
    } else if (companyScore > 0.2 && thematicScore > 0.2) {
      queryType = 'hybrid';
      confidence = Math.min(0.9, 0.5 + (companyScore + thematicScore) / 2);
      reasoning.push('Classified as hybrid due to mixed patterns');
      
    } else {
      // Default fallback based on heuristics
      if (this.containsComparativeLanguage(query)) {
        queryType = 'thematic';
        confidence = 0.7;
        reasoning.push('Defaulted to thematic based on comparative language');
      } else {
        queryType = 'company-specific';
        confidence = 0.6;
        reasoning.push('Defaulted to company-specific (conservative approach)');
      }
    }
    
    return {
      queryType,
      confidence,
      reasoning,
      extractedEntities,
    };
  }
  
  /**
   * Extract structured entities from the query
   */
  private static extractEntities(query: string) {
    const entities = {
      companies: [] as string[],
      tickers: [] as string[],
      formTypes: [] as string[],
      timeReferences: [] as string[],
      themes: [] as string[],
    };
    
    // Extract company names (basic list - could be expanded)
    const companyNames = [
      'Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Tesla', 
      'Netflix', 'Adobe', 'Salesforce', 'Oracle', 'IBM', 'Intel',
      'Nvidia', 'AMD', 'Qualcomm', 'Cisco', 'PayPal', 'Square',
    ];
    
    for (const company of companyNames) {
      if (new RegExp(`\\b${company}\\b`, 'gi').test(query)) {
        entities.companies.push(company);
      }
    }
    
    // Extract potential tickers (1-5 uppercase letters)
    const tickerMatches = query.match(/\b[A-Z]{1,5}\b/g);
    if (tickerMatches) {
      // Filter out common English words that might match ticker pattern
      const commonWords = ['A', 'I', 'TO', 'THE', 'AND', 'OR', 'BUT', 'FOR', 'OF', 'IN', 'ON', 'AT', 'BY'];
      entities.tickers = tickerMatches.filter(match => !commonWords.includes(match));
    }
    
    // Extract form types
    entities.formTypes = this.extractMatches(query, this.FORM_TYPE_PATTERNS);
    
    // Extract time references
    entities.timeReferences = this.extractMatches(query, this.TIME_PATTERNS);
    
    // Extract themes
    entities.themes = this.extractMatches(query, this.THEME_PATTERNS);
    
    return entities;
  }
  
  /**
   * Count pattern matches in query
   */
  private static countMatches(query: string, patterns: RegExp[]): number {
    let count = 0;
    for (const pattern of patterns) {
      const matches = query.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }
  
  /**
   * Extract unique matches from patterns
   */
  private static extractMatches(query: string, patterns: RegExp[]): string[] {
    const matches = new Set<string>();
    
    for (const pattern of patterns) {
      const found = query.match(pattern);
      if (found) {
        found.forEach(match => matches.add(match.toLowerCase()));
      }
    }
    
    return Array.from(matches);
  }
  
  /**
   * Check for comparative language indicating thematic queries
   */
  private static containsComparativeLanguage(query: string): boolean {
    const comparativePatterns = [
      /\b(compare|comparison|versus|vs\.?|against|relative to)\b/gi,
      /\b(similar|different|better|worse|higher|lower|more|less) than\b/gi,
      /\bhow (many|much|often|frequently)\b/gi,
      /\bwhat (percentage|portion|fraction|ratio)\b/gi,
    ];
    
    return comparativePatterns.some(pattern => pattern.test(query));
  }
  
  /**
   * Create a structured query object based on classification
   * @param query - Original query string
   * @param classification - Classification result
   * @returns Typed query object
   */
  static createStructuredQuery(
    query: string,
    classification: ClassificationResult
  ): CompanyQuery | ThematicQuery | HybridQuery {
    const baseQuery = {
      query,
      formTypes: classification.extractedEntities.formTypes,
      dateRange: this.extractDateRange(classification.extractedEntities.timeReferences || []),
    };
    
    switch (classification.queryType) {
      case 'company-specific':
        return {
          type: 'company-specific',
          company: classification.extractedEntities.companies?.[0] || 
                  classification.extractedEntities.tickers?.[0] || 
                  'UNKNOWN',
          ...baseQuery,
        } as CompanyQuery;
        
      case 'thematic':
        return {
          type: 'thematic',
          industries: undefined, // Could be extracted from query
          limit: 50, // Default limit for thematic queries
          ...baseQuery,
        } as ThematicQuery;
        
      case 'hybrid':
        return {
          type: 'hybrid',
          primaryCompany: classification.extractedEntities.companies?.[0] || 
                         classification.extractedEntities.tickers?.[0],
          comparisonCriteria: classification.extractedEntities.themes?.join(', '),
          ...baseQuery,
        } as HybridQuery;
    }
  }
  
  /**
   * Extract date range from time references
   */
  private static extractDateRange(timeReferences: string[]) {
    // Simple date range extraction - could be enhanced
    const hasRecentReference = timeReferences.some(ref => 
      /\b(past|last|recent|current)\b/i.test(ref)
    );
    
    if (hasRecentReference) {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      return {
        from: oneYearAgo,
        to: now,
      };
    }
    
    return undefined;
  }
}

export default QueryClassifier;