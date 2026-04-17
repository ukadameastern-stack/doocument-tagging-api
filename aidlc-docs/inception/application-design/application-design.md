# Application Design — Customer Orders REST API

**Architecture Pattern**: 3-layer (Controller → Service → Repository)
**Auth Structure**: Dedicated Auth module (AuthController + AuthService + AuthMiddleware)
**Domain Organization**: Single module per domain (`auth/`, `orders/`)
**Validation**: Dedicated Zod middleware schemas, applied at route level
**Error Handling**: Centralized global error handler middleware

---

## 1. Components

| Component | Layer | Module | Responsibility |
|---|---|---|---|
| AuthController | Controller | `src/auth/` | Handle login HTTP request, return JWT |
| AuthService | Service | `src/auth/` | Validate credentials, issue/verify JWTs |
| AuthMiddleware | Middleware | `src/auth/` | Validate Bearer token, attach `req.user` |
| OrderController | Controller | `src/orders/` | Handle order CRUD HTTP requests |
| OrderService | Service | `src/orders/` | Order business logic, authorization, orchestration |
| OrderRepository | Repository | `src/orders/` | MongoDB/Mongoose data access for orders |
| OrderModel | Data Model | `src/orders/` | Mongoose schema, indexes |
| ValidationMiddleware | Middleware | `src/middleware/` | Zod schema validation for body/query |
| ErrorHandler | Middleware | `src/middleware/` | Centralized error-to-HTTP mapping |
| Logger | Utility | `src/utils/` | Structured JSON logging, correlation ID |

---

## 2. Key Method Signatures

### AuthController
- `login(req, res)` → POST /auth/login → `{ token, expiresIn }`

### AuthService
- `login({ email, password })` → `{ token, expiresIn }`
- `verifyToken(token)` → `DecodedPayload`

### AuthMiddleware
- `authenticate(req, res, next)` → attaches `req.user = { userId, role }` or 401

### OrderController
- `createOrder(req, res)` → POST /orders → 201 + Order
- `getOrder(req, res)` → GET /orders/:id → 200 + Order
- `listOrders(req, res)` → GET /orders → 200 + PaginatedResult
- `updateOrder(req, res)` → PUT /orders/:id → 200 + Order
- `cancelOrder(req, res)` → PATCH /orders/:id/cancel → 200 + Order
- `deleteOrder(req, res)` → DELETE /orders/:id → 204

### OrderService
- `createOrder(dto, requestingUser)` → Order
- `getOrderById(orderId, requestingUser)` → Order
- `listOrders(query, requestingUser)` → PaginatedResult
- `updateOrder(orderId, dto, requestingUser)` → Order
- `cancelOrder(orderId, requestingUser)` → Order
- `deleteOrder(orderId, requestingUser)` → void

### OrderRepository
- `create(data)` → Order
- `findById(orderId)` → Order | null
- `findAll(filters, pagination, sort)` → PaginatedResult
- `update(orderId, data)` → Order | null
- `delete(orderId)` → void

---

## 3. Service Orchestration

- **AuthService** owns all credential validation and JWT issuance — isolated per SECURITY-11
- **OrderService** enforces object-level authorization (IDOR prevention) before every data operation
- **ValidationMiddleware** short-circuits invalid requests before they reach controllers
- **AuthMiddleware** populates `req.user` for all protected routes
- **ErrorHandler** is the last middleware — catches all unhandled errors, returns generic responses

---

## 4. Component Dependencies

```
HTTP Request
  └── AuthMiddleware → AuthService.verifyToken
  └── ValidationMiddleware → Zod schemas
  └── OrderController → OrderService → OrderRepository → MongoDB
  └── [any error] → ErrorHandler → Logger
```

**Rules**:
- Controllers never call Repository directly
- Services never call other Services
- Repository contains no business logic
- Logger is the only cross-cutting dependency

---

## 5. Module Structure

```
src/
  app.ts
  server.ts               # Lambda entry point
  auth/
    auth.controller.ts
    auth.service.ts
    auth.middleware.ts
    auth.routes.ts
    auth.schemas.ts
  orders/
    order.controller.ts
    order.service.ts
    order.repository.ts
    order.model.ts
    order.routes.ts
    order.schemas.ts
    order.types.ts
  middleware/
    error-handler.ts
    validate.ts
  utils/
    logger.ts
  config/
    index.ts
```
