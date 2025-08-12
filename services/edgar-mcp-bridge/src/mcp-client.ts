/**
 * MCP Client for EDGAR MCP Server
 * 
 * This client handles communication with the EDGAR MCP server running in Docker.
 * It manages the Docker container lifecycle and MCP protocol communication.
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

const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.any())
});

export type MCPRequest = z.infer<typeof MCPRequestSchema>;
export type MCPResponse = z.infer<typeof MCPResponseSchema>;
export type MCPTool = z.infer<typeof MCPToolSchema>;

export interface MCPClientConfig {
  transport: 'docker' | 'subprocess';
  dockerImage?: string;
  pythonPath?: string;
  userAgent: string;
  timeout?: number;
}

export class MCPClient {
  private config: MCPClientConfig;
  private process: ChildProcess | null = null;
  private connected = false;
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private availableTools: MCPTool[] = [];

  constructor(config: MCPClientConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
  }

  /**
   * Connect to the EDGAR MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      if (this.config.transport === 'docker') {
        await this.connectDocker();
      } else {
        await this.connectSubprocess();
      }

      // Initialize MCP session
      await this.initialize();
      
      // List available tools
      await this.listTools();
      
      this.connected = true;
      console.log(`✅ MCP Client connected with ${this.availableTools.length} tools available`);
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      throw error;
    }
  }

  /**
   * Connect via Docker
   */
  private async connectDocker(): Promise<void> {
    const dockerArgs = [
      'run',
      '--rm',
      '--interactive',
      '--env', `SEC_EDGAR_USER_AGENT=${this.config.userAgent}`,
      this.config.dockerImage || 'stefanoamorelli/sec-edgar-mcp:latest'
    ];

    this.process = spawn('docker', dockerArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.setupProcessHandlers();
  }

  /**
   * Connect via subprocess (fallback)
   */
  private async connectSubprocess(): Promise<void> {
    // This would run the Python MCP server directly
    // For now, focus on Docker approach
    throw new Error('Subprocess transport not yet implemented');
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
      console.error('MCP Server Error:', data.toString());
    });

    this.process.on('error', (error) => {
      console.error('Process error:', error);
      this.connected = false;
    });

    this.process.on('exit', (code) => {
      console.log(`MCP server exited with code ${code}`);
      this.connected = false;
    });
  }

  /**
   * Handle response from MCP server
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
            pending.reject(new Error(validatedResponse.error.message));
          } else {
            pending.resolve(validatedResponse.result);
          }
        }
      } catch (error) {
        console.error('Failed to parse MCP response:', error, 'Data:', line);
      }
    }
  }

  /**
   * Send request to MCP server
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.connected || !this.process?.stdin) {
      throw new Error('MCP client not connected');
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
        reject(new Error(`Request timeout: ${method}`));
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
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true
        },
        sampling: {}
      },
      clientInfo: {
        name: 'edgar-answer-engine',
        version: '1.0.0'
      }
    });
  }

  /**
   * List available tools
   */
  private async listTools(): Promise<void> {
    const result = await this.sendRequest('tools/list');
    this.availableTools = result.tools || [];
  }

  /**
   * Get available tools
   */
  getAvailableTools(): MCPTool[] {
    return this.availableTools;
  }

  /**
   * Call a tool
   */
  async callTool(name: string, arguments_: any = {}): Promise<any> {
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: arguments_
    });
    return result;
  }

  /**
   * Disconnect from MCP server
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
    console.log('✅ MCP Client disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}