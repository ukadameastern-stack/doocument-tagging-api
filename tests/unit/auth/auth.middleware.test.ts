import { Request, Response } from 'express';
import { authenticate } from '../../../src/auth/auth.middleware';

const mockVerify = jest.fn();
jest.mock('../../../src/auth/auth.service', () => ({ verifyAccessToken: mockVerify }));

function mockReq(authHeader?: string): Partial<Request> {
  return { headers: { authorization: authHeader } } as Partial<Request>;
}
const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  return res;
};
const next = jest.fn();

describe('AuthMiddleware.authenticate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next with user attached for valid token', async () => {
    mockVerify.mockResolvedValue({ sub: 'user1', role: 'customer' });
    const req = mockReq('Bearer valid-token');
    await authenticate(req as Request, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect((req as Request & { user: unknown }).user).toEqual({ userId: 'user1', role: 'customer' });
  });

  it('returns 401 when no Authorization header', async () => {
    const res = mockRes();
    await authenticate(mockReq() as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    mockVerify.mockRejectedValue(new Error('invalid'));
    const res = mockRes();
    await authenticate(mockReq('Bearer bad-token') as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
