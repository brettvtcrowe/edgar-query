/**
 * EDGAR Answer Engine Chat API
 * Handles natural language queries about SEC filings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQueryOrchestrator } from '@/lib/edgar-client';
import { QueryPattern } from '@edgar-query/query-orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, stream = false }: ChatRequest = await request.json();
    
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1];
    if (userMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    const query = userMessage.content;
    console.log('Processing query:', query);

    // Get orchestrator instance
    const orchestrator = getQueryOrchestrator();

    // Execute query through orchestrator
    const result = await orchestrator.orchestrateQuery(query, {
      preferences: {
        maxResults: 10,
        responseFormat: 'detailed'
      }
    });

    console.log('Query result:', {
      success: result.success,
      pattern: result.pattern,
      executionTime: result.metadata.executionTime,
      toolsCalled: result.metadata.toolsCalled,
      sources: result.sources.map(s => s.type)
    });

    if (!result.success) {
      // Handle specific error types
      if (result.pattern === QueryPattern.THEMATIC) {
        return NextResponse.json({
          success: false,
          error: 'thematic_not_implemented',
          message: '🔄 Cross-company analysis is coming soon!',
          suggestion: 'Try asking about specific companies instead.',
          pattern: result.pattern,
          alternativeQueries: generateAlternativeQueries(query),
          metadata: result.metadata
        });
      }

      return NextResponse.json({
        success: false,
        error: 'query_failed',
        message: result.metadata.errors?.[0] || 'Failed to process query',
        pattern: result.pattern,
        metadata: result.metadata
      });
    }

    // Format successful response
    const response = {
      success: true,
      pattern: result.pattern,
      data: result.data,
      sources: result.sources,
      citations: result.citations,
      message: formatSuccessMessage(result),
      metadata: {
        executionTime: result.metadata.executionTime,
        toolsCalled: result.metadata.toolsCalled,
        dataSource: result.sources.map(s => s.type).join(', ')
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'internal_error',
        message: 'An internal error occurred while processing your query.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Generate alternative company-specific queries for thematic requests
 */
function generateAlternativeQueries(originalQuery: string): string[] {
  const query = originalQuery.toLowerCase();
  
  // Common company suggestions based on query content
  const suggestions: string[] = [];
  
  if (query.includes('revenue') || query.includes('earnings') || query.includes('financial')) {
    suggestions.push(
      "What was Apple's revenue last quarter?",
      "Show me Microsoft's latest earnings results",
      "Get Tesla's financial performance data"
    );
  }
  
  if (query.includes('risk') || query.includes('cybersecurity') || query.includes('threat')) {
    suggestions.push(
      "What are Apple's main risk factors?",
      "Show me Microsoft's cybersecurity disclosures",
      "What risks does Amazon mention in their filings?"
    );
  }
  
  if (query.includes('ai') || query.includes('artificial intelligence') || query.includes('technology')) {
    suggestions.push(
      "What does Microsoft say about AI in their filings?",
      "Show me Google's AI strategy disclosures",
      "What AI risks does NVIDIA mention?"
    );
  }
  
  if (query.includes('supply chain') || query.includes('operations')) {
    suggestions.push(
      "What supply chain issues does Apple mention?",
      "Show me Tesla's operational challenges",
      "What does Amazon say about logistics risks?"
    );
  }
  
  // Default suggestions if no specific topic detected
  if (suggestions.length === 0) {
    suggestions.push(
      "What was Apple's revenue in their latest 10-K?",
      "Show me Tesla's recent 8-K filings",
      "What are Microsoft's main business segments?",
      "Get Google's latest quarterly results"
    );
  }
  
  return suggestions.slice(0, 4); // Limit to 4 suggestions
}

/**
 * Format success message based on query result
 */
function formatSuccessMessage(result: any): string {
  const { pattern, data, metadata } = result;
  
  switch (pattern) {
    case QueryPattern.COMPANY_SPECIFIC:
      if (data.company) {
        return `📊 Found information for ${data.company.name} (${data.company.tickers?.[0]})`;
      }
      return '📊 Company information retrieved successfully';
      
    case QueryPattern.METADATA_ONLY:
      if (data.filings?.length) {
        return `📄 Found ${data.filings.length} filing(s)`;
      }
      return '📄 Filing information retrieved successfully';
      
    case QueryPattern.HYBRID:
      return '🔍 Analysis completed combining company-specific and market data';
      
    default:
      return '✅ Query processed successfully';
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  try {
    const orchestrator = getQueryOrchestrator();
    
    return NextResponse.json({
      status: 'ok',
      service: 'edgar-chat-api',
      timestamp: new Date().toISOString(),
      capabilities: {
        companyQueries: true,
        thematicQueries: false, // Coming soon
        hybridQueries: 'partial'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'edgar-chat-api',
        timestamp: new Date().toISOString(),
        error: 'Service initialization failed'
      },
      { status: 503 }
    );
  }
}