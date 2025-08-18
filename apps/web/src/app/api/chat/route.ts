/**
 * EDGAR Answer Engine Chat API
 * Handles natural language queries about SEC filings
 */

import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

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
    // Dynamic imports to prevent build-time issues
    const { getQueryOrchestrator } = await import('@/lib/edgar-client');
    const { QueryPattern } = await import('@edgar-query/query-orchestrator');
    
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
      // Handle specific error types - thematic is now supported!
      if (result.pattern === 'thematic' && result.metadata.errors?.[0]?.includes('not implemented')) {
        return NextResponse.json({
          success: false,
          error: 'thematic_temporarily_unavailable',
          message: '⚠️ Cross-company analysis temporarily unavailable. Please try again.',
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

    // Generate natural language response using LLM
    const llmResponse = await generateAnswerFromData(query, result);
    
    // Format successful response
    const response = {
      success: true,
      pattern: result.pattern,
      answer: llmResponse, // The natural language answer
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
 * Generate natural language answer from query result data
 */
async function generateAnswerFromData(query: string, result: any): Promise<string> {
  try {
    // Skip LLM generation if no actual data was found
    if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return "I couldn't find specific information for your query. Please try rephrasing your question or asking about a specific company's filings.";
    }

    // Create context from the data
    const context = formatDataForLLM(result);
    
    const prompt = `You are an expert financial analyst specializing in SEC filings. Answer the user's question based ONLY on the provided SEC filing data.

User Question: "${query}"

SEC Filing Data:
${context}

Instructions:
- Provide a clear, comprehensive answer based on the data
- Include specific financial figures, dates, and filing references when available
- Mention which SEC forms the information comes from (10-K, 10-Q, 8-K, etc.)
- IMPORTANT: Include the SEC document URLs from the data above directly in your response
- When mentioning a filing, include its URL so users can click to view the source
- Be precise and factual - only use information from the provided data
- Format financial numbers clearly (e.g., $123.4 billion)
- If the data is incomplete, acknowledge limitations
- Do not make assumptions or add information not in the data

Response:`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'), // Cost-effective model for most queries
      prompt,
      temperature: 0.1, // Low temperature for factual accuracy
      maxTokens: 1000, // Reasonable response length
    });

    return text;
  } catch (error) {
    console.error('LLM generation error:', error);
    // Fallback to formatted data if LLM fails
    return formatDataAsText(result);
  }
}

/**
 * Format result data for LLM context
 */
function formatDataForLLM(result: any): string {
  const { pattern, data, sources, citations } = result;
  
  let context = '';
  
  // Add company information
  if (data.company) {
    context += `Company: ${data.company.name}\n`;
    if (data.company.tickers) {
      context += `Ticker: ${data.company.tickers.join(', ')}\n`;
    }
    if (data.company.industry) {
      context += `Industry: ${data.company.industry}\n`;
    }
    context += '\n';
  }
  
  // Add filings information
  if (data.filings && data.filings.length > 0) {
    context += 'Recent SEC Filings:\n';
    data.filings.slice(0, 10).forEach((filing: any, index: number) => {
      // Fix: Use 'form' instead of 'formType'
      const formType = filing.form || filing.formType || 'Unknown Form';
      context += `${index + 1}. Form ${formType} - Filed ${filing.filingDate}\n`;
      if (filing.reportDate) context += `   Report Date: ${filing.reportDate}\n`;
      if (filing.period) context += `   Period: ${filing.period}\n`;
      
      // Add direct SEC filing URL if we have accession number
      if (filing.accessionNumber && data.company?.cik && filing.primaryDocument) {
        const cikNum = data.company.cik.replace(/^0+/, '');
        const accessionNoHyphens = filing.accessionNumber.replace(/-/g, '');
        // primaryDocument is always provided by SEC API
        const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoHyphens}/${filing.primaryDocument}`;
        context += `   URL: ${filingUrl}\n`;
      }
    });
    context += '\n';
  }
  
  // Add sections content if available
  if (data.sections && data.sections.length > 0) {
    context += 'SEC Filing Content:\n';
    data.sections.forEach((section: any, index: number) => {
      context += `\n${section.title}:\n`;
      // Strip HTML tags and clean up the content
      const cleanContent = section.content
        .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
        .replace(/\s+/g, ' ')      // Normalize whitespace
        .trim();
      context += cleanContent.slice(0, 3000) + '\n'; // Limit to 3000 chars per section
    });
    context += '\n';
  }
  
  // Add specific content if available (legacy)
  if (data.content) {
    context += 'Filing Content:\n';
    context += data.content + '\n';
  }
  
  // Add thematic search results
  if (pattern === 'thematic' && data.companies) {
    context += `Cross-Company Analysis Results:\n`;
    context += `Found information across ${data.companies.length} companies:\n`;
    data.companies.forEach((company: any, index: number) => {
      context += `${index + 1}. ${company.name} (${company.ticker || 'No ticker'})\n`;
    });
    context += '\n';
  }
  
  // Add citations
  if (citations && citations.length > 0) {
    context += 'Data Sources:\n';
    citations.forEach((citation: any, index: number) => {
      context += `${index + 1}. ${citation.title || citation.formType || 'SEC Filing'}\n`;
      if (citation.url) context += `   URL: ${citation.url}\n`;
      if (citation.excerpt) context += `   Excerpt: ${citation.excerpt.slice(0, 200)}...\n`;
    });
  }
  
  return context;
}

/**
 * Format data as plain text fallback
 */
function formatDataAsText(result: any): string {
  const { data } = result;
  
  if (data.company) {
    let response = `Found information for ${data.company.name}`;
    if (data.company.tickers) {
      response += ` (${data.company.tickers.join(', ')})`;
    }
    response += '.\n\n';
    
    if (data.filings?.length) {
      response += `Recent filings include ${data.filings.length} SEC forms. `;
      const formType = data.filings[0].form || data.filings[0].formType || 'form';
      response += `The most recent filing is a ${formType} filed on ${data.filings[0].filingDate}.`;
    }
    
    return response;
  }
  
  return 'I found some information related to your query, but I need more specific details to provide a complete answer. Please try asking about a specific company or filing type.';
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
    case 'company-specific':
      if (data.company) {
        return `📊 Found information for ${data.company.name} (${data.company.tickers?.[0]})`;
      }
      return '📊 Company information retrieved successfully';
      
    case 'metadata-only':
      if (data.filings?.length) {
        return `📄 Found ${data.filings.length} filing(s)`;
      }
      return '📄 Filing information retrieved successfully';
      
    case 'hybrid':
      return '🔍 Analysis completed combining company-specific and market data';
      
    case 'thematic':
      if (data.companies?.length) {
        return `🌐 Found information across ${data.companies.length} companies`;
      }
      if (data.filings?.length) {
        return `🌐 Cross-company analysis complete: ${data.filings.length} filings reviewed`;
      }
      return '🌐 Cross-company thematic analysis completed';
      
    default:
      return '✅ Query processed successfully';
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  try {
    // Simple health check without initializing complex dependencies
    return NextResponse.json({
      status: 'ok',
      service: 'edgar-chat-api',
      timestamp: new Date().toISOString(),
      capabilities: {
        companyQueries: true,
        thematicQueries: true, // NOW AVAILABLE!
        hybridQueries: 'partial'
      },
      environment: process.env.NODE_ENV,
      hasRequiredEnvVars: {
        mcpServiceUrl: !!process.env.EDGAR_MCP_SERVICE_URL,
        mcpApiKey: !!process.env.EDGAR_MCP_API_KEY,
        secUserAgent: !!process.env.SEC_USER_AGENT
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