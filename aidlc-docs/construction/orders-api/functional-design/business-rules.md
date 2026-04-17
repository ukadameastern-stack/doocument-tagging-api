# Business Rules — orders-api

---

## BR-01: Customer ID Ownership

- On create: `customerId` in request body must match JWT `sub` claim, UNLESS the caller has `role: admin`
- Admin may supply any `customerId`
- If `customerId` does not match JWT `sub` and caller is not admin → reject with `403 Forbidden`

---

## BR-02: Object-Level Authorization (IDOR Prevention)

- On read, update, cancel, delete: fetch the order first, then verify `order.customerId === requestingUser.userId` OR `requestingUser.role === 'admin'`
- If ownership check fails → reject with `403 Forbidden`
- If order does not exist (or is soft-deleted) → reject with `404 Not Found`
- **Rule**: Authorization check MUST occur after existence check — never leak existence via 403

---

## BR-03: totalAmount Computation

- `totalAmount = sum of (item.quantity × item.unitPrice)` for all items in the order
- Computed on every create and update that modifies items
- Stored in the document — not recomputed on reads
- Result rounded to 2 decimal places
- Must always equal the sum of items — this is a testable invariant (PBT-03)

---

## BR-04: Status State Machine

Valid transitions (strict enforcement):

| From | Allowed Next Statuses |
|---|---|
| `PENDING` | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `PROCESSING`, `CANCELLED` |
| `PROCESSING` | `SHIPPED`, `CANCELLED` |
| `SHIPPED` | `DELIVERED`, `CANCELLED` |
| `DELIVERED` | _(terminal — no transitions allowed)_ |
| `CANCELLED` | _(terminal — no transitions allowed)_ |

- Any attempt to transition to an invalid next status → reject with `409 Conflict`
- Status field on Order is only mutated via `cancelOrder` or admin `updateOrder` (status field)
- Customer `updateOrder` (PUT) MUST NOT allow status changes — status is excluded from customer update DTO

---

## BR-05: Update Restrictions by Status

- Customer `updateOrder`: only allowed when `order.status === 'PENDING'`
- If order is in any other status → reject with `409 Conflict` and message: "Order can only be updated in PENDING status"
- Admin `updateOrder`: no status restriction on field updates (admin may update any order regardless of status)
- Neither customer nor admin may set `createdAt`, `orderId`, or `deletedAt` via update

---

## BR-06: Cancellation Rules

- Customer: may cancel any order where `status !== 'DELIVERED'` and `status !== 'CANCELLED'`
- Admin: may cancel any order regardless of status (except already `CANCELLED`)
- Cancellation sets `status = 'CANCELLED'` and updates `updatedAt`
- Cancelling an already-cancelled order → reject with `409 Conflict`
- Cancelling a DELIVERED order (customer) → reject with `409 Conflict`

---

## BR-07: Soft Delete

- `deleteOrder` sets `deletedAt = now()` and updates `updatedAt` — document is NOT removed from MongoDB
- All queries (findById, findAll) MUST filter `deletedAt: null` by default
- Attempting to read, update, cancel, or delete a soft-deleted order → `404 Not Found`
- Soft-deleted orders are excluded from list results

---

## BR-08: Item Validation Rules

- Minimum 1 item per order; maximum 50 items per order
- Each item: `quantity` must be integer >= 1
- Each item: `unitPrice` must be number > 0
- Each item: `productId` required, non-empty string
- Each item: `productName` required, non-empty string, max 200 chars
- Violations → `400 Bad Request` with field-level error details

---

## BR-09: List Orders Scoping

- Customer: `customerId` filter is always forced to `requestingUser.userId` — client-supplied `customerId` filter is ignored
- Admin: all filters applied as supplied; no forced scoping
- Default pagination: `page=1`, `limit=20`; max `limit=100`
- Default sort: `createdAt` descending
- Soft-deleted orders always excluded from list results

---

## BR-10: Immutable Fields

The following fields MUST NOT be modifiable after creation under any circumstances:
- `orderId`
- `createdAt`
- `deletedAt` (managed only by soft-delete logic, not via update endpoints)

---

## Error Type Catalogue

| Error Type | HTTP Status | Trigger |
|---|---|---|
| `ValidationError` | 400 | Invalid request body or query params (Zod) |
| `UnauthorizedError` | 401 | Missing or invalid JWT |
| `ForbiddenError` | 403 | Ownership check failed or role insufficient |
| `NotFoundError` | 404 | Order not found or soft-deleted |
| `ConflictError` | 409 | Invalid status transition, update on non-PENDING, cancel on DELIVERED/CANCELLED |
| `InternalError` | 500 | Unhandled exception (generic message returned to client) |
