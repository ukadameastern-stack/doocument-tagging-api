import { verifyAccessToken } from '../../../src/auth/auth.service';
import { UnauthorizedError } from '../../../src/utils/errors';

const TEST_JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-for-tests-only';

jest.mock('../../../src/config', () => ({
  getConfig: jest.fn().mockResolvedValue({
    jwtSecret: process.env.JWT_SECRET ?? 'test-secret-for-tests-only', jwtExpiresIn: '1h',
    jwtAudience: 'orders-api', jwtIssuer: 'orders-api',
    jwtRefreshExpiresIn: '7d',
  }),
}));
jest.mock('../../../src/redis', () => ({ getRedis: jest.fn() }));

import jwt from 'jsonwebtoken';

describe('AuthService.verifyAccessToken', () => {
  it('returns payload for valid token', async () => {
    const token = jwt.sign({ sub: 'user1', role: 'customer' }, TEST_JWT_SECRET, {
      expiresIn: '1h', audience: 'orders-api', issuer: 'orders-api',
    });
    const payload = await verifyAccessToken(token);
    expect(payload.sub).toBe('user1');
    expect(payload.role).toBe('customer');
  });

  it('throws UnauthorizedError for expired token', async () => {
    const token = jwt.sign({ sub: 'user1', role: 'customer' }, TEST_JWT_SECRET, {
      expiresIn: -1, audience: 'orders-api', issuer: 'orders-api',
    });
    await expect(verifyAccessToken(token)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for invalid signature', async () => {
    const token = jwt.sign({ sub: 'user1', role: 'customer' }, 'wrong-secret', {
      expiresIn: '1h', audience: 'orders-api', issuer: 'orders-api',
    });
    await expect(verifyAccessToken(token)).rejects.toThrow(UnauthorizedError);
  });
});
