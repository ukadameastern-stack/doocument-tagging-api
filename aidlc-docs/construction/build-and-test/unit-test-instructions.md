# Unit Test Execution — orders-api

## Overview

Unit tests are isolated — no external services required (MongoDB and Redis are mocked).

| Suite | Files | Coverage Target |
|---|---|---|
| Auth service | `tests/unit/auth/auth.service.test.ts` | JWT verify, login flows |
| Auth middleware | `tests/unit/auth/auth.middleware.test.ts` | Token extraction, 401 paths |
| Order service | `tests/unit/orders/order.service.test.ts` | All business rules, IDOR, status machine |

---

## Run Unit Tests

### All unit tests

```bash
npm test
# or explicitly:
npx jest --testPathPattern='tests/unit'
```

### Single file

```bash
npx jest tests/unit/orders/order.service.test.ts
```

### With coverage

```bash
npm run test:coverage
```

**Coverage threshold**: 80% line coverage enforced. Build fails below this threshold.

**Expected output**:
```
PASS tests/unit/auth/auth.service.test.ts
PASS tests/unit/auth/auth.middleware.test.ts
PASS tests/unit/orders/order.service.test.ts

Test Suites: 3 passed, 3 total
Tests:       XX passed, XX total
Coverage:    >= 80%
```

---

## Key Test Scenarios Covered

### auth.service.test.ts
- Valid JWT returns correct payload
- Expired JWT throws `UnauthorizedError`
- Invalid signature throws `UnauthorizedError`

### auth.middleware.test.ts
- Valid Bearer token → `req.user` populated, `next()` called
- Missing Authorization header → 401
- Failed token verification → 401

### order.service.test.ts
- `createOrder`: correct `totalAmount` computation; `ForbiddenError` on customerId mismatch; admin bypass
- `getOrderById`: `NotFoundError` on missing; `ForbiddenError` on cross-customer access; admin bypass
- `updateOrder`: `ConflictError` on non-PENDING for customer; admin unrestricted; `totalAmount` recomputed on item change
- `cancelOrder`: `ConflictError` on already-cancelled; `ConflictError` on DELIVERED for customer; sets CANCELLED
- `deleteOrder`: calls `softDelete` on repository

---

## Fix Failing Tests

1. Run `npx jest --verbose` to see detailed failure output
2. Check mock setup — ensure `jest.mock()` paths match actual import paths
3. Verify `tsconfig.json` `paths` are not needed (no path aliases used)
4. Re-run after fixes: `npm test`
