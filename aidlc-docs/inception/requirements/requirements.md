# Requirements Document — Customer Orders REST API

## Intent Analysis

- **User Request**: Create a REST API for managing customer orders with CRUD operations
- **Request Type**: New Project (Greenfield)
- **Scope**: Single service — REST API with persistence, auth, and deployment
- **Complexity**: Moderate-High (JWT auth, full filtering/sorting/pagination, serverless deployment, full test suite, security + PBT extensions enforced)

---

## Functional Requirements

### FR-01: Order CRUD Operations
- **Create** a new order (`POST /orders`)
- **Read** a single order by ID (`GET /orders/:id`)
- **List** all orders with full filtering, sorting, and pagination (`GET /orders`)
- **Update** an existing order (`PUT /orders/:id`)
- **Delete** an order (`DELETE /orders/:id`)

### FR-02: Order Data Model
Each order contains:
- `orderId` — unique identifier (auto-generated UUID)
- `customerId` — reference to the customer
- `items` — array of order items, each with:
  - `productId`
  - `productName`
  - `quantity`
  - `unitPrice`
- `totalAmount` — computed total (sum of quantity × unitPrice)
- `status` — one of: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`
- `shippingAddress` — object with street, city, state, postalCode, country
- `paymentMethod` — e.g., `CREDIT_CARD`, `DEBIT_CARD`, `PAYPAL`, `BANK_TRANSFER`
- `notes` — optional free-text field
- `createdAt` — ISO 8601 timestamp (auto-set on creation)
- `updatedAt` — ISO 8601 timestamp (auto-updated on modification)

### FR-03: Order Status Lifecycle
Supported statuses: `PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED` / `CANCELLED`

### FR-04: List Orders — Filtering, Sorting, Pagination
- Filter by: `customerId`, `status`, `createdAt` (date range)
- Sort by: `createdAt`, `totalAmount`, `status` (asc/desc)
- Pagination: `page` (1-based) and `limit` (default 20, max 100)
- Response includes: `data[]`, `total`, `page`, `limit`, `totalPages`

### FR-05: Authentication
- All endpoints require a valid JWT Bearer token
- JWT validated server-side on every request (signature, expiration, audience, issuer)
- Unauthenticated requests return `401 Unauthorized`

### FR-06: Authorization
- Users may only access/modify their own orders (object-level authorization — IDOR prevention)
- Admin role may access all orders
- Unauthorized access returns `403 Forbidden`

---

## Non-Functional Requirements

### NFR-01: Technology Stack
- **Runtime**: Node.js (LTS)
- **Framework**: Express
- **Database**: MongoDB (via Mongoose ODM)
- **Auth**: JWT (jsonwebtoken library)
- **Deployment**: AWS Lambda (serverless)
- **IaC**: AWS SAM or Serverless Framework

### NFR-02: Performance
- API response time < 300ms (p95) for single-item operations
- List endpoint < 500ms (p95) with pagination applied
- MongoDB indexes on `customerId`, `status`, `createdAt`

### NFR-03: Security (Security Extension — ENFORCED)
- SECURITY-01: MongoDB Atlas encryption at rest + TLS in transit
- SECURITY-03: Structured logging (no PII/tokens in logs), correlation ID per request
- SECURITY-05: Input validation on all request bodies and query params (Joi or Zod)
- SECURITY-06: Least-privilege IAM roles for Lambda execution
- SECURITY-07: Lambda in VPC with restrictive security groups; MongoDB accessible only from Lambda SG
- SECURITY-08: JWT validation middleware on all routes; object-level ownership check per request
- SECURITY-09: Generic error responses in production (no stack traces)
- SECURITY-10: package-lock.json committed; npm audit in CI
- SECURITY-11: Auth/validation logic in dedicated middleware modules; rate limiting on public endpoints
- SECURITY-12: No hardcoded credentials; secrets via AWS Secrets Manager or SSM Parameter Store
- SECURITY-15: Global error handler; all DB/external calls wrapped in try/catch; fail-closed on error

### NFR-04: Testing (Full Suite)
- Unit tests for business logic, validators, and middleware
- Integration tests for API endpoints (against real or in-memory MongoDB)
- Contract/e2e tests for end-to-end order lifecycle
- Property-based tests (PBT Extension — ENFORCED, full mode)

### NFR-05: Property-Based Testing (PBT Extension — ENFORCED)
- PBT-01: Identify testable properties during functional design
- PBT-02: Round-trip tests for order serialization/deserialization
- PBT-03: Invariant tests (e.g., totalAmount always equals sum of items)
- PBT-04: Idempotency tests for PUT and DELETE endpoints
- PBT-06: Stateful PBT for order status lifecycle transitions
- PBT-07: Domain-specific generators for Order, OrderItem, ShippingAddress
- PBT-08: Shrinking enabled; seed logged in CI
- PBT-09: Framework — **fast-check** (integrates with Jest)
- PBT-10: PBT complements example-based tests; critical paths have both

### NFR-06: Observability
- Structured JSON logs with: timestamp, requestId, level, message
- No PII or tokens in logs
- AWS CloudWatch log group with 90-day retention

### NFR-07: Deployment
- AWS Lambda + API Gateway (HTTP API)
- Environment-based config (dev, staging, prod)
- Secrets via AWS Secrets Manager

---

## Constraints
- No frontend — API only
- MongoDB Atlas as managed database (not self-hosted)
- Node.js LTS version (pinned in package.json engines field)

---

## Success Criteria
- All 5 CRUD endpoints functional and tested
- JWT auth enforced on all routes
- Object-level authorization prevents cross-customer data access
- Full test suite passes (unit + integration + e2e + PBT)
- Deployable to AWS Lambda via SAM/Serverless Framework
- No hardcoded secrets; all credentials via AWS Secrets Manager
