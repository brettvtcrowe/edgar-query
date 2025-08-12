import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth, checkRedisHealth, checkBlobHealth } from '@/lib/health-checks';
import { checkEDGARHealth } from '@/lib/edgar-client';

export async function GET(request: NextRequest) {
  try {
    const [database, redis, blob, edgar] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkBlobHealth(),
      checkEDGARHealth(),
    ]);

    const edgarHealth = edgar.status === 'fulfilled' ? edgar.value : { client: false, mcp: false, dataSource: 'SEC_API' };

    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        database: database.status === 'fulfilled' ? database.value : false,
        redis: redis.status === 'fulfilled' ? redis.value : false,
        blob: blob.status === 'fulfilled' ? blob.value : false,
        edgar: edgarHealth.client,
      },
      edgar: {
        client: edgarHealth.client,
        mcp: edgarHealth.mcp,
        dataSource: edgarHealth.dataSource,
      },
      version: '0.1.0',
    };

    // Return 503 if any critical service is down
    const allHealthy = Object.values(healthStatus.services).every(service => service === true);
    const status = allHealthy ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}