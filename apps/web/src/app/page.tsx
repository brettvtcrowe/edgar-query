'use client';

import { useState } from 'react';
import React from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ChatResponse {
  success: boolean;
  pattern?: string;
  answer?: string;  // LLM-generated response
  message?: string; // Status message
  data?: any;
  sources?: any[];
  citations?: any[];
  metadata?: any;
  error?: string;
  suggestion?: string;
  alternativeQueries?: string[];
}

// Component to render text with clickable URLs
function MessageContent({ content }: { content: string }) {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split content by URLs and create elements
  const parts = content.split(urlRegex);
  
  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is a URL
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline break-all"
            >
              {part}
            </a>
          );
        }
        // Regular text
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const exampleQueries = [
    "What was Apple's revenue in their latest 10-K?",
    "Show me Tesla's recent 8-K filings",
    "What are Microsoft's main risk factors?",
    "Get NVIDIA's quarterly earnings results",
    "List Amazon's recent SEC filings"
  ];

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [userMessage]
        }),
      });

      const result: ChatResponse = await response.json();

      let assistantContent = '';
      let assistantMetadata = result.metadata;

      if (result.success) {
        // Use LLM-generated answer if available, otherwise fall back to formatted response
        if (result.answer) {
          assistantContent = result.answer;
          // Don't add redundant sources or execution time - the answer should have everything
          
        } else {
          // Fallback to formatted metadata response
          assistantContent = `${result.message || 'Query completed successfully'}\n\n`;
          
          if (result.data?.company) {
            assistantContent += `**Company**: ${result.data.company.name}`;
            if (result.data.company.tickers?.length) {
              assistantContent += ` (${result.data.company.tickers.join(', ')})`;
            }
            assistantContent += '\n';
            if (result.data.company.sicDescription) {
              assistantContent += `**Industry**: ${result.data.company.sicDescription}\n`;
            }
          }

          if (result.data?.filings?.length) {
            assistantContent += `\n**Recent Filings** (${result.data.filings.length}):\n`;
            result.data.filings.slice(0, 5).forEach((filing: any) => {
              assistantContent += `• ${filing.form} - Filed ${new Date(filing.filingDate).toLocaleDateString()}\n`;
            });
          }

          // Don't add redundant sources or execution time
        }

      } else {
        // Handle errors gracefully
        if (result.error === 'thematic_not_implemented') {
          assistantContent = `${result.message}\n\n${result.suggestion}\n\n**Try these instead:**\n`;
          result.alternativeQueries?.forEach((query, index) => {
            assistantContent += `${index + 1}. ${query}\n`;
          });
        } else {
          assistantContent = `❌ ${result.message || 'Sorry, I encountered an error processing your query.'}`;
          
          if (result.error === 'query_failed') {
            assistantContent += '\n\nTip: Try asking about a specific company (e.g., "Apple", "AAPL") and specific information you\'re looking for.';
          }
        }
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        metadata: assistantMetadata
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Sorry, I encountered a technical error. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const useExampleQuery = (query: string) => {
    setInput(query);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">EDGAR Answer Engine</h1>
          <p className="text-gray-600 mt-2">Ask questions about SEC filings in natural language</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* Example Queries */}
        {messages.length === 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Try these example queries:</h2>
            <div className="grid gap-3">
              {exampleQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => useExampleQuery(query)}
                  className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-blue-600">"{query}"</span>
                </button>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Currently supported:</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>✅ Company-specific queries (Apple, Microsoft, Tesla, etc.)</li>
                <li>✅ Financial data and SEC filing information</li>
                <li>✅ Recent filings and document metadata</li>
              </ul>
              <p className="text-blue-700 text-sm mt-3">
                🔄 Cross-company analysis is coming soon!
              </p>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="space-y-4 mb-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {message.role === 'assistant' ? (
                    <MessageContent content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-gray-600">Processing your query...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex space-x-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about SEC filings... (e.g., 'What was Apple's revenue last quarter?')"
              className="flex-1 min-h-[60px] max-h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Send
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </footer>
    </div>
  );
}