# User Stories — Customer Orders REST API

**Breakdown Approach**: Feature-Based
**Acceptance Criteria Level**: Minimal (happy path)
**Personas**: Customer (Alex), Admin (Jordan)

---

## Epic 1: Authentication

### US-01: Customer Login
**As a** customer,
**I want to** log in with my credentials and receive a JWT,
**so that** I can authenticate subsequent API requests.

**Acceptance Criteria**:
- Given valid credentials, the API returns a signed JWT with `sub` (customerId) and `role: customer` claims
- The JWT has a defined expiration time

---

## Epic 2: Order Management — Customer

### US-02: Place an Order
**As a** customer,
**I want to** create a new order with items, shipping address, and payment method,
**so that** my purchase is recorded and can be fulfilled.

**Acceptance Criteria**:
- Given a valid JWT and a well-formed request body, the API creates the order with status `PENDING` and returns the created order with a generated `orderId`
- `totalAmount` is automatically calculated from item quantities and unit prices

---

### US-03: View My Order
**As a** customer,
**I want to** retrieve the details of one of my orders by ID,
**so that** I can see its current status and contents.

**Acceptance Criteria**:
- Given a valid JWT and an `orderId` that belongs to the authenticated customer, the API returns the full order document

---

### US-04: List My Orders
**As a** customer,
**I want to** list all my orders with optional filtering and sorting,
**so that** I can browse my order history.

**Acceptance Criteria**:
- Given a valid JWT, the API returns a paginated list of orders belonging to the authenticated customer
- Results can be filtered by `status` and sorted by `createdAt` or `totalAmount`
- Response includes `data`, `total`, `page`, `limit`, and `totalPages`

---

### US-05: Update My Order
**As a** customer,
**I want to** update the details of a pending order (e.g., shipping address, notes),
**so that** I can correct mistakes before the order is processed.

**Acceptance Criteria**:
- Given a valid JWT and an `orderId` belonging to the customer, the API updates the order and returns the updated document with a refreshed `updatedAt` timestamp

---

### US-06: Cancel My Order
**As a** customer,
**I want to** cancel one of my orders,
**so that** I can stop fulfilment if I change my mind.

**Acceptance Criteria**:
- Given a valid JWT and an `orderId` belonging to the customer, the API sets the order status to `CANCELLED` and returns the updated order

---

### US-07: Delete My Order
**As a** customer,
**I want to** permanently delete one of my orders,
**so that** it is removed from my history.

**Acceptance Criteria**:
- Given a valid JWT and an `orderId` belonging to the customer, the API deletes the order and returns a `204 No Content` response

---

## Epic 3: Order Management — Admin

### US-08: List All Orders (Admin)
**As an** admin,
**I want to** list all orders across all customers with filtering, sorting, and pagination,
**so that** I can monitor and manage fulfilment operations.

**Acceptance Criteria**:
- Given a valid JWT with `role: admin`, the API returns a paginated list of all orders
- Results can be filtered by `customerId`, `status`, and `createdAt` date range, and sorted by any supported field

---

### US-09: View Any Order (Admin)
**As an** admin,
**I want to** retrieve the full details of any order by ID regardless of which customer placed it,
**so that** I can investigate or action specific orders.

**Acceptance Criteria**:
- Given a valid JWT with `role: admin` and any valid `orderId`, the API returns the full order document

---

### US-10: Update Any Order Status (Admin)
**As an** admin,
**I want to** update the status and details of any order,
**so that** I can progress orders through the fulfilment lifecycle.

**Acceptance Criteria**:
- Given a valid JWT with `role: admin` and a valid `orderId`, the API updates the order and returns the updated document

---

### US-11: Delete Any Order (Admin)
**As an** admin,
**I want to** permanently delete any order,
**so that** I can remove erroneous or test orders from the system.

**Acceptance Criteria**:
- Given a valid JWT with `role: admin` and a valid `orderId`, the API deletes the order and returns `204 No Content`

---

## Story Summary

| Story | Persona | Feature | Endpoint |
|---|---|---|---|
| US-01 | Customer | Login / Token Issuance | `POST /auth/login` |
| US-02 | Customer | Create Order | `POST /orders` |
| US-03 | Customer | View Own Order | `GET /orders/:id` |
| US-04 | Customer | List Own Orders | `GET /orders` |
| US-05 | Customer | Update Own Order | `PUT /orders/:id` |
| US-06 | Customer | Cancel Own Order | `PATCH /orders/:id/cancel` |
| US-07 | Customer | Delete Own Order | `DELETE /orders/:id` |
| US-08 | Admin | List All Orders | `GET /orders` |
| US-09 | Admin | View Any Order | `GET /orders/:id` |
| US-10 | Admin | Update Any Order | `PUT /orders/:id` |
| US-11 | Admin | Delete Any Order | `DELETE /orders/:id` |
