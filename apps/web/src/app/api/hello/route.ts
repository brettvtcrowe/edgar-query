import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Hello from EDGAR Answer Engine!',
    timestamp: new Date().toISOString(),
    phase: 'Foundation - Phase 1.1'
  });
}