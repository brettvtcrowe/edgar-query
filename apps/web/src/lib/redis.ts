import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is not set');
    }
    
    redis = new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      tls: {
        // Upstash requires TLS
      }
    });
  }
  
  return redis;
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}