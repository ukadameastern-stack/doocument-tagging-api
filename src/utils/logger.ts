import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'password', 'token', 'refreshToken'],
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
