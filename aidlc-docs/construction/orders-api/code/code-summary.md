# Code Summary — orders-api

## Application Code (workspace root)

### Config & Entry Points
- `src/config/index.ts` — secrets loader + env config
- `src/app.ts` — Express app, middleware pipeline, route registration
- `src/server.ts` — Lambda handler (serverless-express)
- `src/db.ts` — MongoDB connection (module-level reuse)
- `src/redis.ts` — ioredis client (module-level reuse)

### Auth Module
- `src/auth/auth.types.ts` — TokenPayload, RequestUser, LoginDto, TokenResponse
- `src/auth/auth.schemas.ts` — Zod schemas (login, refresh)
- `src/auth/auth.service.ts` — login, refreshTokens, logout, verifyAccessToken (US-01)
- `src/auth/auth.middleware.ts` — JWT authenticate middleware
- `src/auth/auth.controller.ts` — login, refresh, logout handlers
- `src/auth/auth.routes.ts` — POST /auth/login, /refresh, /logout

### Orders Module
- `src/orders/order.types.ts` — Order, OrderItem, ShippingAddress, DTOs, PaginatedResult
- `src/orders/order.model.ts` — Mongoose schema + indexes
- `src/orders/order.repository.ts` — create, findById, findAll, update, softDelete (US-02–11)
- `src/orders/order.service.ts` — all business rules, status machine, IDOR (US-02–11)
- `src/orders/order.schemas.ts` — Zod schemas (create, update, list query)
- `src/orders/order.controller.ts` — 6 handlers (US-02–11)
- `src/orders/order.routes.ts` — all order routes with middleware chain

### Middleware & Utilities
- `src/middleware/error-handler.ts` — global error handler
- `src/middleware/request-id.ts` — UUID v4 correlation ID
- `src/middleware/validate.ts` — Zod validation middleware factory
- `src/utils/errors.ts` — custom error classes (5 types)
- `src/utils/logger.ts` — pino structured logger

## Tests

### Unit Tests
- `tests/unit/auth/auth.service.test.ts`
- `tests/unit/auth/auth.middleware.test.ts`
- `tests/unit/orders/order.service.test.ts`

### Integration Tests
- `tests/integration/orders.integration.test.ts`

### E2E Tests
- `tests/e2e/order-lifecycle.e2e.test.ts`

### Property-Based Tests (fast-check)
- `tests/pbt/orders/order.generators.ts` — domain Arbitrary generators
- `tests/pbt/orders/order.service.pbt.test.ts` — 8 property tests (PBT-02, 03, 04, 06)

## Infrastructure (CDK)
- `infra/bin/app.ts` — CDK app entry point
- `infra/lib/network-stack.ts` — VPC, subnets, NAT, SGs, VPC endpoints
- `infra/lib/app-stack.ts` — Lambda, API GW, Redis, Secrets, IAM, alarms, dashboard
- `infra/package.json`, `infra/tsconfig.json`
- `cdk.json` — CDK context (dev/staging/prod)

## Config Files
- `package.json`, `tsconfig.json`, `jest.config.ts`
- `.eslintrc.js`, `.prettierrc`, `.env.example`
- `README.md`

## Stories Implemented
US-01 through US-11 — all 11 stories complete ✅
