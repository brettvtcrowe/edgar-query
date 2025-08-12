/**
 * EDGAR MCP Client - Direct Integration
 * 
 * This client spawns and communicates with the public EDGAR MCP Docker image
 * directly via stdin/stdout, providing a clean TypeScript API for all EDGAR tools.
 */

import { spawn, ChildProcess } from 'child_process';
import { z } from 'zod';

// MCP Protocol Schemas
const MCPRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.any()).optional()
});

const MCPResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
});

export type MCPRequest = z.infer<typeof MCPRequestSchema>;
export type MCPResponse = z.infer<typeof MCPResponseSchema>;

export interface EDGARMCPConfig {
  userAgent: string;
  dockerImage?: string;
  timeout?: number;
}

/**
 * EDGAR MCP Client - Simplified Direct Integration
 */
export class EDGARMCPClient {
  private config: EDGARMCPConfig;
  private process: ChildProcess | null = null;
  private connected = false;
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(config: EDGARMCPConfig) {
    this.config = {
      dockerImage: 'sha256:16f40558c81c4e4496e02df704fe1cf5d4e65f8ed48af805bf6eee43f8afb32b',
      timeout: 30000,
      ...config
    };
  }

  /**
   * Connect to EDGAR MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Spawn the EDGAR MCP Docker container
      this.process = spawn('docker', [
        'run',
        '--rm',
        '--interactive',
        '--env', `SEC_EDGAR_USER_AGENT=${this.config.userAgent}`,
        this.config.dockerImage!
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.setupProcessHandlers();
      
      // Wait for process to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Initialize MCP session
      await this.initialize();
      
      this.connected = true;
      console.log('✅ EDGAR MCP Client connected');
    } catch (error) {
      console.error('❌ Failed to connect to EDGAR MCP:', error);
      throw error;
    }
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.stdout?.on('data', (data) => {
      this.handleResponse(data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      // MCP server logs go to stderr, filter out noise
      const logData = data.toString();
      if (!logData.includes('Identity of the Edgar REST client')) {
        console.error('EDGAR MCP:', logData);
      }
    });

    this.process.on('error', (error) => {
      console.error('EDGAR MCP Process error:', error);
      this.connected = false;
    });

    this.process.on('exit', (code) => {
      console.log(`EDGAR MCP exited with code ${code}`);
      this.connected = false;
    });
  }

  /**
   * Handle MCP response
   */
  private handleResponse(data: string): void {
    const lines = data.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const response = JSON.parse(line);
        const validatedResponse = MCPResponseSchema.parse(response);
        
        const pending = this.pendingRequests.get(validatedResponse.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(validatedResponse.id);
          
          if (validatedResponse.error) {
            pending.reject(new Error(`EDGAR MCP Error: ${validatedResponse.error.message}`));
          } else {
            pending.resolve(validatedResponse.result);
          }
        }
      } catch (error) {
        // Ignore non-JSON lines (likely logs)
        if (line.includes('{') && line.includes('}')) {
          console.error('Failed to parse MCP response:', error, 'Data:', line);
        }
      }
    }
  }

  /**
   * Send MCP request
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process?.stdin) {
      throw new Error('EDGAR MCP client not connected');
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`EDGAR MCP timeout: ${method}`));
      }, this.config.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const requestString = JSON.stringify(request) + '\n';
      this.process!.stdin!.write(requestString);
    });
  }

  /**
   * Initialize MCP session
   */
  private async initialize(): Promise<void> {
    // Step 1: Initialize
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {}
      },
      clientInfo: {
        name: 'edgar-answer-engine',
        version: '1.0.0'
      }
    });

    // Step 2: Send initialized notification (required by MCP protocol)
    await this.sendNotification('notifications/initialized');
  }

  /**
   * Send MCP notification (no response expected)
   */
  private async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error('EDGAR MCP client not connected');
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };

    const notificationString = JSON.stringify(notification) + '\n';
    this.process!.stdin!.write(notificationString);
    
    // Small delay to allow notification processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get ticker CIK
   */
  async getTickerCIK(ticker: string): Promise<any> {
    return this.sendRequest('tools/call', {
      name: 'get_cik_by_ticker',
      arguments: { ticker }
    });
  }

  /**
   * Get recent filings
   */
  async getRecentFilings(params: {
    cik?: string;
    ticker?: string;
    forms?: string[];
    limit?: number;
  }): Promise<any> {
    return this.sendRequest('tools/call', {
      name: 'get_recent_filings',
      arguments: {
        cik: params.cik,
        ticker: params.ticker,
        forms: params.forms || ['10-K', '10-Q', '8-K'],
        limit: params.limit || 10
      }
    });
  }

  /**
   * Get filing content with sections
   */
  async getFilingContent(params: {
    cik: string;
    accession_number: string;
    return_type?: 'text' | 'html' | 'sections';
  }): Promise<any> {
    return this.sendRequest('tools/call', {
      name: 'get_filing_content',
      arguments: {
        cik: params.cik,
        accession_number: params.accession_number,
        return_type: params.return_type || 'sections'
      }
    });
  }

  /**
   * Get filing sections
   */
  async getFilingSections(params: {
    cik: string;
    accession_number: string;
    sections?: string[];
  }): Promise<any> {
    return this.sendRequest('tools/call', {
      name: 'get_filing_sections',
      arguments: {
        cik: params.cik,
        accession_number: params.accession_number,
        sections: params.sections
      }
    });
  }

  /**
   * Get company info
   */
  async getCompanyInfo(params: {
    cik?: string;
    ticker?: string;
  }): Promise<any> {
    return this.sendRequest('tools/call', {
      name: 'get_company_info',
      arguments: params
    });
  }

  /**
   * Analyze 8-K filing
   */
  async analyze8K(params: {
    cik: string;
    accession_number: string;
    analysis_type?: 'summary' | 'detailed' | 'items';
  }): Promise<any> {
    return this.sendRequest('tools/call', {
      name: 'analyze_8k',
      arguments: {
        cik: params.cik,
        accession_number: params.accession_number,
        analysis_type: params.analysis_type || 'summary'
      }
    });
  }

  /**
   * Get list of available tools
   */
  async listTools(): Promise<any> {
    return this.sendRequest('tools/list');
  }

  /**
   * Call any tool by name
   */
  async callTool(toolName: string, arguments_: any = {}): Promise<any> {
    return this.sendRequest('tools/call', {
      name: toolName,
      arguments: arguments_
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect from EDGAR MCP
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    // Clear pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client disconnected'));
    }
    this.pendingRequests.clear();

    // Kill process
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }

    this.connected = false;
    console.log('✅ EDGAR MCP Client disconnected');
  }
}

/**
 * Factory function to create and connect EDGAR MCP client
 */
export async function createEDGARMCPClient(userAgent: string): Promise<EDGARMCPClient> {
  const client = new EDGARMCPClient({ userAgent });
  await client.connect();
  return client;
}