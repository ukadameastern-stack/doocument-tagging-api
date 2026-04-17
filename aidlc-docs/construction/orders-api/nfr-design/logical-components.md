# Logical Components — orders-api

---

## Component: Redis (ElastiCache)

**Purpose**: Shared fast store for refresh tokens and login lockout tracking
**Type**: Infrastructure (AWS ElastiCache for Redis, Serverless or t3.micro cluster)
**Client library**: `ioredis`

**Responsibilities**:
- Store refresh tokens: `refreshToken:{tokenId}` → `{ userId, role }` with TTL=7 days
- Track login attempts: `loginAttempts:{email}` → count with TTL=15 minutes
- Support token revocation via key deletion

**Integration**:
- Lambda connects to Redis via VPC private subnet (same VPC as Lambda)
- Redis client initialised at module level (outside handler) for connection reuse
- Security group: Redis SG allows inbound port 6379 from Lambda SG only

**Failure behaviour**: If Redis is unavailable, login and refresh endpoints return 503. Auth middleware falls back to JWT-only validation (stateless) — refresh token operations fail gracefully

---

## Component: Express Middleware Pipeline

**Purpose**: Ordered chain of cross-cutting concerns applied to every request
**Type**: Application logical component

**Pipeline order**:
```
1. helmet()                    — security headers
2. cors(corsOptions)           — CORS policy (env-aware)
3. express.json({ limit: '1mb' }) — body parsing + size limit
4. requestIdMiddleware         — generate + attach requestId, set X-Request-Id header
5. requestLoggerMiddleware     — log request on completion (pino)
6. rateLimiter (route-level)   — per-IP or per-user depending on route
7. AuthMiddleware.authenticate — JWT validation (protected routes only)
8. ValidationMiddleware        — Zod schema validation (per-route)
9. [Route Handler / Controller]
10. globalErrorHandler         — catch-all error handler (last middleware)
```

---

## Component: JWT Token Service

**Purpose**: Encapsulates all JWT issuance and verification logic
**Type**: Application logical component (part of AuthService)

**Responsibilities**:
- Sign access tokens: `jwt.sign({ sub, role }, secret, { expiresIn: '1h', audience, issuer })`
- Verify access tokens: `jwt.verify(token, secret, { audience, issuer })` — throws on invalid
- Generate refresh tokens: `crypto.randomUUID()` — opaque, stored in Redis
- Secret loaded from AWS Secrets Manager at cold start, cached in module scope

---

## Component: Secrets Loader

**Purpose**: Load secrets from AWS Secrets Manager at Lambda cold start
**Type**: Application logical component (`src/config/secrets.ts`)

**Responsibilities**:
- Fetch `JWT_SECRET`, `MONGODB_URI`, `REDIS_URL` from Secrets Manager on first invocation
- Cache values in module scope — not re-fetched on warm invocations
- Fail fast with clear error if any secret is missing at startup

**AWS SDK**: `@aws-sdk/client-secrets-manager`

---

## Component: Request ID Middleware

**Purpose**: Generate a unique correlation ID per request for log tracing
**Type**: Application logical component (`src/middleware/request-id.ts`)

**Responsibilities**:
- Generate `uuid.v4()` on each request
- Attach to `req.requestId`
- Set `X-Request-Id` response header
- Inject into pino logger child instance for the request scope

---

## Component: Zod Validation Schemas

**Purpose**: Define and enforce input contracts for all endpoints
**Type**: Application logical component (co-located with routes in each module)

**Schema locations**:
- `src/auth/auth.schemas.ts` — LoginDto, RefreshTokenDto
- `src/orders/order.schemas.ts` — OrderCreateDto, OrderUpdateDto, ListOrdersQueryDto

**Validation middleware factory** (`src/middleware/validate.ts`):
```typescript
// Usage: router.post('/orders', validate('body', orderCreateSchema), controller.createOrder)
validate(target: 'body' | 'query', schema: ZodSchema) => RequestHandler
```

---

## Component: CloudWatch Alarms (CDK-defined)

**Purpose**: Alert on error rate and latency degradation
**Type**: Infrastructure logical component

**Alarms**:
| Alarm | Metric | Threshold | Action |
|---|---|---|---|
| High error rate | Lambda Errors / Invocations | > 1% over 5 min | SNS notification |
| High p95 latency | Lambda Duration p95 | > 1000ms over 5 min | SNS notification |
| Throttles | Lambda Throttles | > 0 over 5 min | SNS notification |

**Log retention**: CloudWatch Log Group retention set to 90 days via CDK (SECURITY-14)

---

## Component: Lambda Provisioned Concurrency

**Purpose**: Eliminate cold starts for production traffic
**Type**: Infrastructure logical component (CDK-configured)

**Configuration**:
- Lambda function alias: `production`
- Provisioned concurrency: 1
- Auto-scaling: not configured at this volume (revisit at > 500 req/min)

---

## Updated Dependency List (additions from NFR Design)

```json
{
  "dependencies": {
    "ioredis": "^5.x",
    "helmet": "^7.x",
    "cors": "^2.x",
    "@aws-sdk/client-secrets-manager": "^3.x"
  },
  "devDependencies": {
    "@types/cors": "^2.x",
    "@types/bcrypt": "^5.x",
    "@types/jsonwebtoken": "^9.x",
    "ioredis-mock": "^8.x"
  }
}
```

---

## Security Compliance Summary (NFR Design)

| Rule | Status | Notes |
|---|---|---|
| SECURITY-01 | Partial | TLS enforced on all connections; encryption at rest addressed in Infrastructure Design |
| SECURITY-02 | N/A | API Gateway access logging addressed in Infrastructure Design |
| SECURITY-03 | Compliant | Request logging middleware logs all requests; no PII/tokens; pino structured JSON |
| SECURITY-04 | Compliant | helmet middleware sets all required headers; CSP `default-src 'none'` for pure API |
| SECURITY-05 | Compliant | Zod validation middleware factory defined; body size limit 1MB; per-endpoint schemas |
| SECURITY-06 | N/A | IAM roles addressed in Infrastructure Design |
| SECURITY-07 | N/A | VPC/security groups addressed in Infrastructure Design |
| SECURITY-08 | Compliant | JWT middleware chain defined; CORS restricted to allowlist in production; refresh token revocation via Redis |
| SECURITY-09 | Compliant | Error logging omits stack traces in production; generic error responses |
| SECURITY-10 | N/A | Dependency scanning addressed in Build and Test |
| SECURITY-11 | Compliant | Rate limiting on all public endpoints; auth/validation isolated in dedicated middleware |
| SECURITY-12 | Compliant | Refresh token rotation on every use; logout deletes token; Redis TTL enforces expiry; brute-force lockout via Redis |
| SECURITY-13 | N/A | CI/CD pipeline integrity addressed in Build and Test |
| SECURITY-14 | Compliant | CloudWatch alarms defined for auth failures and errors; log retention 90 days via CDK |
| SECURITY-15 | Compliant | Lambda timeout guards; graceful shutdown; fail-fast on DB errors; global error handler |

## PBT Compliance Summary (NFR Design)

| Rule | Status | Notes |
|---|---|---|
| PBT-01 | Compliant | Properties identified in Functional Design — carried forward |
| PBT-09 | Compliant | fast-check confirmed in tech stack; ioredis-mock added for Redis testing in PBT |
| All others | N/A | PBT-02 through PBT-10 enforced at Code Generation stage |
