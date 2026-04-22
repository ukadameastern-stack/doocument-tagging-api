# Customer Orders REST API

REST API for managing customer orders with CRUD operations. Built with Node.js, TypeScript, Express, MongoDB Atlas, and deployed to AWS Lambda.2

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20.x + TypeScript (strict) |
| Framework | Express v4 + `@vendia/serverless-express` |
| Database | MongoDB Atlas (Mongoose v8) |
| Cache / Token Store | Redis (ElastiCache / ioredis) |
| Auth | JWT HS256 + refresh tokens |
| Validation | Zod |
| Deployment | AWS Lambda + API Gateway (HTTP API) via AWS CDK |
| Testing | Jest + Supertest + fast-check (PBT) + mongodb-memory-server |

---

## Setup

```bash
cp .env.example .env        # fill in your local values
npm install
cd infra && npm install && cd ..
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` / `staging` / `production` |
| `MONGODB_URI` | Dev only | MongoDB connection string (Atlas or local) |
| `REDIS_URL` | Dev only | Redis connection URL |
| `JWT_SECRET` | Dev only | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | No | Access token expiry (default: `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiry (default: `7d`) |
| `JWT_AUDIENCE` | No | JWT audience claim (default: `orders-api`) |
| `JWT_ISSUER` | No | JWT issuer claim (default: `orders-api`) |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated allowed origins |
| `RATE_LIMIT_LOGIN_MAX` | No | Max login attempts per minute per IP (default: `10`) |
| `RATE_LIMIT_API_MAX` | No | Max API requests per minute per user (default: `200`) |
| `SECRETS_JWT_SECRET_NAME` | Non-dev | AWS Secrets Manager secret name for JWT secret |
| `SECRETS_MONGODB_URI_NAME` | Non-dev | AWS Secrets Manager secret name for MongoDB URI |
| `SECRETS_REDIS_URL_NAME` | Non-dev | AWS Secrets Manager secret name for Redis URL |

> In `development`, values are read directly from `.env`.
> In `staging` / `production`, values are loaded from AWS Secrets Manager.

---

## Run Locally

### Option A — Docker (recommended for team members, zero setup)

```bash
docker compose up
```

This starts three containers automatically:
- `orders-api` — the API on http://localhost:3000
- `orders-mongo` — MongoDB on port 27017
- `orders-redis` — Redis on port 6379

No `.env` file needed — all variables are set in `docker-compose.yml`.

```bash
# Stop everything
docker compose down

# Stop and wipe all data volumes
docker compose down -v

# Rebuild after code changes
docker compose up --build
```

### Option B — Run directly with Node.js

```bash
cp .env.example .env        # fill in your local values
npm run dev                 # starts HTTP server on http://localhost:3000
```

---

## API Endpoints

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register a new user |
| POST | `/auth/login` | None | Login, receive JWT + refresh token |
| POST | `/auth/refresh` | None | Refresh access token |
| POST | `/auth/logout` | None | Invalidate refresh token |

### Orders

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/orders` | JWT | Create order |
| GET | `/orders` | JWT | List orders (paginated, filtered, sorted) |
| GET | `/orders/:id` | JWT | Get order by ID |
| PUT | `/orders/:id` | JWT | Update order |
| PATCH | `/orders/:id/cancel` | JWT | Cancel order |
| DELETE | `/orders/:id` | JWT | Soft-delete order |

### Other

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Health check |

---

## Request / Response Examples

### Register
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "role": "customer"          # optional, defaults to "customer"
}

# Response 201
{ "userId": "64f1...", "email": "user@example.com", "role": "customer" }
```

### Login
```bash
POST /auth/login
{ "email": "user@example.com", "password": "password123" }

# Response 200
{ "accessToken": "eyJ...", "refreshToken": "uuid-v4", "expiresIn": "1h" }
```

### Create Order
```bash
POST /orders
Authorization: Bearer <accessToken>

{
  "customerId": "<your-userId>",
  "items": [
    { "productId": "p1", "productName": "Widget", "quantity": 2, "unitPrice": 29.99 }
  ],
  "shippingAddress": {
    "street": "123 Main St", "city": "New York",
    "state": "NY", "postalCode": "10001", "country": "US"
  },
  "paymentMethod": "CREDIT_CARD",
  "notes": "Leave at door"     # optional
}

# Response 201
{ "orderId": "uuid", "status": "PENDING", "totalAmount": 59.98, ... }
```

### List Orders
```bash
GET /orders?status=PENDING&sortBy=createdAt&sortOrder=desc&page=1&limit=20
Authorization: Bearer <accessToken>

# Response 200
{ "data": [...], "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
```

---

## Order Data Model

| Field | Type | Notes |
|---|---|---|
| `orderId` | string (UUID) | Auto-generated |
| `customerId` | string | Must match JWT `sub` (unless admin) |
| `items` | OrderItem[] | Min 1, max 50 |
| `totalAmount` | number | Auto-computed (sum of qty × unitPrice) |
| `status` | OrderStatus | Default: `PENDING` |
| `shippingAddress` | object | street, city, state, postalCode, country |
| `paymentMethod` | enum | `CREDIT_CARD` / `DEBIT_CARD` / `PAYPAL` / `BANK_TRANSFER` |
| `notes` | string | Optional, max 500 chars |
| `createdAt` | Date | Auto-set |
| `updatedAt` | Date | Auto-updated |
| `deletedAt` | Date | Null = active; set on soft-delete |

### Order Status Lifecycle

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
                                           ↘ CANCELLED
```

- Customers can cancel any order except `DELIVERED` or already `CANCELLED`
- Customers can only update orders in `PENDING` status
- Admins can update/cancel orders at any status

---

## Authorization

- All `/orders` endpoints require a valid JWT Bearer token
- Customers can only access their own orders (IDOR prevention)
- Admins (JWT `role: admin`) can access and modify all orders
- Login endpoint is rate-limited: 10 requests/min per IP
- Authenticated endpoints are rate-limited: 200 requests/min per user

---

## Test

```bash
npm test                    # unit tests
npm run test:integration    # integration tests
npm run test:e2e            # end-to-end tests
npm run test:pbt            # property-based tests (fast-check)
npm run test:all            # all tests
npm run test:coverage       # with coverage report (≥ 80% required)
```

---

## Build

```bash
npm run build               # tsc type-check + esbuild bundle → dist/server.js
```

---

## Deploy

```bash
cd infra

# Deploy to dev
npx cdk deploy --all --context deployEnv=dev

# Deploy to staging
npx cdk deploy --all --context deployEnv=staging

# Deploy to prod
npx cdk deploy --all --context deployEnv=prod
```

**Post-deploy smoke test**:
```bash
curl https://api.example.com/health
# { "status": "ok" }
```

---

## Project Structure

```
src/
  app.ts                  # Express app, middleware pipeline
  server.ts               # Lambda handler entry point
  dev.ts                  # Local HTTP server entry point
  db.ts                   # MongoDB connection
  redis.ts                # Redis client
  config/
    index.ts              # Env config + Secrets Manager loader
  auth/
    auth.controller.ts
    auth.middleware.ts
    auth.routes.ts
    auth.schemas.ts
    auth.service.ts
    auth.types.ts
    user.model.ts         # Mongoose User schema
  orders/
    order.controller.ts
    order.model.ts        # Mongoose Order schema
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
  unit/                   # Mocked, no external services
  integration/            # mongodb-memory-server + ioredis-mock
  e2e/                    # Full lifecycle scenarios
  pbt/                    # fast-check property-based tests
infra/
  bin/app.ts              # CDK app entry point
  lib/
    network-stack.ts      # VPC, subnets, security groups
    app-stack.ts          # Lambda, API GW, Redis, alarms
```
