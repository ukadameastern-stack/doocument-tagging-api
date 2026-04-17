import Redis from 'ioredis';
import { getConfig } from './config';
import logger from './utils/logger';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) throw new Error('Redis not initialised — call initRedis() first');
  return redisClient;
}

export async function initRedis(): Promise<void> {
  if (redisClient) return;
  const { redisUrl } = await getConfig();
  if (!redisUrl || redisUrl === 'redis://localhost:6379') {
    // In dev without a local Redis, use ioredis-mock if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RedisMock = require('ioredis-mock');
      redisClient = new RedisMock();
      logger.info('Redis using in-memory mock (dev mode)');
      return;
    } catch {
      // ioredis-mock not available outside dev — fall through to real connection
    }
  }
  redisClient = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  await redisClient.connect();
  logger.info('Redis connected');
}

process.on('SIGTERM', async () => {
  await redisClient?.quit();
  logger.info('Redis disconnected on SIGTERM');
});
