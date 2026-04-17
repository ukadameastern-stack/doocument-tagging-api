import * as repo from './order.repository';
import { Order, OrderCreateDto, OrderUpdateDto, ListOrdersQueryDto, PaginatedResult, OrderStatus } from './order.types';
import { RequestUser } from '../auth/auth.types';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED', 'CANCELLED'],
  DELIVERED:  [],
  CANCELLED:  [],
};

function computeTotal(items: OrderCreateDto['items']): number {
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  return Math.round(total * 100) / 100;
}

function assertOwnership(order: Order, user: RequestUser): void {
  if (user.role !== 'admin' && order.customerId !== user.userId) {
    throw new ForbiddenError();
  }
}

export async function createOrder(dto: OrderCreateDto, user: RequestUser): Promise<Order> {
  if (user.role !== 'admin' && dto.customerId !== user.userId) throw new ForbiddenError();
  const totalAmount = computeTotal(dto.items);
  return repo.create({ ...dto, totalAmount });
}

export async function getOrderById(orderId: string, user: RequestUser): Promise<Order> {
  const order = await repo.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');
  assertOwnership(order, user);
  return order;
}

export async function listOrders(query: ListOrdersQueryDto, user: RequestUser): Promise<PaginatedResult<Order>> {
  const scopedQuery = user.role === 'admin' ? query : { ...query, customerId: user.userId };
  return repo.findAll(scopedQuery);
}

export async function updateOrder(orderId: string, dto: OrderUpdateDto, user: RequestUser): Promise<Order> {
  const order = await repo.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');
  assertOwnership(order, user);

  if (user.role !== 'admin' && order.status !== 'PENDING') {
    throw new ConflictError('Order can only be updated in PENDING status');
  }

  const updates: Partial<OrderUpdateDto & { totalAmount: number }> = { ...dto };
  if (dto.items) updates.totalAmount = computeTotal(dto.items);

  const updated = await repo.update(orderId, updates);
  if (!updated) throw new NotFoundError('Order not found');
  return updated;
}

export async function cancelOrder(orderId: string, user: RequestUser): Promise<Order> {
  const order = await repo.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');
  assertOwnership(order, user);

  if (order.status === 'CANCELLED') throw new ConflictError('Order is already cancelled');
  if (user.role !== 'admin' && order.status === 'DELIVERED') {
    throw new ConflictError('Delivered orders cannot be cancelled');
  }
  if (!VALID_TRANSITIONS[order.status].includes('CANCELLED')) {
    throw new ConflictError(`Cannot cancel order in ${order.status} status`);
  }

  const updated = await repo.update(orderId, { status: 'CANCELLED' });
  if (!updated) throw new NotFoundError('Order not found');
  return updated;
}

export async function deleteOrder(orderId: string, user: RequestUser): Promise<void> {
  const order = await repo.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');
  assertOwnership(order, user);
  await repo.softDelete(orderId);
}
