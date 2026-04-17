import * as fc from 'fast-check';
import { Order, OrderItem, ShippingAddress, OrderStatus, PaymentMethod } from '../../../src/orders/order.types';

export const orderItemArb: fc.Arbitrary<OrderItem> = fc.record({
  productId: fc.uuid(),
  productName: fc.string({ minLength: 1, maxLength: 200 }),
  quantity: fc.integer({ min: 1, max: 100 }),
  unitPrice: fc.float({ min: 0.01, max: 10000, noNaN: true }),
});

export const shippingAddressArb: fc.Arbitrary<ShippingAddress> = fc.record({
  street: fc.string({ minLength: 1, maxLength: 200 }),
  city: fc.string({ minLength: 1, maxLength: 100 }),
  state: fc.string({ minLength: 1, maxLength: 100 }),
  postalCode: fc.string({ minLength: 1, maxLength: 20 }),
  country: fc.string({ minLength: 1, maxLength: 100 }),
});

export const orderStatusArb: fc.Arbitrary<OrderStatus> = fc.constantFrom(
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED',
);

export const paymentMethodArb: fc.Arbitrary<PaymentMethod> = fc.constantFrom(
  'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER',
);

export const orderArb: fc.Arbitrary<Order> = fc.record({
  orderId: fc.uuid(),
  customerId: fc.uuid(),
  items: fc.array(orderItemArb, { minLength: 1, maxLength: 50 }),
  totalAmount: fc.float({ min: 0.01, max: 1_000_000, noNaN: true }),
  status: orderStatusArb,
  shippingAddress: shippingAddressArb,
  paymentMethod: paymentMethodArb,
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
  deletedAt: fc.constant(null),
});
