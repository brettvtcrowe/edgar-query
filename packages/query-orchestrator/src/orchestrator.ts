/**
 * Query orchestration engine
 * Routes queries between MCP service and custom tools based on classification
 */

import { EDGARClient } from '@edgar-query/edgar-client';
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
    private edgarClient: EDGARClient,
    private customSearchClient?: any // TODO: Will implement thematic search client
  ) {}

  /**
   * Main orchestration entry point
   */
  async orchestrateQuery(
    query: string, 
    context?: QueryContext
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const toolsCalled: string[] = [];
    const sources: Array<{ type: 'mcp' | 'sec_api' | 'custom'; endpoint?: string; timestamp: string }> = [];
    const errors: string[] = [];

    try {
      // Step 1: Classify the query
      const classification = this.classifier.classifyQuery(query, context);
      
      // Step 2: Create execution plan
      const plan = this.createExecutionPlan(classification, context);
      
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

    // Step 3: Get recent filings if needed
    if (entities?.forms?.length > 0 || entities?.timeRanges?.length > 0) {
      steps.push({
        type: 'list_filings' as const,
        tool: 'getRecentFilings',
        params: {
          identifier: entities?.companies?.[0] || entities?.tickers?.[0],
          form_type: entities?.forms?.[0],
          days: this.parseTimeRange(entities?.timeRanges?.[0]),
          limit: context?.preferences?.maxResults || 10
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
          sections: this.mapTopicsToSections(entities.topics)
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

    // For now, this will be a placeholder until we implement custom thematic search
    // In the future, this would use cross-document search capabilities
    
    steps.push({
      type: 'search_content' as const,
      tool: 'bulkFilingDiscovery', // TODO: Implement in thematic search
      params: {
        topics: entities?.topics || [],
        forms: entities?.forms || [],
        timeRange: entities?.timeRanges?.[0],
        limit: context?.preferences?.maxResults || 20
      },
      priority: 1
    });

    steps.push({
      type: 'aggregate_results' as const,
      tool: 'crossDocumentSearch', // TODO: Implement in thematic search
      params: {
        query: entities?.topics?.join(' ') || '',
        filings: 'from_discovery'
      },
      priority: 2,
      dependsOn: ['bulkFilingDiscovery']
    });

    return {
      classification: { pattern: QueryPattern.THEMATIC, confidence: 0.8, entities },
      strategy: 'custom_primary',
      steps,
      expectedResultType: 'aggregated_data',
      estimatedDuration: 8000
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
            break;

          case 'getFilingSections':
            // Only call if we have the required parameters
            if (step.params.identifier && step.params.accession_number) {
              result = await this.edgarClient.getFilingSections({
                identifier: step.params.identifier,
                accession_number: step.params.accession_number,
                sections: step.params.sections
              });
              callbacks.onSource({ 
                type: 'mcp',
                timestamp: new Date().toISOString()
              });
              // Generate citations for sections
              if (Array.isArray(result)) {
                citations.push(...this.generateCitationsFromSections(result, step.params));
              }
            } else {
              throw new ExecutionError('getFilingSections requires identifier and accession_number');
            }
            break;

          // Custom thematic search tools (TODO: Implement)
          case 'bulkFilingDiscovery':
          case 'crossDocumentSearch':
            throw new ExecutionError(`Custom search tool '${step.tool}' not yet implemented. This requires the thematic search package.`);

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