import { Request, Response, NextFunction } from 'express';
import * as service from './auth.service';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await service.register(req.body);
    res.status(201).json(user);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokens = await service.login(req.body.email, req.body.password);
    res.json(tokens);
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokens = await service.refreshTokens(req.body.refreshToken);
    res.json(tokens);
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.logout(req.body.refreshToken);
    res.status(204).send();
  } catch (err) { next(err); }
}
