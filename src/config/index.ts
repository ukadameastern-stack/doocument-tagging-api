import 'dotenv/config';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface Config {
  nodeEnv: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  jwtAudience: string;
  jwtIssuer: string;
  mongodbUri: string;
  redisUrl: string;
  corsAllowedOrigins: string[];
  rateLimitLoginMax: number;
  rateLimitApiMax: number;
}

let config: Config | null = null;

async function loadSecret(secretName: string): Promise<string> {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
  const parsed = JSON.parse(response.SecretString ?? '{}');
  return Object.values(parsed)[0] as string;
}

export async function getConfig(): Promise<Config> {
  if (config) return config;

  const isDev = (process.env.NODE_ENV ?? 'development') === 'development';

  const [jwtSecret, mongodbUri, redisUrl] = isDev
    ? [
        process.env.JWT_SECRET ?? 'local-dev-secret',
        process.env.MONGODB_URI ?? 'mongodb://localhost:27017/orders-dev',
        process.env.REDIS_URL ?? 'redis://localhost:6379',
      ]
    : await Promise.all([
        loadSecret(process.env.SECRETS_JWT_SECRET_NAME!),
        loadSecret(process.env.SECRETS_MONGODB_URI_NAME!),
        loadSecret(process.env.SECRETS_REDIS_URL_NAME!),
      ]);

  config = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    jwtAudience: process.env.JWT_AUDIENCE ?? 'orders-api',
    jwtIssuer: process.env.JWT_ISSUER ?? 'orders-api',
    mongodbUri,
    redisUrl,
    corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
    rateLimitLoginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX ?? '10', 10),
    rateLimitApiMax: parseInt(process.env.RATE_LIMIT_API_MAX ?? '200', 10),
  };

  return config;
}
