import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { Express } from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../src/redis', () => {
  const RedisMock = require('ioredis-mock');
  const client = new RedisMock();
  return { getRedis: () => client, initRedis: jest.fn() };
});

const TEST_JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-for-tests-only';

jest.mock('../../src/config', () => ({
  getConfig: jest.fn().mockResolvedValue({
    jwtSecret: process.env.JWT_SECRET ?? 'test-secret-for-tests-only', jwtExpiresIn: '1h',
    jwtAudience: 'orders-api', jwtIssuer: 'orders-api',
    jwtRefreshExpiresIn: '7d', corsAllowedOrigins: ['*'],
    rateLimitLoginMax: 100, rateLimitApiMax: 1000,
  }),
}));

let app: Express;
let mongod: MongoMemoryServer;

const adminToken = jwt.sign({ sub: 'admin1', role: 'admin' }, TEST_JWT_SECRET, { expiresIn: '1h', audience: 'orders-api', issuer: 'orders-api' });
const customerToken = jwt.sign({ sub: 'cust1', role: 'customer' }, TEST_JWT_SECRET, { expiresIn: '1h', audience: 'orders-api', issuer: 'orders-api' });

const orderPayload = {
  customerId: 'cust1',
  items: [{ productId: 'p1', productName: 'Widget', quantity: 1, unitPrice: 50 }],
  shippingAddress: { street: '1 Main St', city: 'NYC', state: 'NY', postalCode: '10001', country: 'US' },
  paymentMethod: 'PAYPAL',
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp(['*'], 100, 1000);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('E2E: Full order lifecycle', () => {
  it('PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED', async () => {
    // Create
    const create = await request(app).post('/orders').set('Authorization', `Bearer ${customerToken}`).send(orderPayload);
    expect(create.status).toBe(201);
    const { orderId } = create.body;

    // Admin progresses through lifecycle
    for (const status of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
      const update = await request(app).put(`/orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).send({ status });
      expect(update.status).toBe(200);
    }

    const final = await request(app).get(`/orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(final.body.status).toBe('DELIVERED');
  });
});

describe('E2E: Cancellation scenarios', () => {
  it('customer cannot cancel DELIVERED order', async () => {
    const create = await request(app).post('/orders').set('Authorization', `Bearer ${customerToken}`).send(orderPayload);
    const { orderId } = create.body;

    for (const status of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
      await request(app).put(`/orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).send({ status });
    }

    const cancel = await request(app).patch(`/orders/${orderId}/cancel`).set('Authorization', `Bearer ${customerToken}`);
    expect(cancel.status).toBe(409);
  });

  it('customer can cancel PENDING order', async () => {
    const create = await request(app).post('/orders').set('Authorization', `Bearer ${customerToken}`).send(orderPayload);
    const cancel = await request(app).patch(`/orders/${create.body.orderId}/cancel`).set('Authorization', `Bearer ${customerToken}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('CANCELLED');
  });
});
