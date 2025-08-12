/**
 * EDGAR Tools Router
 * 
 * This router exposes all EDGAR MCP tools as HTTP REST endpoints.
 * It handles parameter validation, tool calling, and response formatting.
 */

import express from 'express';
import { z } from 'zod';
import { MCPClient } from './mcp-client.js';

// Request/Response schemas for EDGAR tools
const TickerToCIKRequestSchema = z.object({
  ticker: z.string().min(1).max(5).toUpperCase()
});

const RecentFilingsRequestSchema = z.object({
  cik: z.string().optional(),
  ticker: z.string().optional(),
  forms: z.array(z.string()).default(['10-K', '10-Q', '8-K']),
  limit: z.number().min(1).max(100).default(10),
  include_amends: z.boolean().default(false)
}).refine(data => data.cik || data.ticker, {
  message: "Either CIK or ticker must be provided"
});

const FilingContentRequestSchema = z.object({
  cik: z.string(),
  accession_number: z.string(),
  return_type: z.enum(['text', 'html', 'sections']).default('sections')
});

const CompanyInfoRequestSchema = z.object({
  cik: z.string().optional(),
  ticker: z.string().optional()
}).refine(data => data.cik || data.ticker, {
  message: "Either CIK or ticker must be provided"
});

const FilingSectionsRequestSchema = z.object({
  cik: z.string(),
  accession_number: z.string(),
  sections: z.array(z.string()).optional()
});

const CompanyFactsRequestSchema = z.object({
  cik: z.string()
});

const Analyze8KRequestSchema = z.object({
  cik: z.string(),
  accession_number: z.string(),
  analysis_type: z.enum(['summary', 'detailed', 'items']).default('summary')
});

export class EDGARToolsRouter {
  private mcpClient: MCPClient;
  private router: express.Router;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Root endpoint - list available tools
    this.router.get('/', this.listTools.bind(this));

    // Company Tools
    this.router.post('/company/ticker-to-cik', this.handleTickerToCIK.bind(this));
    this.router.post('/company/info', this.handleCompanyInfo.bind(this));
    this.router.post('/company/search', this.handleCompanySearch.bind(this));
    this.router.post('/company/facts', this.handleCompanyFacts.bind(this));

    // Filing Tools
    this.router.post('/filings/recent', this.handleRecentFilings.bind(this));
    this.router.post('/filings/content', this.handleFilingContent.bind(this));
    this.router.post('/filings/sections', this.handleFilingSections.bind(this));
    this.router.post('/filings/analyze-8k', this.handleAnalyze8K.bind(this));

    // Financial Tools (high-level endpoints)
    this.router.post('/financial/statements', this.handleFinancialStatements.bind(this));
    this.router.post('/financial/metrics', this.handleKeyMetrics.bind(this));
    this.router.post('/financial/segments', this.handleSegmentData.bind(this));
    this.router.post('/financial/compare-periods', this.handleComparePeriods.bind(this));

    // Insider Trading Tools
    this.router.post('/insider/transactions', this.handleInsiderTransactions.bind(this));
    this.router.post('/insider/summary', this.handleInsiderSummary.bind(this));
    this.router.post('/insider/form4-details', this.handleForm4Details.bind(this));

    // Utility Tools
    this.router.get('/tools/recommended', this.handleRecommendedTools.bind(this));
  }

  /**
   * List available tools
   */
  private async listTools(req: express.Request, res: express.Response): Promise<void> {
    try {
      const tools = this.mcpClient.getAvailableTools();
      res.json({
        success: true,
        tools: tools,
        count: tools.length,
        categories: {
          company: ['get_cik_by_ticker', 'get_company_info', 'search_companies', 'get_company_facts'],
          filing: ['get_recent_filings', 'get_filing_content', 'analyze_8k', 'get_filing_sections'],
          financial: ['get_financials', 'get_segment_data', 'get_key_metrics', 'compare_periods', 'discover_company_metrics', 'get_xbrl_concepts', 'discover_xbrl_concepts'],
          insider: ['get_insider_transactions', 'get_insider_summary', 'get_form4_details', 'analyze_form4_transactions', 'analyze_insider_sentiment'],
          utility: ['get_recommended_tools']
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to list tools',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle ticker to CIK conversion
   */
  private async handleTickerToCIK(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { ticker } = TickerToCIKRequestSchema.parse(req.body);
      
      const result = await this.mcpClient.callTool('get_cik_by_ticker', { ticker });
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'ticker-to-cik conversion');
    }
  }

  /**
   * Handle recent filings request
   */
  private async handleRecentFilings(req: express.Request, res: express.Response): Promise<void> {
    try {
      const params = RecentFilingsRequestSchema.parse(req.body);
      
      const result = await this.mcpClient.callTool('get_recent_filings', params);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'recent filings');
    }
  }

  /**
   * Handle filing content request
   */
  private async handleFilingContent(req: express.Request, res: express.Response): Promise<void> {
    try {
      const params = FilingContentRequestSchema.parse(req.body);
      
      const result = await this.mcpClient.callTool('get_filing_content', params);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'filing content');
    }
  }

  /**
   * Handle company info request
   */
  private async handleCompanyInfo(req: express.Request, res: express.Response): Promise<void> {
    try {
      const params = CompanyInfoRequestSchema.parse(req.body);
      
      const result = await this.mcpClient.callTool('get_company_info', params);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'company info');
    }
  }

  /**
   * Handle filing sections request
   */
  private async handleFilingSections(req: express.Request, res: express.Response): Promise<void> {
    try {
      const params = FilingSectionsRequestSchema.parse(req.body);
      
      const result = await this.mcpClient.callTool('get_filing_sections', params);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'filing sections');
    }
  }

  /**
   * Handle company facts request
   */
  private async handleCompanyFacts(req: express.Request, res: express.Response): Promise<void> {
    try {
      const params = CompanyFactsRequestSchema.parse(req.body);
      
      const result = await this.mcpClient.callTool('get_company_facts', params);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'company facts');
    }
  }

  /**
   * Handle 8-K analysis request
   */
  private async handleAnalyze8K(req: express.Request, res: express.Response): Promise<void> {
    try {
      const params = Analyze8KRequestSchema.parse(req.body);
      
      const result = await this.mcpClient.callTool('analyze_8k', params);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, '8-K analysis');
    }
  }

  // Placeholder handlers for other tools - will implement based on actual MCP tool names
  private async handleCompanySearch(req: express.Request, res: express.Response): Promise<void> {
    await this.callGenericTool('search_companies', req, res, 'company search');
  }

  private async handleFinancialStatements(req: express.Request, res: express.Response): Promise<void> {
    await this.callGenericTool('get_financials', req, res, 'financial statements');
  }

  private async handleKeyMetrics(req: express.Request, res: express.Response): Promise<void> {
    await this.callGenericTool('get_key_metrics', req, res, 'key metrics');
  }

  private async handleSegmentData(req: express.Request, res: express.Response): Promise<void> {
    await this.callGenericTool('get_segment_data', req, res, 'segment data');
  }

  private async handleComparePeriods(req: express.Request, res: express.Response): Promise<void> {
    await this.callGenericTool('compare_periods', req, res, 'period comparison');
  }

  private async handleInsiderTransactions(req: express.Request, res: express.Response): Promise<void> {
    await this.callGenericTool('get_insider_transactions', req, res, 'insider transactions');
  }

  private async handleInsiderSummary(req: express.Request, res: express.Response): Promise<void> {
    await this.callGenericTool('get_insider_summary', req, res, 'insider summary');
  }

  private async handleForm4Details(req: express.Request, res: express.Response): Promise<void> {
    await this.callGenericTool('get_form4_details', req, res, 'Form 4 details');
  }

  private async handleRecommendedTools(req: express.Request, res: express.Response): Promise<void> {
    await this.callGenericTool('get_recommended_tools', req, res, 'recommended tools');
  }

  /**
   * Generic tool caller
   */
  private async callGenericTool(
    toolName: string,
    req: express.Request,
    res: express.Response,
    operation: string
  ): Promise<void> {
    try {
      const result = await this.mcpClient.callTool(toolName, req.body);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, operation);
    }
  }

  /**
   * Error handler
   */
  private handleError(res: express.Response, error: unknown, operation: string): void {
    console.error(`Error in ${operation}:`, error);
    
    const status = error instanceof z.ZodError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(status).json({
      success: false,
      error: `Failed to ${operation}`,
      message,
      timestamp: new Date().toISOString(),
      ...(error instanceof z.ZodError && { validationErrors: error.errors })
    });
  }

  /**
   * Get router instance
   */
  getRouter(): express.Router {
    return this.router;
  }
}