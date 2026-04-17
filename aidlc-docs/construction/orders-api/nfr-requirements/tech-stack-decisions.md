# Tech Stack Decisions — orders-api

---

## Runtime & Language

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Node.js LTS (v20.x) | Stable, long-term support, Lambda native support |
| Language | TypeScript (strict) | Type safety, better IDE support, catches errors at compile time |
| Target | ES2022 (CommonJS for Lambda) | Lambda compatibility; ESM support via bundler if needed |

---

## Framework

| Decision | Choice | Rationale |
|---|---|---|
| HTTP Framework | Express v4 | Widely adopted, large ecosystem, familiar, sufficient for low-volume use case |
| Lambda adapter | `@vendia/serverless-express` or `aws-serverless-express` | Wraps Express app for Lambda + API Gateway HTTP API |

---

## Database

| Decision | Choice | Rationale |
|---|---|---|
| Database | MongoDB Atlas | Managed, replica set, encryption at rest, automatic backups |
| ODM | Mongoose v8 | Schema validation, index management, TypeScript support |
| Atlas tier | M10 (production), M0/M2 (dev/test) | M10 supports connection pooling and replica set |
| Connection strategy | Initialise connection outside Lambda handler | Reuse across warm invocations — avoids per-request connection overhead |

---

## Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| JWT library | `jsonwebtoken` | Mature, widely used, supports RS256 and HS256 |
| JWT algorithm | HS256 (single service) | Sufficient for single-service; upgrade to RS256 if multi-service token sharing needed |
| Access token expiry | 1 hour | Balanced security and usability |
| Refresh token expiry | 7 days | Standard refresh window |
| Password hashing | `bcrypt` (cost factor 12) | Adaptive, industry standard (SECURITY-12) |
| Input validation | `zod` v3 | TypeScript-first, composable schemas, excellent error messages |
| Rate limiting | `express-rate-limit` | Simple, in-memory for low volume; swap to Redis-backed for scale |
| Secrets management | AWS Secrets Manager | No secrets in code or env vars (SECURITY-12) |

---

## Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Deployment tool | AWS CDK (TypeScript) | Programmatic IaC, type-safe, full AWS service coverage |
| Compute | AWS Lambda | Serverless, auto-scaling, pay-per-use, suits low-volume profile |
| API layer | Amazon API Gateway (HTTP API) | Lower cost than REST API, JWT authorizer support, Lambda proxy integration |
| Region | Single region (configurable via CDK context) | Sufficient for 99.9% SLA at low volume |
| Networking | Lambda in VPC (private subnet) | Required for MongoDB Atlas VPC peering (SECURITY-07) |
| Secrets | AWS Secrets Manager | JWT secret, MongoDB URI, bcrypt config |

---

## Testing

| Decision | Choice | Rationale |
|---|---|---|
| Test runner | Jest v29 | Industry standard, TypeScript support via ts-jest |
| HTTP testing | Supertest | Integration/e2e testing of Express routes |
| PBT framework | fast-check v3 | TypeScript-native, Jest integration, excellent shrinking (PBT-09) |
| In-memory MongoDB | `mongodb-memory-server` | Isolated integration tests without Atlas dependency |
| Mocking | Jest mocks + `jest-mock-extended` | Type-safe mocks for repositories and services |

---

## Observability

| Decision | Choice | Rationale |
|---|---|---|
| Logger | `pino` | Structured JSON, low overhead, Lambda-friendly |
| Log destination | stdout → CloudWatch Logs | Lambda automatic integration |
| Correlation ID | `uuid` v4 | Per-request requestId injected into all log entries |
| Metrics | CloudWatch built-in Lambda metrics | No additional instrumentation needed at this scale |
| Alarms | CDK-defined CloudWatch Alarms | Error rate and duration alarms (SECURITY-14) |

---

## Code Quality

| Decision | Choice | Rationale |
|---|---|---|
| Linter | ESLint + `@typescript-eslint` | TypeScript-aware linting |
| Formatter | Prettier | Consistent code style |
| Pre-commit hooks | `husky` + `lint-staged` | Enforce lint/format before commit |
| Build | `tsc` + `esbuild` (Lambda bundle) | Fast bundling, tree-shaking for Lambda package size |

---

## Key Dependencies Summary

```json
{
  "dependencies": {
    "express": "^4.x",
    "@vendia/serverless-express": "^4.x",
    "mongoose": "^8.x",
    "jsonwebtoken": "^9.x",
    "bcrypt": "^5.x",
    "zod": "^3.x",
    "express-rate-limit": "^7.x",
    "pino": "^8.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "jest": "^29.x",
    "ts-jest": "^29.x",
    "supertest": "^6.x",
    "fast-check": "^3.x",
    "mongodb-memory-server": "^9.x",
    "aws-cdk-lib": "^2.x",
    "esbuild": "^0.x",
    "eslint": "^8.x",
    "@typescript-eslint/eslint-plugin": "^6.x",
    "prettier": "^3.x",
    "husky": "^8.x",
    "lint-staged": "^15.x"
  }
}
```

---

## PBT-09 Compliance

- **Framework selected**: fast-check v3
- **Supports**: custom generators (Arbitrary), automatic shrinking, seed-based reproducibility, Jest integration
- **Documented**: in this tech stack decisions file
- **Included as dependency**: `fast-check` in devDependencies
- **Status**: Compliant ✅
