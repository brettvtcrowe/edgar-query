/**
 * Query orchestration engine
 * Routes queries between MCP service and custom tools based on classification
 */

import { EDGARClient } from '@edgar-query/edgar-client';
import { thematicSearch, type ThematicSearchParams, type ThematicProgressCallback } from '../../thematic-search/dist/index.js';
import { QueryClassifier } from './query-classifier.js';
import {
  QueryPattern,
  ExecutionError
} from './types.js';
import type {
  QueryContext,
  QueryClassification,
  QueryPlan,
  QueryResult
} from './types.js';

export class QueryOrchestrator {
  private classifier = new QueryClassifier();

  constructor(
    private edgarClient: EDGARClient
  ) {}

  /**
   * Main orchestration entry point
   */
  async orchestrateQuery(
    query: string, 
    context?: QueryContext
  ): Promise<QueryResult> {
    // Ensure context has the original query
    const enhancedContext = {
      ...context,
      originalQuery: query
    };
    const startTime = Date.now();
    const toolsCalled: string[] = [];
    const sources: Array<{ type: 'mcp' | 'sec_api' | 'custom'; endpoint?: string; timestamp: string }> = [];
    const errors: string[] = [];

    try {
      // Step 1: Classify the query
      const classification = this.classifier.classifyQuery(query, enhancedContext);
      
      // Step 2: Create execution plan
      const plan = this.createExecutionPlan(classification, enhancedContext);
      
      // Step 3: Execute the plan
      const result = await this.executePlan(plan, {
        onToolCall: (toolName) => toolsCalled.push(toolName),
        onSource: (source) => sources.push(source),
        onError: (error) => errors.push(error)
      });

      return {
        success: true,
        pattern: classification.pattern,
        data: result.data,
        sources,
        citations: result.citations,
        metadata: {
          executionTime: Date.now() - startTime,
          toolsCalled,
          errors: errors.length > 0 ? errors : undefined
        }
      };

    } catch (error: any) {
      return {
        success: false,
        pattern: QueryPattern.COMPANY_SPECIFIC, // Default fallback
        data: null,
        sources,
        metadata: {
          executionTime: Date.now() - startTime,
          toolsCalled,
          errors: [error.message, ...errors]
        }
      };
    }
  }

  /**
   * Create execution plan based on query classification
   */
  private createExecutionPlan(
    classification: QueryClassification,
    context?: QueryContext
  ): QueryPlan {
    const { pattern, entities } = classification;

    switch (pattern) {
      case QueryPattern.COMPANY_SPECIFIC:
        return this.createCompanySpecificPlan(entities, context);

      case QueryPattern.THEMATIC:
        return this.createThematicPlan(entities, context);

      case QueryPattern.HYBRID:
        return this.createHybridPlan(entities, context);

      case QueryPattern.METADATA_ONLY:
        return this.createMetadataPlan(entities, context);

      default:
        throw new ExecutionError(`Unsupported query pattern: ${pattern}`);
    }
  }

  /**
   * Create plan for company-specific queries
   */
  private createCompanySpecificPlan(
    entities: any,
    context?: QueryContext
  ): QueryPlan {
    const steps = [];

    // Step 1: Resolve company identifiers
    if (entities?.tickers?.length > 0) {
      steps.push({
        type: 'resolve_company' as const,
        tool: 'getCIKByTicker',
        params: { ticker: entities.tickers[0] },
        priority: 1
      });
    }

    // Step 2: Get company information
    steps.push({
      type: 'resolve_company' as const,
      tool: 'getCompanyInfo',
      params: { identifier: entities?.companies?.[0] || entities?.tickers?.[0] },
      priority: 2,
      dependsOn: entities?.tickers?.length > 0 ? ['getCIKByTicker'] : undefined
    });

    // Step 3: Get recent filings - Use intelligent form selection based on query intent
    const shouldGetFilings = entities?.forms?.length > 0 || entities?.timeRanges?.length > 0 || entities?.topics?.length > 0 || entities?.queryIntent;
    
    if (shouldGetFilings) {
      // Determine filing forms based on query intent
      let formTypes: string[] = [];
      
      if (entities?.queryIntent?.recommendedForms?.length > 0) {
        // Use query intent recommendation
        formTypes = entities.queryIntent.recommendedForms;
      } else if (entities?.forms?.length > 0) {
        // Use explicitly mentioned forms
        formTypes = entities.forms.map((f: any) => f.type || f);
      } else {
        // Default fallback
        formTypes = ['10-Q', '10-K', '8-K'];
      }
      
      steps.push({
        type: 'list_filings' as const,
        tool: 'getRecentFilings',
        params: {
          identifier: entities?.companies?.[0] || entities?.tickers?.[0],
          form_types: formTypes, // Now using intelligent form selection
          days: this.parseTimeRange(entities?.timeRanges?.[0]),
          limit: context?.preferences?.maxResults || 20, // Increased to allow better selection
          queryIntent: entities?.queryIntent // Pass intent for prioritization
        },
        priority: 3,
        dependsOn: ['getCompanyInfo']
      });
    }

    // Step 4: Analyze content if topics are specified
    if (entities?.topics?.length > 0) {
      steps.push({
        type: 'search_content' as const,
        tool: 'getFilingSections',
        params: {
          identifier: entities?.companies?.[0] || entities?.tickers?.[0],
          sections: this.mapTopicsToSections(entities.topics),
          queryIntent: entities?.queryIntent // Pass intent for section prioritization
        },
        priority: 4,
        dependsOn: ['getRecentFilings']
      });
    }

    return {
      classification: { pattern: QueryPattern.COMPANY_SPECIFIC, confidence: 0.8, entities },
      strategy: 'mcp_primary',
      steps,
      expectedResultType: entities?.topics?.length > 0 ? 'content_sections' : 'company_data',
      estimatedDuration: 3000
    };
  }

  /**
   * Create plan for thematic queries
   */
  private createThematicPlan(
    entities: any,
    context?: QueryContext
  ): QueryPlan {
    const steps = [];

    // Use the new thematic search implementation
    steps.push({
      type: 'thematic_search' as const,
      tool: 'thematicSearch',
      params: {
        query: context?.originalQuery || '',
        formTypes: entities?.forms || ['10-K', '10-Q', '8-K'],
        industries: entities?.companies ? undefined : this.extractIndustries(entities),
        companies: entities?.tickers || entities?.companies,
        dateRange: entities?.timeRanges?.[0] ? this.mapTimeRangeToDateRange(entities.timeRanges[0]) : undefined,
        maxFilings: Math.min((context?.preferences?.maxResults || 50) * 2, 100), // Get more filings to search
        maxResults: context?.preferences?.maxResults || 50,
        sections: this.mapTopicsToSections(entities?.topics || []),
        includeAggregations: true
      },
      priority: 1
    });

    // No additional steps needed - thematic search is comprehensive
    return {
      classification: { pattern: QueryPattern.THEMATIC, confidence: 0.9, entities },
      strategy: 'thematic_search',
      steps,
      expectedResultType: 'thematic_results',
      estimatedDuration: 15000 // Thematic queries take longer
    };
  }
  
  /**
   * Extract industries from entity context
   */
  private extractIndustries(entities: any): string[] | undefined {
    const topics = entities?.topics || [];
    const industries = [];
    
    // Map topics to industries - basic implementation
    if (topics.some((t: string) => t.toLowerCase().includes('tech') || t.toLowerCase().includes('software') || t.toLowerCase().includes('artificial intelligence'))) {
      industries.push('technology');
    }
    if (topics.some((t: string) => t.toLowerCase().includes('bank') || t.toLowerCase().includes('financial'))) {
      industries.push('financial');
    }
    if (topics.some((t: string) => t.toLowerCase().includes('health') || t.toLowerCase().includes('pharma'))) {
      industries.push('healthcare');
    }
    if (topics.some((t: string) => t.toLowerCase().includes('energy') || t.toLowerCase().includes('oil'))) {
      industries.push('energy');
    }
    
    return industries.length > 0 ? industries : undefined;
  }
  
  /**
   * Map time range entities to date range format
   */
  private mapTimeRangeToDateRange(timeRange: any): { start: string; end: string } | undefined {
    if (!timeRange) return undefined;
    
    // Basic implementation - would be more sophisticated in production
    const now = new Date();
    let startDate = new Date();
    
    if (timeRange.includes('year')) {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (timeRange.includes('quarter')) {
      startDate.setMonth(now.getMonth() - 3);
    } else if (timeRange.includes('6 months')) {
      startDate.setMonth(now.getMonth() - 6);
    } else {
      // Default to past year
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  }

  /**
   * Create plan for hybrid queries
   */
  private createHybridPlan(
    entities: any,
    context?: QueryContext
  ): QueryPlan {
    // Combine company-specific and thematic approaches
    const companyPlan = this.createCompanySpecificPlan(entities, context);
    const thematicPlan = this.createThematicPlan(entities, context);

    return {
      classification: { pattern: QueryPattern.HYBRID, confidence: 0.8, entities },
      strategy: 'parallel',
      steps: [
        ...companyPlan.steps.map(step => ({ ...step, priority: step.priority! + 100 })),
        ...thematicPlan.steps.map(step => ({ ...step, priority: step.priority! + 200 }))
      ],
      expectedResultType: 'comparison',
      estimatedDuration: 10000
    };
  }

  /**
   * Create plan for metadata-only queries
   */
  private createMetadataPlan(
    entities: any,
    context?: QueryContext
  ): QueryPlan {
    const steps = [];

    // Simple filing list retrieval
    steps.push({
      type: 'list_filings' as const,
      tool: 'getRecentFilings',
      params: {
        identifier: entities?.companies?.[0] || entities?.tickers?.[0],
        form_type: entities?.forms?.[0],
        days: this.parseTimeRange(entities?.timeRanges?.[0]),
        limit: context?.preferences?.maxResults || 20
      },
      priority: 1
    });

    return {
      classification: { pattern: QueryPattern.METADATA_ONLY, confidence: 0.8, entities },
      strategy: 'mcp_primary',
      steps,
      expectedResultType: 'filing_list',
      estimatedDuration: 1500
    };
  }

  /**
   * Execute the query plan
   */
  private async executePlan(
    plan: QueryPlan,
    callbacks: {
      onToolCall: (toolName: string) => void;
      onSource: (source: { type: 'mcp' | 'sec_api' | 'custom'; endpoint?: string; timestamp: string }) => void;
      onError: (error: string) => void;
    }
  ): Promise<{ data: any; citations?: any[] }> {
    const results: Record<string, any> = {};
    const citations: any[] = [];

    // Sort steps by priority
    const sortedSteps = plan.steps.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    for (const step of sortedSteps) {
      try {
        // Check dependencies
        if (step.dependsOn) {
          const missingDeps = step.dependsOn.filter(dep => !results[dep]);
          if (missingDeps.length > 0) {
            throw new ExecutionError(`Missing dependencies: ${missingDeps.join(', ')}`);
          }
        }

        callbacks.onToolCall(step.tool);

        // Execute step based on tool
        let result;
        switch (step.tool) {
          case 'getCIKByTicker':
            result = await this.edgarClient.getCIKByTicker(step.params.ticker);
            callbacks.onSource({ 
              type: this.edgarClient.getDataSource() === 'MCP' ? 'mcp' : 'sec_api',
              timestamp: new Date().toISOString()
            });
            break;

          case 'getCompanyInfo':
            result = await this.edgarClient.getCompanyInfo(step.params.identifier);
            callbacks.onSource({ 
              type: this.edgarClient.getDataSource() === 'MCP' ? 'mcp' : 'sec_api',
              timestamp: new Date().toISOString()
            });
            break;

          case 'getRecentFilings':
            result = await this.edgarClient.getRecentFilings(step.params);
            callbacks.onSource({ 
              type: this.edgarClient.getDataSource() === 'MCP' ? 'mcp' : 'sec_api',
              timestamp: new Date().toISOString()
            });
            
            // Generate citations with proper SEC URLs for each filing
            if (result && Array.isArray(result)) {
              const cik = results.getCompanyInfo?.cik || step.params.identifier;
              result.forEach(filing => {
                if (filing.accessionNumber && cik) {
                  const cikNum = cik.replace(/^0+/, '');
                  const accessionNoHyphens = filing.accessionNumber.replace(/-/g, '');
                  // Use primaryDocument if available, otherwise use accession number with .txt extension
                  const document = filing.primaryDocument || `${filing.accessionNumber}.txt`;
                  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoHyphens}/${document}`;
                  
                  citations.push({
                    title: `${filing.form || 'Form'} - ${filing.filingDate}`,
                    url: filingUrl,
                    form: filing.form,
                    filingDate: filing.filingDate,
                    accessionNumber: filing.accessionNumber,
                    type: 'sec_filing'
                  });
                }
              });
            }
            break;

          case 'getFilingSections':
            // Get accession number from recent filings if not provided
            let accessionNumber = step.params.accession_number;
            if (!accessionNumber && results.getRecentFilings) {
              const filings = results.getRecentFilings;
              // Use intelligent filing selection based on query intent
              const relevantFiling = this.selectFilingByIntent(filings, step.params.queryIntent);
              
              if (relevantFiling) {
                accessionNumber = relevantFiling.accessionNumber || relevantFiling.accession_number;
              }
            }
            
            // Only call if we have the required parameters
            if (step.params.identifier && accessionNumber) {
              result = await this.edgarClient.getFilingSections({
                identifier: step.params.identifier,
                accession_number: accessionNumber,
                sections: step.params.sections
              });
              callbacks.onSource({ 
                type: this.edgarClient.getDataSource() === 'MCP' ? 'mcp' : 'sec_api',
                timestamp: new Date().toISOString()
              });
              // Generate citations for sections
              if (Array.isArray(result)) {
                citations.push(...this.generateCitationsFromSections(result, step.params));
              }
            } else {
              console.warn('getFilingSections skipped: missing identifier or accession_number', {
                identifier: step.params.identifier,
                accessionNumber,
                hasFilings: !!results.getRecentFilings
              });
              result = []; // Return empty array instead of throwing error
            }
            break;

          // Thematic search integration
          case 'thematicSearch':
            result = await thematicSearch(
              step.params as ThematicSearchParams,
              this.edgarClient,
              (progress: any) => {
                // Could add progress reporting here if needed
                console.log(`Thematic search progress: ${progress.operation} ${progress.completed}/${progress.total}`);
              }
            );
            callbacks.onSource({ 
              type: 'custom',
              endpoint: 'thematicSearch',
              timestamp: new Date().toISOString()
            });
            // Generate citations from thematic search results
            if (result?.results) {
              citations.push(...this.generateCitationsFromThematicResults(result.results));
            }
            break;

          // Legacy custom search tools (deprecated)
          case 'bulkFilingDiscovery':
          case 'crossDocumentSearch':
            throw new ExecutionError(`Tool '${step.tool}' is deprecated. Use 'thematicSearch' instead.`);

          default:
            throw new ExecutionError(`Unknown tool: ${step.tool}`);
        }

        results[step.tool] = result;

      } catch (error: any) {
        callbacks.onError(`Step ${step.tool} failed: ${error.message}`);
        
        // For non-critical errors, continue execution
        if (!step.tool.includes('resolve_company')) {
          results[step.tool] = null;
          continue;
        }
        
        throw error;
      }
    }

    return {
      data: this.consolidateResults(results, plan.expectedResultType),
      citations: citations.length > 0 ? citations : undefined
    };
  }

  /**
   * Helper: Parse time range expression
   */
  private parseTimeRange(timeExpression?: string): number | undefined {
    if (!timeExpression) return undefined;

    const expr = timeExpression.toLowerCase();
    
    // Extract number and unit
    const match = expr.match(/(\d+)\s*(year|quarter|month|week|day)/);
    if (!match) return undefined;

    const amount = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'year': return amount * 365;
      case 'quarter': return amount * 90;
      case 'month': return amount * 30;
      case 'week': return amount * 7;
      case 'day': return amount;
      default: return undefined;
    }
  }

  /**
   * Helper: Map topics to section names
   */
  private mapTopicsToSections(topics: string[]): string[] {
    const sectionMap: Record<string, string[]> = {
      'revenue': ['item_7', 'item_2'],
      'risk': ['item_1a'],
      'operations': ['item_1', 'item_7'],
      'governance': ['item_10', 'item_11'],
      'financial': ['item_8', 'item_7']
    };

    const sections = new Set<string>();
    for (const topic of topics) {
      const topicLower = topic.toLowerCase();
      for (const [key, sectionList] of Object.entries(sectionMap)) {
        if (topicLower.includes(key)) {
          sectionList.forEach(section => sections.add(section));
        }
      }
    }

    return Array.from(sections);
  }

  /**
   * Helper: Generate citations from sections
   */
  private generateCitationsFromSections(sections: any[], params: any): any[] {
    return sections.map((section, index) => ({
      filingUrl: `https://www.sec.gov/Archives/edgar/data/${params.identifier}/${params.accession_number}`,
      accession: params.accession_number,
      form: 'Unknown', // Would need to be passed from filing metadata
      filedAt: new Date().toISOString(), // Would need actual filing date
      section: section.title,
      snippet: section.content?.substring(0, 200) + '...',
      startChar: section.startOffset,
      endChar: section.endOffset
    }));
  }

  /**
   * Intelligent filing selection based on query intent
   */
  private selectFilingByIntent(filings: any[], queryIntent?: any): any {
    if (!filings || filings.length === 0) return null;
    
    // If no intent, use the previous logic as fallback
    if (!queryIntent) {
      return filings.find((f: any) => 
        f.form === '10-K' || f.form === '10-Q' || f.formType === '10-K' || f.formType === '10-Q'
      ) || filings[0];
    }
    
    const { intent, recommendedForms, priority } = queryIntent;
    
    console.log(`🎯 Selecting filing based on intent: ${intent} (priority: ${priority})`);
    console.log(`📋 Recommended forms: ${recommendedForms?.join(', ')}`);
    console.log(`📁 Available filings: ${filings.map(f => f.form || f.formType).join(', ')}`);
    
    // Filter filings by recommended form types
    let candidateFilings = filings;
    if (recommendedForms?.length > 0) {
      candidateFilings = filings.filter((f: any) => {
        const formType = f.form || f.formType;
        return recommendedForms.some((recommended: string) => 
          formType?.toUpperCase().includes(recommended.toUpperCase())
        );
      });
      
      // If no matches for recommended forms, fall back to all filings
      if (candidateFilings.length === 0) {
        candidateFilings = filings;
      }
    }
    
    // Sort by priority based on intent
    candidateFilings.sort((a: any, b: any) => {
      const aDate = new Date(a.filedAt || a.date || a.filing_date);
      const bDate = new Date(b.filedAt || b.date || b.filing_date);
      
      switch (priority) {
        case 'latest':
          // For revenue, earnings queries - get most recent data
          return bDate.getTime() - aDate.getTime(); // Latest first
          
        case 'recent':
          // For events, leadership changes - prefer recent but not necessarily latest
          return bDate.getTime() - aDate.getTime(); // Recent first
          
        case 'comprehensive':
          // For annual reports, risk factors - prefer 10-K then by recency
          const aForm = a.form || a.formType;
          const bForm = b.form || b.formType;
          
          if (aForm === '10-K' && bForm !== '10-K') return -1;
          if (bForm === '10-K' && aForm !== '10-K') return 1;
          
          return bDate.getTime() - aDate.getTime(); // Then by recency
          
        default:
          return bDate.getTime() - aDate.getTime(); // Default to latest
      }
    });
    
    const selectedFiling = candidateFilings[0];
    
    if (selectedFiling) {
      console.log(`✅ Selected filing: ${selectedFiling.form || selectedFiling.formType} filed ${selectedFiling.filedAt || selectedFiling.date}`);
    } else {
      console.log(`❌ No suitable filing found, using fallback`);
      return filings[0];
    }
    
    return selectedFiling;
  }

  /**
   * Generate citations from thematic search results
   */
  private generateCitationsFromThematicResults(results: any[]): any[] {
    return results.map(result => ({
      filingUrl: result.sourceUrl,
      accession: result.filing.accession,
      form: result.filing.form,
      filedAt: result.filing.filedAt,
      companyName: result.filing.companyName,
      ticker: result.filing.ticker,
      section: result.sectionTitle,
      snippet: result.snippet,
      startChar: result.snippetStart,
      endChar: result.snippetEnd,
      score: result.score,
      matchCount: result.matchCount,
      citationText: result.citationText
    }));
  }

  /**
   * Helper: Consolidate results based on expected type
   */
  private consolidateResults(results: Record<string, any>, expectedType: string): any {
    switch (expectedType) {
      case 'company_data':
        return {
          company: results.getCompanyInfo,
          cik: results.getCIKByTicker,
          filings: results.getRecentFilings
        };

      case 'filing_list':
        return {
          filings: results.getRecentFilings || []
        };

      case 'content_sections':
        return {
          company: results.getCompanyInfo,
          sections: results.getFilingSections || [],
          filings: results.getRecentFilings || []
        };

      case 'thematic_results':
        return {
          thematicSearch: results.thematicSearch
        };

      case 'aggregated_data':
        return {
          discovered: results.bulkFilingDiscovery,
          analysis: results.crossDocumentSearch
        };

      case 'comparison':
        // Combine company-specific and thematic results
        return {
          company_analysis: this.consolidateResults(results, 'content_sections'),
          thematic_analysis: this.consolidateResults(results, 'aggregated_data')
        };

      default:
        return results;
    }
  }
}