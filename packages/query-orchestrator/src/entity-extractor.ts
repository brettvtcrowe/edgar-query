/**
 * Entity extraction from natural language queries
 */

import type { ExtractedEntities } from './types.js';

export class EntityExtractor {
  // Common company name patterns and ticker symbols
  private readonly companyPatterns = [
    // Full company names with common suffixes
    /\b([A-Z][a-zA-Z\s&\.]+(?:\s+(?:Inc|Corp|Corporation|Company|Co|LLC|Ltd|Limited|Group|Holdings|Technologies|Tech|Systems|Solutions|Services|Associates|Partners|Industries|International|Intl|Enterprises|Ventures|Capital|Investment|Investments|Trust|Bank|Financial|Insurance|Energy|Pharmaceuticals|Communications|Media|Entertainment|Software|Semiconductor|Automotive|Airlines|Railway|Motors|Electric|Power|Gas|Oil|Mining|Steel|Chemicals|Materials|Real\s+Estate|Properties|Retail|Consumer|Products|Foods|Beverage|Restaurant|Hotels|Healthcare|Medical|Biotech|Devices|Equipment|Instruments))\.?)/g,
    
    // Ticker symbols in various formats
    /\b([A-Z]{1,5})(?:\s+(?:stock|shares?|ticker|symbol))?\b/g,
    /(?:ticker|symbol|stock)[\s:]+([A-Z]{1,5})\b/gi,
    /\$([A-Z]{1,5})\b/g, // $AAPL format
  ];

  // Common SEC form types
  private readonly formPatterns = [
    /\b(10-[KQ]|8-K|S-[13]|20-F|DEF\s+14A|11-K|N-[12][A-Z]?|F-[13]|6-K|SC\s+13[DG]|13[FGH]|144|3|4|5)\b/gi,
    /\b(?:form|filing)\s+(10-[KQ]|8-K|S-[13]|20-F|DEF\s+14A|11-K|N-[12][A-Z]?|F-[13]|6-K|SC\s+13[DG]|13[FGH]|144|3|4|5)\b/gi,
    /\b(annual|quarterly|current|registration|proxy|insider|beneficial\s+ownership)\s+(?:report|statement|filing)/gi
  ];

  // Time expression patterns
  private readonly timePatterns = [
    // Specific dates
    /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},?\s+\d{4})\b/g,
    // Relative time expressions
    /\b(?:last|past|previous|recent)\s+(\d+)?\s*(year|quarter|month|week|day)s?\b/gi,
    /\b(this|current)\s+(year|quarter|month|week)\b/gi,
    /\b(\d+)\s+(year|quarter|month|week|day)s?\s+ago\b/gi,
    // Quarters and years
    /\b[Qq]([1-4])\s+(\d{4})\b/g,
    /\b(\d{4})\s*[Qq]([1-4])\b/g,
    /\b(FY|fiscal\s+year)\s*(\d{4})\b/gi,
    // Date ranges
    /\b(?:from|since|between)\s+([^,]+?)\s+(?:to|through|and|until)\s+([^,\.\?!]+)/gi
  ];

  // Financial and business topics
  private readonly topicKeywords = {
    financial: [
      'revenue', 'income', 'earnings', 'profit', 'loss', 'sales', 'cash flow', 
      'balance sheet', 'assets', 'liabilities', 'equity', 'debt', 'ebitda',
      'margins', 'gross profit', 'net income', 'operating income', 'eps',
      'financial statements', 'financial performance', 'financial results'
    ],
    risk: [
      'risk factors', 'risks', 'uncertainties', 'material weakness', 'controls',
      'cybersecurity', 'data breach', 'regulatory risk', 'market risk',
      'credit risk', 'operational risk', 'litigation', 'legal proceedings',
      'climate risk', 'supply chain risk', 'competition', 'competitive'
    ],
    governance: [
      'board of directors', 'corporate governance', 'executive compensation',
      'proxy', 'voting', 'shareholder', 'board composition', 'independence',
      'committee', 'audit committee', 'compensation committee', 'governance committee',
      'insider trading', 'related party', 'conflicts of interest'
    ],
    operations: [
      'business operations', 'segments', 'subsidiaries', 'acquisitions',
      'divestitures', 'products', 'services', 'customers', 'suppliers',
      'manufacturing', 'research and development', 'r&d', 'innovation',
      'employees', 'workforce', 'facilities', 'capacity'
    ],
    regulatory: [
      'sec', 'compliance', 'regulations', 'regulatory', 'investigation',
      'enforcement', 'settlement', 'consent decree', 'tax', 'accounting',
      'audit', 'internal controls', 'sox', 'sarbanes oxley', 'disclosure'
    ]
  };

  // Query intent classification patterns
  private readonly queryIntents = {
    'revenue': {
      keywords: ['revenue', 'sales', 'income', 'earnings', 'profit', 'quarterly results', 'financial results', 'top line'],
      forms: ['10-Q', '10-K'], // Latest financial data
      priority: 'latest'
    },
    'earnings': {
      keywords: ['earnings', 'quarterly earnings', 'earnings report', 'eps', 'earnings per share'],
      forms: ['10-Q', '8-K'], // Quarterly results + earnings releases
      priority: 'latest'
    },
    'risk_factors': {
      keywords: ['risk factors', 'risks', 'risk disclosure', 'uncertainties', 'material risks'],
      forms: ['10-K'], // Annual comprehensive risk disclosure
      priority: 'comprehensive'
    },
    'leadership_changes': {
      keywords: ['leadership', 'ceo', 'cfo', 'executive', 'management changes', 'board changes', 'appointments', 'departures'],
      forms: ['8-K'], // Current reports for exec changes
      priority: 'recent'
    },
    'annual_results': {
      keywords: ['annual results', 'yearly', 'full year', 'fy', 'fiscal year', 'annual report'],
      forms: ['10-K'], // Full year comprehensive data
      priority: 'comprehensive'
    },
    'quarterly_results': {
      keywords: ['quarterly', 'q1', 'q2', 'q3', 'q4', 'quarter', 'quarterly report'],
      forms: ['10-Q'], // Quarterly data
      priority: 'latest'
    },
    'recent_events': {
      keywords: ['recent', 'current events', 'material events', 'corporate events', 'announcements'],
      forms: ['8-K'], // Material events and changes
      priority: 'recent'
    },
    'business_segments': {
      keywords: ['business', 'segments', 'divisions', 'operations', 'products', 'services', 'what does'],
      forms: ['10-K', '10-Q'], // Business description
      priority: 'comprehensive'
    },
    'cash_flow': {
      keywords: ['cash flow', 'cash', 'liquidity', 'working capital', 'free cash flow'],
      forms: ['10-Q', '10-K'], // Financial statements
      priority: 'latest'
    },
    'acquisitions': {
      keywords: ['acquisition', 'merger', 'purchase', 'deal', 'transaction', 'bought', 'acquired'],
      forms: ['8-K', '10-Q'], // Recent transactions
      priority: 'recent'
    }
  };

  /**
   * Extract all entities from a query
   */
  extractEntities(query: string): ExtractedEntities {
    const entities: ExtractedEntities = {
      companies: [],
      tickers: [],
      forms: [],
      timeExpressions: [],
      topics: [],
      queryIntent: this.classifyQueryIntent(query)
    };

    // Extract companies and tickers
    this.extractCompaniesAndTickers(query, entities);
    
    // Extract form types (supplement with intent-based forms)
    this.extractFormTypes(query, entities);
    
    // Extract time expressions
    this.extractTimeExpressions(query, entities);
    
    // Extract topics
    this.extractTopics(query, entities);

    return entities;
  }

  /**
   * Classify query intent and determine appropriate filing types
   */
  classifyQueryIntent(query: string): { intent: string; confidence: number; recommendedForms: string[]; priority: 'latest' | 'recent' | 'comprehensive' } | undefined {
    const lowerQuery = query.toLowerCase();
    let bestIntent: string | null = null;
    let bestScore = 0;
    let bestMatch: any = null;

    // Score each intent based on keyword matches
    for (const [intent, config] of Object.entries(this.queryIntents)) {
      let score = 0;
      let matchedKeywords = 0;

      for (const keyword of config.keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          score += keyword.length; // Longer keywords get higher weight
          matchedKeywords++;
        }
      }

      // Boost score based on number of keywords matched
      if (matchedKeywords > 0) {
        score *= (1 + matchedKeywords * 0.2); // 20% boost per additional keyword
      }

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
        bestMatch = config;
      }
    }

    if (bestIntent && bestMatch) {
      // Calculate confidence based on score and query length
      const confidence = Math.min(0.95, bestScore / Math.max(lowerQuery.length * 0.1, 1));
      
      return {
        intent: bestIntent,
        confidence,
        recommendedForms: bestMatch.forms,
        priority: bestMatch.priority as 'latest' | 'recent' | 'comprehensive'
      };
    }

    return undefined;
  }

  /**
   * Extract company names and ticker symbols
   */
  private extractCompaniesAndTickers(query: string, entities: ExtractedEntities): void {
    // Well-known companies (exact matches with high confidence)
    const knownCompanies = {
      'apple': { name: 'Apple Inc.', ticker: 'AAPL' },
      'microsoft': { name: 'Microsoft Corporation', ticker: 'MSFT' },
      'google': { name: 'Alphabet Inc.', ticker: 'GOOGL' },
      'alphabet': { name: 'Alphabet Inc.', ticker: 'GOOGL' },
      'amazon': { name: 'Amazon.com Inc.', ticker: 'AMZN' },
      'tesla': { name: 'Tesla, Inc.', ticker: 'TSLA' },
      'meta': { name: 'Meta Platforms Inc.', ticker: 'META' },
      'facebook': { name: 'Meta Platforms Inc.', ticker: 'META' },
      'nvidia': { name: 'NVIDIA Corporation', ticker: 'NVDA' },
      'intel': { name: 'Intel Corporation', ticker: 'INTC' },
      'netflix': { name: 'Netflix Inc.', ticker: 'NFLX' },
      'disney': { name: 'The Walt Disney Company', ticker: 'DIS' },
      'walmart': { name: 'Walmart Inc.', ticker: 'WMT' },
      'johnson & johnson': { name: 'Johnson & Johnson', ticker: 'JNJ' },
      'jpmorgan': { name: 'JPMorgan Chase & Co.', ticker: 'JPM' },
      'berkshire hathaway': { name: 'Berkshire Hathaway Inc.', ticker: 'BRK.A' }
    };

    const lowerQuery = query.toLowerCase();
    
    // Check for known companies
    for (const [key, company] of Object.entries(knownCompanies)) {
      if (lowerQuery.includes(key)) {
        entities.companies.push({
          name: company.name,
          confidence: 0.95,
          source: 'exact_match'
        });
        entities.tickers.push({
          symbol: company.ticker,
          confidence: 0.95
        });
      }
    }

    // Extract ticker symbols
    const tickerMatches = query.match(/\b[A-Z]{1,5}\b/g);
    if (tickerMatches) {
      for (const ticker of tickerMatches) {
        // Skip common words that look like tickers
        if (!['THE', 'AND', 'FOR', 'ALL', 'ARE', 'BUT', 'NOT', 'YOU', 'CAN', 'GET', 'HAS', 'HAD', 'ITS', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'HIM', 'HOW', 'MAN', 'OUT', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'SEC'].includes(ticker)) {
          entities.tickers.push({
            symbol: ticker,
            confidence: 0.7
          });
        }
      }
    }
  }

  /**
   * Extract SEC form types
   */
  private extractFormTypes(query: string, entities: ExtractedEntities): void {
    for (const pattern of this.formPatterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.exec(query)) !== null) {
        const formType = match[1] || match[0];
        const normalized = this.normalizeFormType(formType);
        
        entities.forms.push({
          type: normalized,
          confidence: 0.9,
          variations: [formType]
        });
      }
    }
  }

  /**
   * Extract time expressions
   */
  private extractTimeExpressions(query: string, entities: ExtractedEntities): void {
    for (const pattern of this.timePatterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.exec(query)) !== null) {
        const expression = match[0];
        const normalized = this.normalizeTimeExpression(match);
        
        entities.timeExpressions.push({
          expression,
          normalized,
          confidence: 0.8
        });
      }
    }
  }

  /**
   * Extract business topics
   */
  private extractTopics(query: string, entities: ExtractedEntities): void {
    const lowerQuery = query.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.topicKeywords)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          entities.topics.push({
            topic: keyword,
            category: category as any,
            confidence: 0.8,
            keywords: [keyword]
          });
        }
      }
    }
  }

  /**
   * Normalize form type
   */
  private normalizeFormType(form: string): string {
    const normalized = form.toUpperCase().replace(/\s+/g, ' ').trim();
    
    // Map common variations
    const formMap: Record<string, string> = {
      'ANNUAL REPORT': '10-K',
      'QUARTERLY REPORT': '10-Q',
      'CURRENT REPORT': '8-K',
      'REGISTRATION STATEMENT': 'S-1',
      'PROXY STATEMENT': 'DEF 14A'
    };
    
    return formMap[normalized] || normalized;
  }

  /**
   * Normalize time expression
   */
  private normalizeTimeExpression(match: RegExpExecArray): { start?: string; end?: string; period?: string } {
    const expression = match[0].toLowerCase();
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Handle quarters
    if (expression.includes('q')) {
      const quarterMatch = expression.match(/q([1-4])\s*(\d{4})/);
      if (quarterMatch) {
        const quarter = parseInt(quarterMatch[1]);
        const year = parseInt(quarterMatch[2]);
        return {
          period: `${year}Q${quarter}`,
          start: this.getQuarterStart(year, quarter),
          end: this.getQuarterEnd(year, quarter)
        };
      }
    }
    
    // Handle relative expressions
    if (expression.includes('last') || expression.includes('past')) {
      const numberMatch = expression.match(/(\d+)/);
      const unitMatch = expression.match(/(year|quarter|month|week|day)/);
      
      if (numberMatch && unitMatch) {
        const amount = parseInt(numberMatch[1]);
        const unit = unitMatch[1];
        
        return {
          period: `last_${amount}_${unit}${amount > 1 ? 's' : ''}`,
          start: this.getRelativeDate(now, -amount, unit),
          end: now.toISOString().split('T')[0]
        };
      }
    }
    
    return { period: expression };
  }

  /**
   * Helper: Get quarter start date
   */
  private getQuarterStart(year: number, quarter: number): string {
    const month = (quarter - 1) * 3;
    return new Date(year, month, 1).toISOString().split('T')[0];
  }

  /**
   * Helper: Get quarter end date
   */
  private getQuarterEnd(year: number, quarter: number): string {
    const month = quarter * 3;
    return new Date(year, month, 0).toISOString().split('T')[0];
  }

  /**
   * Helper: Get relative date
   */
  private getRelativeDate(from: Date, amount: number, unit: string): string {
    const date = new Date(from);
    
    switch (unit) {
      case 'year':
        date.setFullYear(date.getFullYear() + amount);
        break;
      case 'quarter':
        date.setMonth(date.getMonth() + (amount * 3));
        break;
      case 'month':
        date.setMonth(date.getMonth() + amount);
        break;
      case 'week':
        date.setDate(date.getDate() + (amount * 7));
        break;
      case 'day':
        date.setDate(date.getDate() + amount);
        break;
    }
    
    return date.toISOString().split('T')[0];
  }
}