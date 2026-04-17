# Integration Test Instructions — orders-api

## Overview

Integration tests spin up an in-memory MongoDB (`mongodb-memory-server`) and mock Redis (`ioredis-mock`). No external services required.

| Suite | File | Scenarios |
|---|---|---|
| Orders API | `tests/integration/orders.integration.test.ts` | Full HTTP request/response cycle |

---

## Run Integration Tests

```bash
npm run test:integration
# or:
npx jest --testPathPattern='tests/integration'
```

**First run**: `mongodb-memory-server` downloads a MongoDB binary (~60MB). Subsequent runs use the cached binary.

**Expected output**:
```
PASS tests/integration/orders.integration.test.ts

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

---

## Scenarios Covered

### POST /orders
- Creates order with correct `totalAmount` (201)
- Returns `status: PENDING` on creation

### GET /orders/:id
- Returns 404 for unknown orderId
- Returns 403 when customer accesses another customer's order (IDOR)

### DELETE /orders/:id
- Soft-deletes order (204)
- Subsequent GET returns 404 (soft-delete exclusion)

### PATCH /orders/:id/cancel
- Cancels PENDING order → status `CANCELLED` (200)

### GET /orders (unauthenticated)
- Returns 401 without Bearer token

---

## Environment Setup

No manual setup required — `mongodb-memory-server` and `ioredis-mock` are configured in test files via `jest.mock()`.

For running against a real local MongoDB and Redis:

```bash
# Start local MongoDB
docker run -d -p 27017:27017 mongo:7

# Start local Redis
docker run -d -p 6379:6379 redis:7

# Set env vars
export MONGODB_URI=mongodb://localhost:27017/orders-test
export REDIS_URL=redis://localhost:6379
export NODE_ENV=development

npx jest --testPathPattern='tests/integration'
```

---

## Troubleshooting

### `MongoMemoryServer` download fails
```bash
# Set download mirror if behind corporate proxy
MONGOMS_DOWNLOAD_URL=https://fastdl.mongodb.org npx jest --testPathPattern='tests/integration'
```

### Tests hang after completion
- Ensure `afterAll` closes mongoose and stops `mongod`
- Add `--forceExit` flag if needed: `npx jest --forceExit --testPathPattern='tests/integration'`
