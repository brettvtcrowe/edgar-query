#!/usr/bin/env node

/**
 * EDGAR MCP Bridge Setup Test
 * 
 * This script tests the EDGAR MCP setup without Docker to verify the approach.
 */

import { spawn } from 'child_process';

async function testDockerAvailability() {
  console.log('🔍 Testing Docker availability...');
  
  return new Promise((resolve) => {
    const docker = spawn('docker', ['--version']);
    
    docker.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Docker is available');
        resolve(true);
      } else {
        console.log('❌ Docker not available');
        resolve(false);
      }
    });
    
    docker.on('error', () => {
      console.log('❌ Docker not found');
      resolve(false);
    });
  });
}

async function testEDGARMCPImage() {
  console.log('🔍 Testing EDGAR MCP Docker image...');
  
  return new Promise((resolve) => {
    const docker = spawn('docker', ['image', 'inspect', 'stefanoamorelli/sec-edgar-mcp:latest']);
    
    docker.on('close', (code) => {
      if (code === 0) {
        console.log('✅ EDGAR MCP image available locally');
        resolve(true);
      } else {
        console.log('📥 EDGAR MCP image not found locally - will pull when needed');
        resolve(true); // Still OK, Docker will pull
      }
    });
  });
}

async function testEnvironmentVariables() {
  console.log('🔍 Testing environment variables...');
  
  const userAgent = process.env.SEC_EDGAR_USER_AGENT;
  if (userAgent && userAgent.includes('@')) {
    console.log('✅ SEC_EDGAR_USER_AGENT is set with email');
    return true;
  } else {
    console.log('⚠️  SEC_EDGAR_USER_AGENT not set or missing email');
    console.log('   Please set: export SEC_EDGAR_USER_AGENT="YourName (your.email@domain.com)"');
    return false;
  }
}

async function runTests() {
  console.log('🚀 EDGAR MCP Bridge Setup Test');
  console.log('=====================================\n');
  
  const dockerOK = await testDockerAvailability();
  const imageOK = dockerOK ? await testEDGARMCPImage() : false;
  const envOK = await testEnvironmentVariables();
  
  console.log('\n=====================================');
  console.log('📋 Test Results:');
  console.log(`   Docker: ${dockerOK ? '✅' : '❌'}`);
  console.log(`   EDGAR MCP Image: ${imageOK ? '✅' : '❌'}`);
  console.log(`   Environment: ${envOK ? '✅' : '⚠️'}`);
  
  if (dockerOK && imageOK) {
    console.log('\n🎉 Ready to start EDGAR MCP Bridge!');
    console.log('   Run: docker-compose up --build');
  } else {
    console.log('\n🔧 Setup needed before running the bridge');
  }
}

runTests().catch(console.error);