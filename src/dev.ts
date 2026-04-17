import { createApp } from './app';
import { connectDb } from './db';
import { initRedis } from './redis';
import { getConfig } from './config';
import logger from './utils/logger';

async function start() {
  const config = await getConfig();
  await Promise.all([connectDb(), initRedis()]);
  const app = createApp(config.corsAllowedOrigins, config.rateLimitLoginMax, config.rateLimitApiMax);
  const port = process.env.PORT ?? 3000;
  app.listen(port, () => logger.info({ port }, 'Server listening'));
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
