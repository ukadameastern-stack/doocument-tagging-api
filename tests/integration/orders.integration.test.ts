import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { Express } from 'express';

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

import jwt from 'jsonwebtoken';

let app: Express;
let mongod: MongoMemoryServer;

const makeToken = (userId: string, role: string) =>
  jwt.sign({ sub: userId, role }, TEST_JWT_SECRET, { expiresIn: '1h', audience: 'orders-api', issuer: 'orders-api' });

const validOrder = {
  customerId: 'user1',
  items: [{ productId: 'p1', productName: 'Widget', quantity: 2, unitPrice: 10 }],
  shippingAddress: { street: '1 Main St', city: 'NYC', state: 'NY', postalCode: '10001', country: 'US' },
  paymentMethod: 'CREDIT_CARD',
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

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('Orders API Integration', () => {
  it('POST /orders — creates order with correct totalAmount', async () => {
    const token = makeToken('user1', 'customer');
    const res = await request(app).post('/orders').set('Authorization', `Bearer ${token}`).send(validOrder);
    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe(20);
    expect(res.body.status).toBe('PENDING');
  });

  it('GET /orders/:id — returns 404 for unknown order', async () => {
    const token = makeToken('user1', 'customer');
    const res = await request(app).get('/orders/nonexistent').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('GET /orders/:id — returns 403 when customer accesses another customer order', async () => {
    const token1 = makeToken('user1', 'customer');
    const token2 = makeToken('user2', 'customer');
    const create = await request(app).post('/orders').set('Authorization', `Bearer ${token1}`).send(validOrder);
    const res = await request(app).get(`/orders/${create.body.orderId}`).set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(403);
  });

  it('DELETE /orders/:id — soft deletes order (returns 204, then 404)', async () => {
    const token = makeToken('user1', 'customer');
    const create = await request(app).post('/orders').set('Authorization', `Bearer ${token}`).send(validOrder);
    const del = await request(app).delete(`/orders/${create.body.orderId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
    const get = await request(app).get(`/orders/${create.body.orderId}`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });

  it('PATCH /orders/:id/cancel — cancels PENDING order', async () => {
    const token = makeToken('user1', 'customer');
    const create = await request(app).post('/orders').set('Authorization', `Bearer ${token}`).send(validOrder);
    const cancel = await request(app).patch(`/orders/${create.body.orderId}/cancel`).set('Authorization', `Bearer ${token}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('CANCELLED');
  });

  it('GET /orders — returns 401 without token', async () => {
    const res = await request(app).get('/orders');
    expect(res.status).toBe(401);
  });
});
