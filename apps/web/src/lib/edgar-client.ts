/**
 * EDGAR Client Configuration for Production
 */

import { EDGARClient } from '@edgar-query/edgar-client';
import { QueryOrchestrator } from '@edgar-query/query-orchestrator';

// Singleton EDGAR client instance
let edgarClient: EDGARClient | null = null;
let queryOrchestrator: QueryOrchestrator | null = null;

/**
 * Get configured EDGAR client instance
 */
export function getEDGARClient(): EDGARClient {
  // Only initialize during runtime, not build time
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    // Server-side runtime in production
    if (!edgarClient) {
      edgarClient = new EDGARClient({
        // MCP service configuration (primary)
        mcpServiceUrl: process.env.EDGAR_MCP_SERVICE_URL,
        mcpApiKey: process.env.EDGAR_MCP_API_KEY,
        
        // SEC API configuration (fallback)
        secUserAgent: process.env.SEC_USER_AGENT || 'EdgarAnswerEngine/1.0 (support@edgarquery.com)',
        
        // Client configuration
        enableFallback: true,
        cacheEnabled: true,
        cacheTTL: 300000, // 5 minutes
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
      });
    }
  } else if (typeof window === 'undefined') {
    // Build time or development - return a mock/placeholder
    console.log('EDGAR Client: Build time initialization skipped');
    return {} as EDGARClient;
  }
  
  return edgarClient || ({} as EDGARClient);
}

/**
 * Get configured Query Orchestrator instance
 */
export function getQueryOrchestrator(): QueryOrchestrator {
  // Only initialize during runtime, not build time
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    if (!queryOrchestrator) {
      const client = getEDGARClient();
      queryOrchestrator = new QueryOrchestrator(client);
    }
    return queryOrchestrator;
  } else if (typeof window === 'undefined') {
    // Build time - return mock
    console.log('Query Orchestrator: Build time initialization skipped');
    return {} as QueryOrchestrator;
  }
  
  return queryOrchestrator || ({} as QueryOrchestrator);
}

/**
 * Health check for EDGAR services
 */
export async function checkEDGARHealth(): Promise<{
  client: boolean;
  mcp: boolean;
  dataSource: 'MCP' | 'SEC_API';
}> {
  try {
    const client = getEDGARClient();
    
    // Check MCP availability
    const mcpAvailable = await client.checkMCPAvailability();
    
    // Test basic functionality
    await client.getCIKByTicker('AAPL');
    
    return {
      client: true,
      mcp: mcpAvailable,
      dataSource: client.getDataSource()
    };
  } catch (error) {
    console.error('EDGAR health check failed:', error);
    return {
      client: false,
      mcp: false,
      dataSource: 'SEC_API'
    };
  }
}

/**
 * Configuration validation
 */
export function validateEDGARConfig(): {
  valid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check required environment variables
  if (!process.env.SEC_USER_AGENT) {
    issues.push('SEC_USER_AGENT environment variable is required');
  }
  
  // Check optional MCP configuration
  if (!process.env.EDGAR_MCP_SERVICE_URL) {
    warnings.push('EDGAR_MCP_SERVICE_URL not set - will use SEC API fallback only');
  }
  
  if (process.env.EDGAR_MCP_SERVICE_URL && !process.env.EDGAR_MCP_API_KEY) {
    warnings.push('EDGAR_MCP_API_KEY not set - MCP service may reject requests');
  }
  
  // Validate SEC User Agent format
  const userAgent = process.env.SEC_USER_AGENT;
  if (userAgent && !userAgent.includes('@')) {
    warnings.push('SEC_USER_AGENT should include contact email for SEC compliance');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}