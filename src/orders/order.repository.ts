import { v4 as uuidv4 } from 'uuid';
import { OrderModel } from './order.model';
import { Order, OrderCreateDto, OrderUpdateDto, ListOrdersQueryDto, PaginatedResult } from './order.types';

export async function create(dto: OrderCreateDto & { totalAmount: number }): Promise<Order> {
  const doc = await OrderModel.create({ ...dto, orderId: uuidv4(), status: 'PENDING', deletedAt: null });
  return toOrder(doc.toObject());
}

export async function findById(orderId: string): Promise<Order | null> {
  const doc = await OrderModel.findOne({ orderId, deletedAt: null }).lean();
  return doc ? toOrder(doc) : null;
}

export async function findAll(
  query: ListOrdersQueryDto,
): Promise<PaginatedResult<Order>> {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (query.customerId) filter.customerId = query.customerId;
  if (query.status) filter.status = query.status;
  if (query.fromDate || query.toDate) {
    filter.createdAt = {
      ...(query.fromDate && { $gte: new Date(query.fromDate) }),
      ...(query.toDate && { $lte: new Date(query.toDate) }),
    };
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;
  const sortField = query.sortBy ?? 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const [data, total] = await Promise.all([
    OrderModel.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limit).lean(),
    OrderModel.countDocuments(filter),
  ]);

  return { data: data.map(toOrder), total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function update(orderId: string, dto: Partial<OrderUpdateDto & { status: string; totalAmount: number; deletedAt: Date | null }>): Promise<Order | null> {
  const doc = await OrderModel.findOneAndUpdate(
    { orderId, deletedAt: null },
    { $set: dto },
    { new: true },
  ).lean();
  return doc ? toOrder(doc) : null;
}

export async function softDelete(orderId: string): Promise<void> {
  await OrderModel.findOneAndUpdate({ orderId, deletedAt: null }, { $set: { deletedAt: new Date() } });
}

function toOrder(doc: object): Order {
  const { _id, __v, ...rest } = doc as Record<string, unknown>;
  void _id; void __v;
  return rest as unknown as Order;
}
