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
  // TODO: Implement Redis health check
  return false;
}

export async function checkBlobHealth(): Promise<boolean> {
  // TODO: Implement Blob storage health check
  return false;
}