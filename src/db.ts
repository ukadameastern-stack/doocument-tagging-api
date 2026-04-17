import mongoose from 'mongoose';
import { getConfig } from './config';
import logger from './utils/logger';

let connected = false;

export async function connectDb(): Promise<void> {
  if (connected) return;
  const { mongodbUri, nodeEnv } = await getConfig();

  let uri = mongodbUri;

  // In development with default localhost URI, fall back to mongodb-memory-server
  // if (nodeEnv === 'development' && mongodbUri.includes('localhost')) {
  //   try {
  //     // eslint-disable-next-line @typescript-eslint/no-require-imports
  //     const { MongoMemoryServer } = require('mongodb-memory-server');
  //     const mongod = await MongoMemoryServer.create();
  //     uri = mongod.getUri();
  //     logger.info('MongoDB using in-memory server (dev mode)');
  //   } catch {
  //     // mongodb-memory-server not available — fall through to real connection
  //   }
  // }

  console.log(`Connecting to MongoDB at ${uri}...`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });
  connected = true;
  logger.info('MongoDB connected');
}

process.on('SIGTERM', async () => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected on SIGTERM');
});
