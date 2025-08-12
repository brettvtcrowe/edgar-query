/**
 * EDGAR Client - Main entry point
 * Provides unified interface with automatic fallback between MCP service and direct SEC API
 */

import { MCPServiceClient } from './mcp-client.js';
import { SECAPIClient } from './sec-client.js';
import type { 
  EDGARClientConfig,
  CompanyInfo,
  Filing,
  FilingContent,
  Section,
  FinancialFact,
  Tool
} from './types.js';
import { EDGARClientError } from './types.js';

export * from './types.js';

export class EDGARClient {
  private mcpClient?: MCPServiceClient;
  private secClient: SECAPIClient;
  private useMCP = false;
  private cache = new Map<string, { data: any; expires: number }>();
  private cacheEnabled: boolean;
  private cacheTTL: number;

  constructor(private config: EDGARClientConfig) {
    // Initialize SEC client (always available as fallback)
    this.secClient = new SECAPIClient(config);
    
    // Initialize MCP client if configured
    if (config.mcpServiceUrl) {
      this.mcpClient = new MCPServiceClient(config);
    }
    
    // Cache configuration
    this.cacheEnabled = config.cacheEnabled !== false;
    this.cacheTTL = config.cacheTTL || 300000; // 5 minutes default
    
    // Check MCP availability on initialization
    this.checkMCPAvailability();
  }

  /**
   * Check and update MCP service availability
   */
  async checkMCPAvailability(): Promise<boolean> {
    if (!this.mcpClient) {
      this.useMCP = false;
      return false;
    }
    
    try {
      this.useMCP = await this.mcpClient.isAvailable();
      if (this.useMCP) {
        console.log('✅ EDGAR MCP service is available');
      }
      return this.useMCP;
    } catch (error) {
      console.warn('⚠️ EDGAR MCP service unavailable, using SEC API fallback');
      this.useMCP = false;
      return false;
    }
  }

  /**
   * Get CIK by ticker symbol
   */
  async getCIKByTicker(ticker: string): Promise<string> {
    const cacheKey = `cik:${ticker.toUpperCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      let result: string;
      
      if (this.useMCP && this.mcpClient) {
        result = await this.mcpClient.getCIKByTicker(ticker);
      } else {
        result = await this.secClient.getCIKByTicker(ticker);
      }
      
      this.setCache(cacheKey, result, this.cacheTTL * 10); // Cache for longer
      return result;
      
    } catch (error) {
      // If MCP fails, try fallback
      if (this.useMCP && this.config.enableFallback !== false) {
        console.warn('MCP failed, trying SEC API fallback');
        this.useMCP = false;
        return this.getCIKByTicker(ticker);
      }
      throw this.wrapError(error);
    }
  }

  /**
   * Get company information
   */
  async getCompanyInfo(identifier: string): Promise<CompanyInfo> {
    const cacheKey = `company:${identifier}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      let result: CompanyInfo;
      
      if (this.useMCP && this.mcpClient) {
        result = await this.mcpClient.getCompanyInfo(identifier);
      } else {
        result = await this.secClient.getCompanyInfo(identifier);
      }
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      if (this.useMCP && this.config.enableFallback !== false) {
        console.warn('MCP failed, trying SEC API fallback');
        this.useMCP = false;
        return this.getCompanyInfo(identifier);
      }
      throw this.wrapError(error);
    }
  }

  /**
   * Search for companies
   */
  async searchCompanies(query: string): Promise<CompanyInfo[]> {
    const cacheKey = `search:${query}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      let result: CompanyInfo[];
      
      if (this.useMCP && this.mcpClient) {
        result = await this.mcpClient.searchCompanies(query);
      } else {
        result = await this.secClient.searchCompanies(query);
      }
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      if (this.useMCP && this.config.enableFallback !== false) {
        console.warn('MCP failed, trying SEC API fallback');
        this.useMCP = false;
        return this.searchCompanies(query);
      }
      throw this.wrapError(error);
    }
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
    const cacheKey = `filings:${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      let result: Filing[];
      
      if (this.useMCP && this.mcpClient) {
        result = await this.mcpClient.getRecentFilings(params);
      } else {
        result = await this.secClient.getRecentFilings(params);
      }
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      if (this.useMCP && this.config.enableFallback !== false) {
        console.warn('MCP failed, trying SEC API fallback');
        this.useMCP = false;
        return this.getRecentFilings(params);
      }
      throw this.wrapError(error);
    }
  }

  /**
   * Get filing content
   */
  async getFilingContent(params: {
    identifier: string;
    accession_number: string;
  }): Promise<FilingContent> {
    const cacheKey = `content:${params.identifier}:${params.accession_number}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      let result: FilingContent;
      
      if (this.useMCP && this.mcpClient) {
        result = await this.mcpClient.getFilingContent(params);
      } else {
        result = await this.secClient.getFilingContent(params);
      }
      
      this.setCache(cacheKey, result, this.cacheTTL * 4); // Cache longer for content
      return result;
      
    } catch (error) {
      if (this.useMCP && this.config.enableFallback !== false) {
        console.warn('MCP failed, trying SEC API fallback');
        this.useMCP = false;
        return this.getFilingContent(params);
      }
      throw this.wrapError(error);
    }
  }

  /**
   * Get filing sections (MCP only)
   */
  async getFilingSections(params: {
    identifier: string;
    accession_number: string;
    sections?: string[];
  }): Promise<Section[]> {
    if (!this.useMCP || !this.mcpClient) {
      throw new EDGARClientError(
        'Filing sections extraction requires MCP service',
        'MCP_REQUIRED'
      );
    }
    
    const cacheKey = `sections:${params.identifier}:${params.accession_number}:${params.sections?.join(',')}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const result = await this.mcpClient.getFilingSections(params);
      this.setCache(cacheKey, result, this.cacheTTL * 4);
      return result;
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Get financial facts
   */
  async getFinancialFacts(
    identifier: string,
    params?: { period?: string; limit?: number }
  ): Promise<FinancialFact[]> {
    const cacheKey = `facts:${identifier}:${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      let result: FinancialFact[];
      
      if (this.useMCP && this.mcpClient) {
        result = await this.mcpClient.getFinancials({ identifier, ...params });
      } else {
        result = await this.secClient.getFinancialFacts(identifier);
      }
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      if (this.useMCP && this.config.enableFallback !== false) {
        console.warn('MCP failed, trying SEC API fallback');
        this.useMCP = false;
        return this.getFinancialFacts(identifier, params);
      }
      throw this.wrapError(error);
    }
  }

  /**
   * Analyze 8-K filing (MCP only)
   */
  async analyze8K(params: {
    identifier: string;
    accession_number: string;
  }): Promise<any> {
    if (!this.useMCP || !this.mcpClient) {
      throw new EDGARClientError(
        '8-K analysis requires MCP service',
        'MCP_REQUIRED'
      );
    }
    
    try {
      return await this.mcpClient.analyze8K(params);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Get insider transactions (MCP only)
   */
  async getInsiderTransactions(params: {
    identifier: string;
    days?: number;
    limit?: number;
  }): Promise<any[]> {
    if (!this.useMCP || !this.mcpClient) {
      throw new EDGARClientError(
        'Insider transaction data requires MCP service',
        'MCP_REQUIRED'
      );
    }
    
    const cacheKey = `insider:${params.identifier}:${params.days}:${params.limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const result = await this.mcpClient.getInsiderTransactions(params);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * List available tools (MCP only)
   */
  async listTools(): Promise<Tool[]> {
    if (!this.mcpClient) {
      return []; // No tools available without MCP
    }
    
    try {
      return await this.mcpClient.listTools();
    } catch (error) {
      console.warn('Failed to list MCP tools');
      return [];
    }
  }

  /**
   * Call any MCP tool directly
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.useMCP || !this.mcpClient) {
      throw new EDGARClientError(
        'Direct tool calls require MCP service',
        'MCP_REQUIRED'
      );
    }
    
    try {
      return await this.mcpClient.callTool(name, args);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Get current data source
   */
  getDataSource(): 'MCP' | 'SEC_API' {
    return this.useMCP ? 'MCP' : 'SEC_API';
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cache helpers
   */
  private getFromCache(key: string): any | null {
    if (!this.cacheEnabled) return null;
    
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache(key: string, data: any, ttl?: number): void {
    if (!this.cacheEnabled) return;
    
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl || this.cacheTTL)
    });
  }

  /**
   * Error wrapper
   */
  private wrapError(error: any): Error {
    if (error instanceof EDGARClientError) {
      return error;
    }
    
    return new EDGARClientError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      error
    );
  }
}

// Default export
export default EDGARClient;