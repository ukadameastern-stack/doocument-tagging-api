import { verifyAccessToken } from '../../../src/auth/auth.service';
import { UnauthorizedError } from '../../../src/utils/errors';

jest.mock('../../../src/config', () => ({
  getConfig: jest.fn().mockResolvedValue({
    jwtSecret: 'test-secret', jwtExpiresIn: '1h',
    jwtAudience: 'orders-api', jwtIssuer: 'orders-api',
    jwtRefreshExpiresIn: '7d',
  }),
}));
jest.mock('../../../src/redis', () => ({ getRedis: jest.fn() }));

import jwt from 'jsonwebtoken';

describe('AuthService.verifyAccessToken', () => {
  it('returns payload for valid token', async () => {
    const token = jwt.sign({ sub: 'user1', role: 'customer' }, 'test-secret', {
      expiresIn: '1h', audience: 'orders-api', issuer: 'orders-api',
    });
    const payload = await verifyAccessToken(token);
    expect(payload.sub).toBe('user1');
    expect(payload.role).toBe('customer');
  });

  it('throws UnauthorizedError for expired token', async () => {
    const token = jwt.sign({ sub: 'user1', role: 'customer' }, 'test-secret', {
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
