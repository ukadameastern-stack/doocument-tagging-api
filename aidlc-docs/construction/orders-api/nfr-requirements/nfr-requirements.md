# NFR Requirements — orders-api

---

## NFR-01: Performance

| Metric | Target |
|---|---|
| Single-item operations (GET, POST, PUT, PATCH, DELETE) | p95 < 300ms |
| List orders (paginated, filtered) | p95 < 500ms |
| Login endpoint | p95 < 500ms |
| Lambda cold start | < 2 seconds (acceptable for low-volume use case) |
| Expected peak load | ≤ 100 requests/minute |

- MongoDB queries MUST use indexes for all filter/sort fields (`customerId`, `status`, `createdAt`, `deletedAt`)
- Pagination MUST be applied on all list queries — no unbounded result sets
- Lambda memory: 512MB (tunable based on profiling)

---

## NFR-02: Scalability

- Traffic profile: low volume (≤ 100 req/min) — Lambda concurrency limits not a concern at this scale
- Lambda auto-scales horizontally by default — no manual scaling configuration required
- MongoDB Atlas: M10 tier minimum for production (supports connection pooling)
- Connection pooling: reuse MongoDB connection across Lambda warm invocations (initialise outside handler)
- Reserved concurrency: not required at this scale; revisit if volume grows

---

## NFR-03: Availability

- **SLA Target**: 99.9% uptime (~8.7 hours downtime/year)
- **Deployment**: Single AWS region
- **Lambda**: Inherently multi-AZ within the region (AWS managed)
- **MongoDB Atlas**: M10+ tier with replica set (3-node) for automatic failover
- **API Gateway**: Managed service — 99.95% SLA from AWS
- **Recovery Time Objective (RTO)**: < 15 minutes (Lambda + Atlas auto-recovery)
- **Recovery Point Objective (RPO)**: < 1 minute (MongoDB Atlas continuous backup)

---

## NFR-04: Security

Derived from Security Baseline extension (all rules enforced):

| Requirement | Detail |
|---|---|
| Authentication | JWT Bearer tokens, 1-hour expiry, RS256 or HS256 signing |
| Refresh tokens | Issued alongside access tokens; stored securely (httpOnly cookie or secure storage); 7-day expiry |
| Token validation | Signature, expiration, audience, issuer validated server-side on every request |
| Password hashing | bcrypt with cost factor ≥ 12 |
| Brute-force protection | Login endpoint: max 5 failed attempts → 15-minute lockout (in-memory or Redis) |
| Input validation | Zod schemas on all endpoints; max body size 1MB (Express body-parser limit) |
| Rate limiting | Per-IP on `POST /auth/login` (unauthenticated); per-userId on all authenticated endpoints |
| Rate limits | Login: 10 req/min per IP; Authenticated: 200 req/min per user |
| CORS | Restricted to explicitly allowed origins — no wildcard on authenticated endpoints |
| Secrets | JWT secret, MongoDB URI, bcrypt salt stored in AWS Secrets Manager — never in env vars or code |
| Encryption in transit | TLS 1.2+ enforced on all connections (API Gateway → Lambda, Lambda → MongoDB Atlas) |
| Encryption at rest | MongoDB Atlas encryption at rest enabled (AES-256) |
| Error responses | Generic messages in production — no stack traces, no internal paths |
| Logging | Structured JSON; no PII, passwords, or tokens in log output |
| IAM | Lambda execution role with least-privilege permissions |

---

## NFR-05: Reliability & Error Handling

- All external calls (MongoDB, Secrets Manager) wrapped in try/catch — fail closed on error
- Global error handler catches all unhandled exceptions — returns safe 500 response
- Lambda timeout: 30 seconds (prevents runaway executions)
- MongoDB connection errors: surface as 503 Service Unavailable with retry guidance
- Unhandled promise rejections: caught by global handler, logged, return 500

---

## NFR-06: Observability

- **Logging**: Structured JSON via custom Logger utility; fields: `timestamp`, `requestId`, `level`, `message`, `method`, `path`, `statusCode`, `durationMs`
- **Log destination**: stdout → CloudWatch Logs (Lambda automatic integration)
- **Log retention**: 90 days minimum (SECURITY-14)
- **Correlation ID**: `requestId` generated per request (UUID v4), included in all log entries and response headers (`X-Request-Id`)
- **Metrics**: Lambda built-in CloudWatch metrics (invocations, errors, duration, throttles)
- **Alerting**: CloudWatch Alarms on Lambda error rate > 1% and p95 duration > 1 second
- **No PII in logs**: customerId logged as opaque ID only; no email, name, address in log output

---

## NFR-07: Maintainability

- **Language**: TypeScript (strict mode) — type safety across all layers
- **Linting**: ESLint with TypeScript plugin; Prettier for formatting
- **Testing**: Jest for unit + integration; fast-check for PBT; Supertest for e2e
- **Code coverage**: minimum 80% line coverage enforced in CI
- **Dependency management**: `package-lock.json` committed; `npm audit` in CI pipeline
- **Documentation**: JSDoc on all public service and repository methods
- **Environment config**: all config via `src/config/index.ts` — no scattered `process.env` calls

---

## NFR-08: Compliance

- No PII stored beyond what is necessary (customerId as opaque reference — no name/email in Order document)
- Soft-delete preserves audit trail (deletedAt timestamp)
- All data mutations logged with requestId for traceability (SECURITY-13)
- Log retention ≥ 90 days (SECURITY-14)
