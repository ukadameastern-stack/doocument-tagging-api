# Services — Customer Orders REST API

---

## AuthService

**Purpose**: Owns all authentication and token logic. Isolates security-critical credential and JWT operations from the rest of the application (SECURITY-11).

**Responsibilities**:
- Validate user credentials against the user store
- Issue signed JWTs with `sub`, `role`, `iat`, `exp`, `aud`, `iss` claims
- Expose `verifyToken` for use by AuthMiddleware
- Never expose raw credentials or token secrets outside this service

**Orchestration**:
```
AuthController.login
  └── AuthService.login
        ├── validate credentials
        ├── sign JWT (jsonwebtoken, secret from Secrets Manager)
        └── return { token, expiresIn }
```

---

## OrderService

**Purpose**: Central orchestrator for all order business logic. Enforces authorization, business rules, and coordinates with OrderRepository for persistence.

**Responsibilities**:
- Compute `totalAmount` from order items on create/update
- Enforce object-level authorization: customers access only their own orders; admins access all (SECURITY-08)
- Apply status lifecycle rules (detailed in Functional Design)
- Delegate all data access to OrderRepository — no direct DB calls

**Orchestration — Create Order**:
```
OrderController.createOrder
  └── OrderService.createOrder
        ├── verify requestingUser.userId === dto.customerId (or admin)
        ├── compute totalAmount
        ├── set status = PENDING
        └── OrderRepository.create
```

**Orchestration — List Orders**:
```
OrderController.listOrders
  └── OrderService.listOrders
        ├── if role === 'customer': force filter customerId = requestingUser.userId
        ├── if role === 'admin': apply filters as-is
        └── OrderRepository.findAll(filters, pagination, sort)
```

**Orchestration — Get / Update / Cancel / Delete**:
```
OrderController.[action]
  └── OrderService.[action]
        ├── OrderRepository.findById
        ├── verify ownership (customerId === userId) or admin role
        ├── apply business logic (status rules, field updates)
        └── OrderRepository.[update | delete]
```

---

## Cross-Cutting Services

### Logger (utility)
- Used by all layers (controllers, services, middleware)
- Injects `requestId` correlation ID from request context
- Structured JSON output — no PII, no tokens

### ValidationMiddleware (applied at route level)
- Runs before controllers on all mutating and query endpoints
- Zod schemas defined alongside route definitions
- Failures short-circuit the request before reaching the controller

### AuthMiddleware (applied at router level)
- Applied to all routes except `POST /auth/login`
- Populates `req.user` for downstream use by controllers and services

### ErrorHandler (applied at app level)
- Registered as the last middleware in the Express/Fastify app
- Receives all errors thrown or passed via `next(err)`
- Maps known error types (NotFoundError, UnauthorizedError, ValidationError) to HTTP status codes
- Returns `{ error: 'message' }` — no internal details in production
