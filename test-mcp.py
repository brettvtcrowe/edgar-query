#!/usr/bin/env python3
import json
import subprocess
import sys

def send_mcp_request(request):
    """Send a JSON-RPC request to the MCP server via Docker"""
    cmd = [
        'docker', 'run', '--rm', '-i',
        '-e', 'SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/2.0 (brett.vantil@crowe.com)',
        'stefanoamorelli/sec-edgar-mcp:latest'
    ]
    
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Send initialize request
    init_request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test-client", "version": "1.0.0"}
        }
    }
    
    # Send initialized notification
    init_notification = {
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    }
    
    # Send actual request
    requests = [
        json.dumps(init_request) + '\n',
        json.dumps(init_notification) + '\n',
        json.dumps(request) + '\n'
    ]
    
    try:
        stdout, stderr = process.communicate(input=''.join(requests), timeout=30)
        return stdout, stderr
    except subprocess.TimeoutExpired:
        process.kill()
        return None, "Timeout"

if __name__ == "__main__":
    # Test 1: List available tools
    print("=== Testing MCP Tools List ===")
    request = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    }
    
    stdout, stderr = send_mcp_request(request)
    if stdout:
        lines = stdout.strip().split('\n')
        for line in lines:
            try:
                response = json.loads(line)
                if 'result' in response and 'tools' in response['result']:
                    tools = response['result']['tools']
                    print(f"Found {len(tools)} tools:")
                    for tool in tools[:5]:  # Show first 5 tools
                        print(f"  - {tool['name']}: {tool['description'][:60]}...")
                    if len(tools) > 5:
                        print(f"  ... and {len(tools) - 5} more tools")
                    break
            except json.JSONDecodeError:
                continue
    
    print("\n=== Testing Company CIK Lookup ===")
    # Test 2: Look up Apple's CIK
    request = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "get_cik_by_ticker",
            "arguments": {"ticker": "AAPL"}
        }
    }
    
    stdout, stderr = send_mcp_request(request)
    if stdout:
        lines = stdout.strip().split('\n')
        for line in lines:
            try:
                response = json.loads(line)
                if 'result' in response and 'content' in response['result']:
                    print("Apple (AAPL) CIK lookup result:")
                    print(json.dumps(response['result']['content'], indent=2))
                    break
                elif 'result' in response and response['id'] == 3:
                    print("Apple (AAPL) CIK lookup result:")
                    print(json.dumps(response['result'], indent=2))
                    break
            except json.JSONDecodeError:
                continue