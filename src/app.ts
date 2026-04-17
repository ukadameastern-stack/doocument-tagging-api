import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { requestId } from './middleware/request-id';
import { globalErrorHandler } from './middleware/error-handler';
import authRoutes from './auth/auth.routes';
import orderRoutes from './orders/order.routes';
import logger from './utils/logger';

export function createApp(corsOrigins: string[], loginRateMax: number, apiRateMax: number) {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: process.env.NODE_ENV === 'development' ? true : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info({
        requestId: (req as express.Request & { requestId?: string }).requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  // Auth routes — rate limited per IP
  app.use('/auth', rateLimit({ windowMs: 60_000, max: loginRateMax, standardHeaders: true, legacyHeaders: false }), authRoutes);

  // Order routes — rate limited per user (keyed after auth middleware runs)
  app.use('/orders', rateLimit({
    windowMs: 60_000,
    max: apiRateMax,
    keyGenerator: (req) => (req as express.Request & { user?: { userId: string } }).user?.userId ?? req.ip ?? 'unknown',
    standardHeaders: true,
    legacyHeaders: false,
  }), orderRoutes);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use(globalErrorHandler);

  return app;
}
