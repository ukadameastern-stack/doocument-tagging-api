# NFR Design Patterns — orders-api

---

## 1. Resilience Patterns

### Pattern: Fail-Fast on Database Error
- **Applies to**: All MongoDB operations
- **Design**: No retry logic. On any MongoDB connection or query error, catch the exception in the service layer, log it with `requestId` and error details (no stack trace in production), and throw an `InternalError` which the global error handler maps to `503 Service Unavailable`
- **Rationale**: At low volume, transient errors are rare. Fail-fast keeps response times predictable and avoids cascading delays. MongoDB Atlas replica set handles its own failover transparently
- **Client guidance**: Response body includes `{ "error": "Service temporarily unavailable", "retryAfter": 5 }` to signal clients to retry after 5 seconds

### Pattern: Lambda Timeout Guard
- **Applies to**: Lambda handler
- **Design**: Lambda timeout set to 30 seconds via CDK. All async operations (DB, Redis, Secrets Manager) use explicit timeouts:
  - MongoDB: `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 10000`
  - Redis: connection timeout 2000ms, command timeout 1000ms
- **Rationale**: Prevents Lambda from hanging on unresponsive downstream services, ensuring clean failure within SLA

### Pattern: Graceful Shutdown
- **Applies to**: Lambda container lifecycle
- **Design**: On SIGTERM (Lambda shutdown signal), close MongoDB and Redis connections cleanly before process exit. Implemented via `process.on('SIGTERM', cleanup)`
- **Rationale**: Prevents connection leaks across Lambda invocations

---

## 2. Scalability Patterns

### Pattern: Lambda Provisioned Concurrency
- **Applies to**: Production Lambda function
- **Design**: CDK configures provisioned concurrency of 1 for the production alias. This keeps one Lambda instance warm at all times, eliminating cold start latency for the first request
- **Rationale**: Guarantees sub-300ms response time even after periods of inactivity. Cost is minimal at low volume (~$5–10/month for 1 provisioned instance)

### Pattern: MongoDB Connection Reuse
- **Applies to**: Lambda handler initialisation
- **Design**: MongoDB connection is established outside the Lambda handler function (module-level). Mongoose `connect()` is called once; subsequent invocations on warm instances reuse the existing connection. Connection state is checked before each operation — reconnect if disconnected
- **Rationale**: Avoids per-request TCP handshake overhead. Critical for Lambda performance

### Pattern: Redis Connection Reuse
- **Applies to**: Lambda handler initialisation
- **Design**: Redis client (`ioredis`) initialised at module level, outside the handler. Single client instance reused across warm invocations. Connection errors trigger reconnect with exponential backoff (managed by ioredis internally)
- **Rationale**: Same as MongoDB — avoids per-request connection overhead for Redis operations

---

## 3. Performance Patterns

### Pattern: MongoDB Index-First Queries
- **Applies to**: OrderRepository.findAll, findById
- **Design**: All query filters (`customerId`, `status`, `createdAt`, `deletedAt`) and sort fields are covered by indexes defined in the Mongoose schema. Queries always include `deletedAt: null` to leverage the soft-delete index. Compound index `{ customerId, status }` covers the most common combined filter
- **Rationale**: Prevents full collection scans. Critical for list endpoint staying within p95 < 500ms target

### Pattern: Pagination Enforcement
- **Applies to**: OrderRepository.findAll
- **Design**: Every list query applies `.skip((page-1) * limit).limit(limit)`. Default `limit=20`, max `limit=100` enforced in service layer before reaching repository. `countDocuments()` runs in parallel with the data query using `Promise.all` to minimise latency
- **Rationale**: Prevents unbounded result sets that would degrade performance and increase Lambda memory usage

### Pattern: Response Field Projection
- **Applies to**: OrderRepository.findAll (list endpoint)
- **Design**: List queries use Mongoose `.select()` to exclude `deletedAt` and internal fields from the response. Full document returned only on single-item GET
- **Rationale**: Reduces payload size and serialisation overhead on list responses

---

## 4. Security Patterns

### Pattern: JWT Middleware Chain
- **Applies to**: All routes except `POST /auth/login` and `POST /auth/refresh`
- **Design**:
  ```
  Request → AuthMiddleware.authenticate
    → extract Bearer token from Authorization header
    → verify signature, expiry, aud, iss (jsonwebtoken.verify)
    → attach req.user = { userId, role }
    → next() or 401
  ```
- **Token validation**: Synchronous `jwt.verify()` — no async I/O. Fails closed on any verification error

### Pattern: Refresh Token Flow (Redis-backed)
- **Applies to**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- **Design**:
  - **Login**: Issue access token (JWT, 1hr) + refresh token (opaque UUID, 7 days). Store `refreshToken → { userId, role, expiresAt }` in Redis with TTL=7days
  - **Refresh**: Client sends refresh token → look up in Redis → if valid and not expired, issue new access token + rotate refresh token (delete old, store new)
  - **Logout**: Delete refresh token from Redis → token immediately invalidated
  - **Revocation**: Admin can delete any refresh token by userId pattern (`DEL refreshToken:userId:*`)
- **Redis key pattern**: `refreshToken:{tokenId}` with TTL set to 7 days

### Pattern: Rate Limiting (Dual Strategy)
- **Applies to**: All routes
- **Design**:
  - **Unauthenticated** (`POST /auth/login`): `express-rate-limit` keyed by `req.ip` — 10 requests/minute, 15-minute block window
  - **Authenticated** (all other routes): `express-rate-limit` keyed by `req.user.userId` — 200 requests/minute
  - Rate limit headers included in response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  - At low volume, in-memory store is sufficient; Redis store available as drop-in upgrade

### Pattern: Login Brute-Force Lockout (Redis-backed)
- **Applies to**: `POST /auth/login`
- **Design**:
  - On failed login: `INCR loginAttempts:{email}` with TTL=15min in Redis
  - If count >= 5: return `429 Too Many Requests` with `Retry-After: 900` header — do not attempt credential check
  - On successful login: `DEL loginAttempts:{email}`
  - **Redis key pattern**: `loginAttempts:{email}` with TTL=900 seconds (15 minutes)
- **Security note**: Response for locked-out account is identical to invalid credentials — does not reveal lockout state to attacker

### Pattern: CORS Configuration (Environment-Aware)
- **Applies to**: Express `cors` middleware
- **Design**:
  - **Development**: `origin: true` (allow all origins) — enables local frontend development
  - **Production**: `origin: ['https://app.example.com']` — explicit allowlist from config/Secrets Manager
  - `credentials: true` for cookie-based refresh token support
  - `methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']`
  - `allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id']`
- **SECURITY-08 compliance**: No wildcard origin on authenticated endpoints in production

### Pattern: Security Headers Middleware
- **Applies to**: All responses
- **Design**: `helmet` middleware applied at app level. Configures:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - Content-Security-Policy: `default-src 'none'` (API — no HTML served)
- **Note**: SECURITY-04 applies to HTML-serving endpoints; CSP set to `default-src 'none'` for pure API

---

## 5. Observability Patterns

### Pattern: Request Logging Middleware
- **Applies to**: All requests
- **Design**: Custom pino middleware logs every request on completion:
  ```json
  {
    "timestamp": "2025-07-14T00:00:00.000Z",
    "requestId": "uuid-v4",
    "level": "info",
    "method": "POST",
    "path": "/orders",
    "statusCode": 201,
    "durationMs": 145,
    "userId": "user-id-opaque"
  }
  ```
- `requestId` generated at request entry, attached to `req.requestId`, included in `X-Request-Id` response header
- No PII (no email, name, address), no tokens in log output (SECURITY-03)

### Pattern: Structured Error Logging
- **Applies to**: Global error handler
- **Design**: On error, log at `error` level with `requestId`, `errorType`, `message`. In development: include stack trace. In production: omit stack trace, log only error type and sanitised message
