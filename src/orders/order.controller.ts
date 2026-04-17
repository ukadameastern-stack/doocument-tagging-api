import { Request, Response, NextFunction } from 'express';
import * as service from './order.service';
import { RequestUser } from '../auth/auth.types';

type AuthRequest = Request & { user: RequestUser };

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.createOrder(req.body, (req as AuthRequest).user);
    res.status(201).json(order);
  } catch (err) { next(err); }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.getOrderById(req.params.id, (req as AuthRequest).user);
    res.json(order);
  } catch (err) { next(err); }
}

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listOrders(req.query as never, (req as AuthRequest).user);
    res.json(result);
  } catch (err) { next(err); }
}

export async function updateOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.updateOrder(req.params.id, req.body, (req as AuthRequest).user);
    res.json(order);
  } catch (err) { next(err); }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.cancelOrder(req.params.id, (req as AuthRequest).user);
    res.json(order);
  } catch (err) { next(err); }
}

export async function deleteOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.deleteOrder(req.params.id, (req as AuthRequest).user);
    res.status(204).send();
  } catch (err) { next(err); }
}
