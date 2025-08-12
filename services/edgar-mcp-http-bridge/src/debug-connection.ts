#!/usr/bin/env tsx

/**
 * Debug MCP Connection in Bridge Service
 */

import { EDGARMCPClient } from './edgar-mcp-client.js';

async function debugConnection() {
  console.log('🔍 Debugging MCP Connection...');
  
  const userAgent = "EdgarAnswerEngine/1.0 (brett.vantil@crowe.com)";
  console.log('User Agent:', userAgent);
  
  try {
    console.log('📡 Creating MCP client...');
    const client = new EDGARMCPClient({ userAgent });
    
    console.log('🔌 Attempting to connect...');
    await client.connect();
    
    console.log('✅ Connected successfully!');
    
    console.log('📋 Testing tools list...');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools?.length || 0} tools`);
    
    await client.disconnect();
    console.log('🔚 Disconnected');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugConnection().catch(console.error);