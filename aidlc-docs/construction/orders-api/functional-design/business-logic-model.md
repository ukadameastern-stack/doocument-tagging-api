# Business Logic Model — orders-api

---

## Operation: createOrder

**Trigger**: POST /orders (authenticated customer or admin)

**Flow**:
1. Validate request body via Zod schema (BR-08)
2. Verify `customerId` matches JWT `sub` or caller is admin (BR-01)
3. Compute `totalAmount = sum(item.quantity × item.unitPrice)`, round to 2dp (BR-03)
4. Set `status = PENDING`, `createdAt = now()`, `updatedAt = now()`, `deletedAt = null`
5. Persist via OrderRepository.create
6. Return created order with `201 Created`

**Error exits**: 400 (validation), 403 (customerId mismatch)

---

## Operation: getOrderById

**Trigger**: GET /orders/:id (authenticated)

**Flow**:
1. Fetch order via OrderRepository.findById (excludes soft-deleted)
2. If not found → 404
3. Verify ownership: `order.customerId === userId` OR `role === admin` (BR-02)
4. If ownership fails → 403
5. Return order with `200 OK`

**Error exits**: 401 (no token), 403 (ownership), 404 (not found/deleted)

---

## Operation: listOrders

**Trigger**: GET /orders (authenticated)

**Flow**:
1. Validate query params via Zod schema
2. If `role === customer`: force `filters.customerId = userId` (BR-09)
3. If `role === admin`: use filters as supplied
4. Apply default pagination (`page=1`, `limit=20`) and sort (`createdAt desc`) if not provided
5. Clamp `limit` to max 100
6. Execute OrderRepository.findAll(filters, pagination, sort) — always excludes soft-deleted
7. Return `{ data, total, page, limit, totalPages }` with `200 OK`

**Error exits**: 400 (invalid query params), 401 (no token)

---

## Operation: updateOrder

**Trigger**: PUT /orders/:id (authenticated)

**Flow**:
1. Validate request body via Zod schema
2. Fetch order via OrderRepository.findById (excludes soft-deleted)
3. If not found → 404
4. Verify ownership (BR-02)
5. If `role === customer` AND `order.status !== PENDING` → 409 Conflict (BR-05)
6. Strip immutable fields from update payload (BR-10)
7. Strip `status` field from customer update payload (BR-04)
8. If items changed: recompute `totalAmount` (BR-03)
9. Set `updatedAt = now()`
10. Persist via OrderRepository.update
11. Return updated order with `200 OK`

**Error exits**: 400 (validation), 401, 403 (ownership), 404, 409 (non-PENDING for customer)

---

## Operation: cancelOrder

**Trigger**: PATCH /orders/:id/cancel (authenticated)

**Flow**:
1. Fetch order via OrderRepository.findById (excludes soft-deleted)
2. If not found → 404
3. Verify ownership (BR-02)
4. If `role === customer` AND `order.status === DELIVERED` → 409 Conflict (BR-06)
5. If `order.status === CANCELLED` → 409 Conflict (BR-06)
6. Validate transition: current status → CANCELLED is valid per state machine (BR-04)
7. Set `status = CANCELLED`, `updatedAt = now()`
8. Persist via OrderRepository.update
9. Return updated order with `200 OK`

**Error exits**: 401, 403, 404, 409 (already cancelled or DELIVERED for customer)

---

## Operation: deleteOrder

**Trigger**: DELETE /orders/:id (authenticated)

**Flow**:
1. Fetch order via OrderRepository.findById (excludes soft-deleted)
2. If not found → 404
3. Verify ownership (BR-02)
4. Set `deletedAt = now()`, `updatedAt = now()` (soft delete — BR-07)
5. Persist via OrderRepository.update
6. Return `204 No Content`

**Error exits**: 401, 403, 404

---

## Operation: login

**Trigger**: POST /auth/login (unauthenticated)

**Flow**:
1. Validate request body (`email`, `password`) via Zod schema
2. Look up user by email
3. If not found → 401 Unauthorized (generic message — do not reveal user existence)
4. Verify password hash (bcrypt compare)
5. If invalid → 401 Unauthorized
6. Issue JWT: `{ sub: userId, role, iat, exp: now + TTL, aud, iss }`
7. Return `{ token, expiresIn }` with `200 OK`

**Error exits**: 400 (validation), 401 (invalid credentials — generic message)

---

## PBT-01: Testable Properties Identification

### OrderService / OrderItem computation
| Property | Category | Description |
|---|---|---|
| totalAmount invariant | Invariant (PBT-03) | `order.totalAmount === sum(item.quantity × item.unitPrice)` for all valid orders |
| totalAmount recomputation | Round-trip (PBT-02) | Updating items and re-reading order yields consistent totalAmount |
| Status state machine | Invariant (PBT-03) | After any valid transition, status is always one of the 6 valid values |
| Soft-delete exclusion | Invariant (PBT-03) | Soft-deleted orders never appear in findAll or findById results |
| Pagination invariant | Invariant (PBT-03) | `totalPages === ceil(total / limit)` for all valid pagination inputs |
| Order serialization | Round-trip (PBT-02) | Serialize Order to JSON and deserialize back yields identical document |
| cancelOrder idempotency | Idempotency (PBT-04) | Cancelling an already-cancelled order returns 409 (not a state change) |
| PUT idempotency | Idempotency (PBT-04) | Applying the same update twice yields the same result |
| Order lifecycle | Stateful (PBT-06) | Random valid command sequences on an order maintain state machine invariants |
| IDOR prevention | Invariant (PBT-03) | Customer A can never read/modify Customer B's orders across generated user pairs |

### Components with no PBT properties
| Component | Rationale |
|---|---|
| AuthMiddleware | Pure pass/fail token validation — no domain invariants |
| Logger | Side-effect only utility — no testable properties |
| ErrorHandler | Mapping function — covered by example-based tests |

---

## Security Compliance Summary (Functional Design)

| Rule | Status | Notes |
|---|---|---|
| SECURITY-01 | N/A | Infrastructure concern — addressed in Infrastructure Design |
| SECURITY-02 | N/A | Infrastructure concern — addressed in Infrastructure Design |
| SECURITY-03 | Compliant | Logger defined with structured output, no PII/tokens in log fields |
| SECURITY-04 | N/A | No HTML-serving endpoints — REST API only |
| SECURITY-05 | Compliant | Zod validation on all endpoints defined in BR-08; item constraints explicit |
| SECURITY-06 | N/A | Infrastructure concern — addressed in Infrastructure Design |
| SECURITY-07 | N/A | Infrastructure concern — addressed in Infrastructure Design |
| SECURITY-08 | Compliant | BR-02 defines object-level authorization on every operation; BR-04 prevents customer status manipulation |
| SECURITY-09 | Compliant | Error catalogue defines generic messages for 500; no stack traces in production |
| SECURITY-10 | N/A | Build/dependency concern — addressed in Build and Test |
| SECURITY-11 | Compliant | Auth logic isolated in AuthService/AuthMiddleware; rate limiting noted for NFR Design |
| SECURITY-12 | Compliant | Login flow uses bcrypt; generic 401 on failure (no user existence leak); JWT claims defined |
| SECURITY-13 | N/A | No deserialization of untrusted binary data; CI/CD addressed in Build and Test |
| SECURITY-14 | N/A | Alerting/monitoring — addressed in Infrastructure Design |
| SECURITY-15 | Compliant | All operation flows have explicit error exits; fail-closed on ownership failure; global error handler defined |

## PBT Compliance Summary (Functional Design)

| Rule | Status | Notes |
|---|---|---|
| PBT-01 | Compliant | 10 testable properties identified across 5 categories; 3 components marked N/A with rationale |
| PBT-02 | Compliant | Round-trip properties identified for serialization and totalAmount recomputation |
| PBT-03 | Compliant | Invariant properties identified: totalAmount, status values, soft-delete, pagination |
| PBT-04 | Compliant | Idempotency properties identified for cancelOrder and PUT updateOrder |
| PBT-05 | N/A | No reference/oracle implementation exists for this greenfield service |
| PBT-06 | Compliant | Stateful PBT identified for order lifecycle command sequences |
| PBT-07 through PBT-10 | N/A | Generator quality, shrinking, framework selection, and complementary strategy addressed in NFR Requirements and Code Generation |
