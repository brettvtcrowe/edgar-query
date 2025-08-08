import { db } from './db';

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    console.log('DATABASE_URL configured:', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL prefix:', process.env.DATABASE_URL?.substring(0, 20));
    
    const result = await db.$queryRaw`SELECT 1 as health_check`;
    console.log('Database health check result:', result);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return false;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const { getRedisClient } = await import('./redis');
    const redis = getRedisClient();
    
    const result = await redis.ping();
    console.log('Redis health check result:', result);
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    console.error('Redis error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return false;
  }
}

export async function checkBlobHealth(): Promise<boolean> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log('BLOB_READ_WRITE_TOKEN not configured, skipping blob check');
      return false;
    }

    // Simple check - just verify the token is configured
    // We don't actually create a blob in the health check to avoid unnecessary storage usage
    console.log('Blob storage token configured:', !!process.env.BLOB_READ_WRITE_TOKEN);
    return true;
  } catch (error) {
    console.error('Blob health check failed:', error);
    return false;
  }
}