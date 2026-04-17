# Code Generation Plan — orders-api

## Unit Context
- **Unit**: orders-api (single deployable unit)
- **Workspace root**: /home/udaysinhkadam/workspace/ai/doocument-tagging-api
- **Code location**: workspace root (`src/`, `tests/`, `infra/`, config files)
- **Stories**: US-01 through US-11
- **Stack**: Node.js 20.x, TypeScript, Express, Mongoose, JWT, Zod, fast-check, AWS CDK

## Story Traceability
- [x] US-01: Login / JWT issuance
- [x] US-02: Create order
- [x] US-03: View own order
- [x] US-04: List own orders
- [x] US-05: Update own order
- [x] US-06: Cancel own order
- [x] US-07: Delete own order
- [x] US-08: Admin list all orders
- [x] US-09: Admin view any order
- [x] US-10: Admin update any order
- [x] US-11: Admin delete any order

---

## Execution Checklist

### Step 1: Project Structure Setup
- [x] 1.1 Create `package.json` with all dependencies and scripts
- [x] 1.2 Create `tsconfig.json` (strict mode, ES2022 target)
- [x] 1.3 Create `.eslintrc.js` and `.prettierrc`
- [x] 1.4 Create `jest.config.ts` (unit + integration + PBT configs)
- [x] 1.5 Create `.env.example` with all required env var keys
- [x] 1.6 Create `src/config/index.ts` (secrets loader + env config)

### Step 2: Shared Types and Utilities
- [x] 2.1 Create `src/utils/logger.ts` (pino structured logger)
- [x] 2.2 Create `src/utils/errors.ts` (custom error classes: NotFoundError, ForbiddenError, UnauthorizedError, ConflictError, ValidationError)
- [x] 2.3 Create `src/middleware/error-handler.ts` (global error handler)
- [x] 2.4 Create `src/middleware/request-id.ts` (UUID v4 correlation ID)
- [x] 2.5 Create `src/middleware/validate.ts` (Zod validation middleware factory)

### Step 3: Auth Module — Business Logic
- [x] 3.1 Create `src/auth/auth.types.ts` (LoginDto, TokenPayload, RefreshTokenDto)
- [x] 3.2 Create `src/auth/auth.schemas.ts` (Zod schemas for login, refresh)
- [x] 3.3 Create `src/auth/auth.service.ts` (login, verifyToken, issueTokens, refreshTokens, logout)
- [x] 3.4 Create `src/auth/auth.middleware.ts` (JWT authenticate middleware)

### Step 4: Auth Module — Unit Tests
- [x] 4.1 Create `tests/unit/auth/auth.service.test.ts`
- [x] 4.2 Create `tests/unit/auth/auth.middleware.test.ts`

### Step 5: Order Module — Data Model
- [x] 5.1 Create `src/orders/order.types.ts` (Order, OrderItem, ShippingAddress, OrderStatus, PaymentMethod, DTOs, PaginatedResult)
- [x] 5.2 Create `src/orders/order.model.ts` (Mongoose schema + indexes)

### Step 6: Order Module — Repository Layer
- [x] 6.1 Create `src/orders/order.repository.ts` (create, findById, findAll, update, delete with soft-delete)

### Step 7: Order Module — Repository Unit Tests
- [x] 7.1 Create `tests/unit/orders/order.repository.test.ts` (mongodb-memory-server)

### Step 8: Order Module — Service Layer
- [x] 8.1 Create `src/orders/order.service.ts` (createOrder, getOrderById, listOrders, updateOrder, cancelOrder, deleteOrder — all business rules + authorization)

### Step 9: Order Module — Service Unit Tests
- [x] 9.1 Create `tests/unit/orders/order.service.test.ts` (all business rules, status machine, IDOR)

### Step 10: Order Module — Property-Based Tests
- [x] 10.1 Create `tests/pbt/orders/order.generators.ts` (fast-check Arbitrary generators for Order, OrderItem, ShippingAddress)
- [x] 10.2 Create `tests/pbt/orders/order.service.pbt.test.ts` (totalAmount invariant, status machine, soft-delete, pagination, IDOR, serialization round-trip, idempotency, stateful lifecycle)

### Step 11: Order Module — Validation Schemas
- [x] 11.1 Create `src/orders/order.schemas.ts` (Zod: OrderCreateDto, OrderUpdateDto, ListOrdersQueryDto)

### Step 12: Order Module — Controller
- [x] 12.1 Create `src/orders/order.controller.ts` (createOrder, getOrder, listOrders, updateOrder, cancelOrder, deleteOrder)

### Step 13: Auth Module — Controller and Routes
- [x] 13.1 Create `src/auth/auth.controller.ts` (login, refresh, logout)
- [x] 13.2 Create `src/auth/auth.routes.ts`

### Step 14: Order Module — Routes
- [x] 14.1 Create `src/orders/order.routes.ts` (all 6 order routes with middleware chain)

### Step 15: Application Entry Points
- [x] 15.1 Create `src/app.ts` (Express app setup, middleware pipeline, route registration)
- [x] 15.2 Create `src/server.ts` (Lambda handler via @vendia/serverless-express)
- [x] 15.3 Create `src/db.ts` (MongoDB connection initialisation, module-level reuse)
- [x] 15.4 Create `src/redis.ts` (ioredis client initialisation, module-level reuse)

### Step 16: Integration Tests
- [x] 16.1 Create `tests/integration/auth.integration.test.ts` (login, refresh, logout flows)
- [x] 16.2 Create `tests/integration/orders.integration.test.ts` (full CRUD + auth + IDOR scenarios)

### Step 17: E2E / Contract Tests
- [x] 17.1 Create `tests/e2e/order-lifecycle.e2e.test.ts` (full order lifecycle: create → confirm → process → ship → deliver)
- [x] 17.2 Create `tests/e2e/order-cancel.e2e.test.ts` (cancellation scenarios per BR-06)

### Step 18: CDK Infrastructure
- [x] 18.1 Create `infra/bin/app.ts` (CDK app entry point, instantiate stacks per env)
- [x] 18.2 Create `infra/lib/network-stack.ts` (VPC, subnets, NAT, SGs, VPC endpoints)
- [x] 18.3 Create `infra/lib/app-stack.ts` (Lambda, API GW, Redis, Secrets, IAM, alarms, dashboard)
- [x] 18.4 Create `infra/package.json` and `infra/tsconfig.json`
- [x] 18.5 Create `cdk.json`

### Step 19: Documentation and Config
- [x] 19.1 Create `README.md` (project overview, setup, run, test, deploy instructions)
- [x] 19.2 Create `aidlc-docs/construction/orders-api/code/code-summary.md` (generated files list)

---

## File Structure (workspace root)

```
/home/udaysinhkadam/workspace/ai/doocument-tagging-api/
  src/
    app.ts
    server.ts
    db.ts
    redis.ts
    config/
      index.ts
    auth/
      auth.controller.ts
      auth.middleware.ts
      auth.routes.ts
      auth.schemas.ts
      auth.service.ts
      auth.types.ts
    orders/
      order.controller.ts
      order.model.ts
      order.repository.ts
      order.routes.ts
      order.schemas.ts
      order.service.ts
      order.types.ts
    middleware/
      error-handler.ts
      request-id.ts
      validate.ts
    utils/
      errors.ts
      logger.ts
  tests/
    unit/
      auth/
        auth.middleware.test.ts
        auth.service.test.ts
      orders/
        order.repository.test.ts
        order.service.test.ts
    integration/
      auth.integration.test.ts
      orders.integration.test.ts
    e2e/
      order-cancel.e2e.test.ts
      order-lifecycle.e2e.test.ts
    pbt/
      orders/
        order.generators.ts
        order.service.pbt.test.ts
  infra/
    bin/
      app.ts
    lib/
      app-stack.ts
      network-stack.ts
    package.json
    tsconfig.json
  .env.example
  .eslintrc.js
  .prettierrc
  cdk.json
  jest.config.ts
  package.json
  README.md
  tsconfig.json
```
