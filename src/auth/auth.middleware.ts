import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './auth.service';
import { RequestUser } from './auth.types';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = await verifyAccessToken(token);
    (req as Request & { user: RequestUser }).user = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
