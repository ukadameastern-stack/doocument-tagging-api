import serverlessExpress from '@vendia/serverless-express';
import type { Handler } from 'aws-lambda';
import { createApp } from './app';
import { connectDb } from './db';
import { initRedis } from './redis';
import { getConfig } from './config';

let handler: Handler;

async function bootstrap(): Promise<Handler> {
  const config = await getConfig();
  await Promise.all([connectDb(), initRedis()]);
  const app = createApp(config.corsAllowedOrigins, config.rateLimitLoginMax, config.rateLimitApiMax);
  return serverlessExpress({ app }) as Handler;
}

export const lambdaHandler: Handler = async (event, context, callback) => {
  if (!handler) handler = await bootstrap();
  return handler(event, context, callback);
};
