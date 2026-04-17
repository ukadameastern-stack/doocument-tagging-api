# Customer Orders REST API

REST API for managing customer orders with CRUD operations. Built with Node.js, TypeScript, Express, MongoDB, and deployed to AWS Lambda.

## Stack

- **Runtime**: Node.js 20.x + TypeScript (strict)
- **Framework**: Express v4 + `@vendia/serverless-express`
- **Database**: MongoDB Atlas (Mongoose v8)
- **Cache / Token Store**: Redis (ElastiCache)
- **Auth**: JWT (HS256) + refresh tokens
- **Validation**: Zod
- **Deployment**: AWS Lambda + API Gateway (HTTP API) via AWS CDK
- **Testing**: Jest + Supertest + fast-check (PBT) + mongodb-memory-server

## Setup

```bash
cp .env.example .env        # fill in local values
npm install
```

## Run Locally

```bash
npm run dev
```

## Test

```bash
npm test                    # unit tests
npm run test:integration    # integration tests (requires MongoDB)
npm run test:e2e            # e2e tests
npm run test:pbt            # property-based tests
npm run test:all            # all tests
npm run test:coverage       # with coverage report
```

## Build

```bash
npm run build               # tsc check + esbuild bundle → dist/server.js
```

## Deploy

```bash
cd infra && npm install
# Deploy to dev
npx cdk deploy --all --context deployEnv=dev
# Deploy to staging
npx cdk deploy --all --context deployEnv=staging
# Deploy to prod
npx cdk deploy --all --context deployEnv=prod
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/login | None | Login, receive JWT + refresh token |
| POST | /auth/refresh | None | Refresh access token |
| POST | /auth/logout | None | Invalidate refresh token |
| POST | /orders | JWT | Create order |
| GET | /orders | JWT | List orders (paginated, filtered, sorted) |
| GET | /orders/:id | JWT | Get order by ID |
| PUT | /orders/:id | JWT | Update order |
| PATCH | /orders/:id/cancel | JWT | Cancel order |
| DELETE | /orders/:id | JWT | Soft-delete order |
| GET | /health | None | Health check |

## Environment Variables

See `.env.example` for all required variables.
