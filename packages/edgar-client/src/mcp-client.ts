/**
 * MCP Service HTTP Client
 * Communicates with the deployed EDGAR MCP HTTP bridge service
 */

import { z } from 'zod';
import type { 
  EDGARClientConfig, 
  MCPResponse, 
  Tool,
  CompanyInfo,
  Filing,
  FilingContent,
  Section,
  FinancialFact
} from './types.js';
import { MCPServiceError } from './types.js';

export class MCPServiceClient {
  private serviceUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(private config: EDGARClientConfig) {
    if (!config.mcpServiceUrl) {
      throw new Error('MCP service URL is required');
    }
    this.serviceUrl = config.mcpServiceUrl;
    this.apiKey = config.mcpApiKey;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Check if MCP service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.request('/health', 'GET');
      return response.status === 'ok' && response.mcp_connection === true;
    } catch {
      return false;
    }
  }

  /**
   * List all available MCP tools
   */
  async listTools(): Promise<Tool[]> {
    const response = await this.request('/tools', 'GET');
    return response.tools || [];
  }

  /**
   * Call any MCP tool by name
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    const response = await this.request('/tools/call', 'POST', {
      name,
      arguments: args
    });
    
    if (!response.success) {
      throw new MCPServiceError(
        response.error || 'Tool call failed',
        response
      );
    }
    
    return response.result;
  }

  /**
   * Get CIK by ticker symbol
   */
  async getCIKByTicker(ticker: string): Promise<string> {
    const result = await this.callTool('get_cik_by_ticker', { ticker });
    return result.cik || result;
  }

  /**
   * Get company information
   */
  async getCompanyInfo(identifier: string): Promise<CompanyInfo> {
    const result = await this.callTool('get_company_info', { identifier });
    return result;
  }

  /**
   * Search for companies
   */
  async searchCompanies(query: string): Promise<CompanyInfo[]> {
    const result = await this.callTool('search_companies', { query });
    return result.companies || result || [];
  }

  /**
   * Get recent filings
   */
  async getRecentFilings(params: {
    identifier?: string;
    form_type?: string;
    days?: number;
    limit?: number;
  }): Promise<Filing[]> {
    const result = await this.callTool('get_recent_filings', params);
    return result.filings || result || [];
  }

  /**
   * Get filing content
   */
  async getFilingContent(params: {
    identifier: string;
    accession_number: string;
  }): Promise<FilingContent> {
    const result = await this.callTool('get_filing_content', params);
    return result;
  }

  /**
   * Get filing sections
   */
  async getFilingSections(params: {
    identifier: string;
    accession_number: string;
    sections?: string[];
  }): Promise<Section[]> {
    const result = await this.callTool('get_filing_txt_sections', params);
    return result.sections || result || [];
  }

  /**
   * Get financial data
   */
  async getFinancials(params: {
    identifier: string;
    period?: string;
    limit?: number;
  }): Promise<FinancialFact[]> {
    const result = await this.callTool('get_financials', params);
    return result.facts || result || [];
  }

  /**
   * Analyze 8-K filing
   */
  async analyze8K(params: {
    identifier: string;
    accession_number: string;
  }): Promise<any> {
    return this.callTool('analyze_8k', params);
  }

  /**
   * Get insider transactions
   */
  async getInsiderTransactions(params: {
    identifier: string;
    days?: number;
    limit?: number;
  }): Promise<any[]> {
    const result = await this.callTool('get_recent_insider_transactions', params);
    return result.transactions || result || [];
  }

  /**
   * Internal request method
   */
  private async request(
    path: string, 
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<any> {
    const url = `${this.serviceUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new MCPServiceError(
          `MCP service error: ${response.status}`,
          { status: response.status, error }
        );
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new MCPServiceError('Request timeout', { timeout: this.timeout });
      }
      
      if (error instanceof MCPServiceError) {
        throw error;
      }
      
      throw new MCPServiceError(
        `Failed to connect to MCP service: ${error.message}`,
        { originalError: error }
      );
    }
  }
}