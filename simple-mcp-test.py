#!/usr/bin/env python3
import json
import subprocess

def test_apple_cik():
    """Simple test to get Apple's CIK"""
    
    # Create a batch of requests
    requests = [
        # Initialize
        '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}',
        # Initialized notification  
        '{"jsonrpc": "2.0", "method": "notifications/initialized"}',
        # Get Apple CIK
        '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get_cik_by_ticker", "arguments": {"ticker": "AAPL"}}}'
    ]
    
    input_data = '\n'.join(requests) + '\n'
    
    cmd = [
        'docker', 'run', '--rm', '-i',
        '-e', 'SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/2.0 (brett.vantil@crowe.com)',
        'stefanoamorelli/sec-edgar-mcp:latest'
    ]
    
    try:
        result = subprocess.run(cmd, input=input_data, text=True, capture_output=True, timeout=15)
        
        print("=== RAW OUTPUT ===")
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        
        print("\n=== PARSED RESPONSES ===")
        for line in result.stdout.strip().split('\n'):
            if line.strip() and line.startswith('{'):
                try:
                    response = json.loads(line)
                    if response.get('id') == 2:  # Our CIK request
                        print(f"SUCCESS! Apple's CIK data:")
                        print(json.dumps(response, indent=2))
                        return
                except json.JSONDecodeError:
                    continue
        
    except subprocess.TimeoutExpired:
        print("Request timed out")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_apple_cik()