# Component Dependencies — Customer Orders REST API

---

## Dependency Matrix

| Component | Depends On | Communication Pattern |
|---|---|---|
| AuthController | AuthService | Direct method call |
| AuthService | Logger, Secrets Manager (config) | Direct call / env config |
| AuthMiddleware | AuthService (verifyToken) | Direct method call |
| OrderController | OrderService, Logger | Direct method call |
| OrderService | OrderRepository, Logger | Direct method call |
| OrderRepository | OrderModel (Mongoose) | Mongoose ODM |
| ValidationMiddleware | Zod schemas | Schema evaluation |
| ErrorHandler | Logger | Direct call |
| Logger | — (leaf node) | stdout |
| OrderModel | MongoDB (Atlas) | Mongoose/MongoDB driver |

---

## Dependency Rules

- Controllers MUST NOT call Repository directly — always via Service
- Services MUST NOT import other Services (no service-to-service calls in this single-unit design)
- Middleware MUST NOT contain business logic — delegate to Services
- Repository MUST NOT contain business logic — pure data access only
- Logger is the only cross-cutting dependency allowed at all layers

---

## Request Flow — Authenticated Order Request

```
HTTP Request
  |
  v
AuthMiddleware          (validates JWT, attaches req.user)
  |
  v
ValidationMiddleware    (validates body/query via Zod schema)
  |
  v
OrderController         (parses request, calls service)
  |
  v
OrderService            (business logic, authorization check)
  |
  v
OrderRepository         (data access via Mongoose)
  |
  v
MongoDB Atlas           (persistence)
  |
  v
OrderService            (returns result)
  |
  v
OrderController         (formats HTTP response)
  |
  v
HTTP Response
```

---

## Error Flow

```
Any Layer throws Error
  |
  v
next(err) / thrown exception
  |
  v
ErrorHandler middleware  (maps to HTTP status, logs via Logger)
  |
  v
HTTP Error Response      (generic message, no internals)
```

---

## Module Structure (src/)

```
src/
  app.ts                  # Express/Fastify app setup, middleware registration
  server.ts               # Lambda handler entry point
  auth/
    auth.controller.ts
    auth.service.ts
    auth.middleware.ts
    auth.routes.ts
    auth.schemas.ts       # Zod schemas for auth endpoints
  orders/
    order.controller.ts
    order.service.ts
    order.repository.ts
    order.model.ts        # Mongoose schema
    order.routes.ts
    order.schemas.ts      # Zod schemas for order endpoints
    order.types.ts        # Shared types (DTOs, interfaces)
  middleware/
    error-handler.ts
    validate.ts           # Generic validation middleware factory
  utils/
    logger.ts
  config/
    index.ts              # Environment config (reads from Secrets Manager / env vars)
```
