import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {
      database: false,
      redis: false,
      blob: false,
    },
    version: '0.1.0',
  };

  // TODO: Add actual service health checks
  // For now, just return basic status
  
  return NextResponse.json(healthStatus);
}