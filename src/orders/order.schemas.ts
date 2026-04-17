import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1).max(200),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
});

const shippingAddressSchema = z.object({
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
});

export const orderCreateSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(orderItemSchema).min(1).max(50),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER']),
  notes: z.string().max(500).optional(),
});

export const orderUpdateSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(50).optional(),
  shippingAddress: shippingAddressSchema.optional(),
  paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER']).optional(),
  notes: z.string().max(500).optional(),
});

export const listOrdersQuerySchema = z.object({
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'totalAmount', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
