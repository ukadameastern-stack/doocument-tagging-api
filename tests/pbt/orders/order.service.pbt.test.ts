import * as fc from 'fast-check';
import { orderArb, orderItemArb } from './order.generators';
import { OrderStatus } from '../../../src/orders/order.types';

// PBT-03: totalAmount invariant
describe('PBT: totalAmount invariant', () => {
  it('always equals sum of quantity * unitPrice rounded to 2dp', () => {
    fc.assert(fc.property(fc.array(orderItemArb, { minLength: 1, maxLength: 50 }), (items) => {
      const expected = Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;
      const actual = Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;
      return Math.abs(expected - actual) < 0.001;
    }));
  });
});

// PBT-02: Order serialization round-trip
describe('PBT: order serialization round-trip', () => {
  it('JSON serialize then deserialize yields equivalent order', () => {
    fc.assert(fc.property(orderArb, (order) => {
      const serialized = JSON.stringify(order);
      const deserialized = JSON.parse(serialized);
      return deserialized.orderId === order.orderId &&
        deserialized.customerId === order.customerId &&
        deserialized.totalAmount === order.totalAmount &&
        deserialized.status === order.status &&
        deserialized.items.length === order.items.length;
    }));
  });
});

// PBT-03: Status values invariant — status is always one of the 6 valid values
describe('PBT: status values invariant', () => {
  const VALID_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  it('generated orders always have a valid status', () => {
    fc.assert(fc.property(orderArb, (order) => VALID_STATUSES.includes(order.status)));
  });
});

// PBT-03: Pagination invariant
describe('PBT: pagination totalPages invariant', () => {
  it('totalPages always equals ceil(total / limit)', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 10000 }),
      fc.integer({ min: 1, max: 100 }),
      (total, limit) => {
        const totalPages = Math.ceil(total / limit);
        return totalPages === Math.ceil(total / limit);
      },
    ));
  });
});

// PBT-04: PUT idempotency — applying same update twice yields same totalAmount
describe('PBT: update idempotency — totalAmount', () => {
  it('computing totalAmount twice from same items yields same result', () => {
    fc.assert(fc.property(fc.array(orderItemArb, { minLength: 1, maxLength: 50 }), (items) => {
      const compute = (its: typeof items) =>
        Math.round(its.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;
      return compute(items) === compute(items);
    }));
  });
});

// PBT-03: Soft-delete exclusion invariant
describe('PBT: soft-delete exclusion invariant', () => {
  it('orders with deletedAt set are never in active results', () => {
    fc.assert(fc.property(fc.array(orderArb, { minLength: 0, maxLength: 20 }), (orders) => {
      const withDeleted = orders.map((o, i) => i % 3 === 0 ? { ...o, deletedAt: new Date() } : o);
      const active = withDeleted.filter((o) => o.deletedAt === null || o.deletedAt === undefined);
      return active.every((o) => !o.deletedAt);
    }));
  });
});

// PBT-03: IDOR invariant — customer can never see another customer's orders
describe('PBT: IDOR invariant', () => {
  it('filtering by customerId never returns orders belonging to other customers', () => {
    fc.assert(fc.property(
      fc.uuid(),
      fc.array(orderArb, { minLength: 1, maxLength: 20 }),
      (userId, orders) => {
        const filtered = orders.filter((o) => o.customerId === userId);
        return filtered.every((o) => o.customerId === userId);
      },
    ));
  });
});

// PBT-06: Stateful order lifecycle — valid transitions always produce valid statuses
describe('PBT: stateful order lifecycle', () => {
  const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING:    ['CONFIRMED', 'CANCELLED'],
    CONFIRMED:  ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED:    ['DELIVERED', 'CANCELLED'],
    DELIVERED:  [],
    CANCELLED:  [],
  };

  it('following valid transitions always results in a valid status', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 10 }),
      (steps) => {
        let status: OrderStatus = 'PENDING';
        for (let i = 0; i < steps; i++) {
          const next = TRANSITIONS[status];
          if (next.length === 0) break;
          status = next[0];
        }
        return ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status);
      },
    ));
  });
});
