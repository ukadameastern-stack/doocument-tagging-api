# Components — Customer Orders REST API

**Architecture**: 3-layer (Controller → Service → Repository)

---

## Component: AuthController
**Layer**: Controller
**Module**: `src/auth/`
**Responsibility**: Handles HTTP requests for authentication. Receives login credentials, delegates to AuthService, and returns JWT response.

---

## Component: AuthService
**Layer**: Service
**Module**: `src/auth/`
**Responsibility**: Validates user credentials, issues signed JWTs with `sub` (userId/customerId) and `role` claims, and defines token expiration policy. Acts as the single source of truth for token creation.

---

## Component: AuthMiddleware
**Layer**: Middleware
**Module**: `src/auth/`
**Responsibility**: Validates JWT Bearer tokens on every protected route. Verifies signature, expiration, audience, and issuer. Attaches decoded payload (`userId`, `role`) to the request context. Rejects unauthenticated requests with `401`.

---

## Component: OrderController
**Layer**: Controller
**Module**: `src/orders/`
**Responsibility**: Handles all HTTP requests for order CRUD operations. Parses and validates request inputs (via validation middleware), delegates business logic to OrderService, and formats HTTP responses.

---

## Component: OrderService
**Layer**: Service
**Module**: `src/orders/`
**Responsibility**: Orchestrates order business logic — creates orders, computes `totalAmount`, enforces status lifecycle rules, applies object-level authorization (IDOR prevention), and coordinates with OrderRepository for persistence.

---

## Component: OrderRepository
**Layer**: Repository
**Module**: `src/orders/`
**Responsibility**: Abstracts all MongoDB/Mongoose interactions for orders. Provides CRUD operations, pagination, filtering, and sorting. No business logic — pure data access.

---

## Component: ValidationMiddleware
**Layer**: Middleware
**Module**: `src/middleware/`
**Responsibility**: Applies Zod schemas to validate request bodies and query parameters before they reach controllers. Rejects invalid requests with `400 Bad Request` and a structured error response. Schemas are defined per-endpoint.

---

## Component: ErrorHandler
**Layer**: Middleware (global)
**Module**: `src/middleware/`
**Responsibility**: Centralized Express/Fastify error handler. Catches all unhandled errors bubbled up from controllers and services. Maps error types to HTTP status codes. Returns generic error messages in production (no stack traces). Logs errors with correlation ID via Logger.

---

## Component: Logger
**Layer**: Cross-cutting utility
**Module**: `src/utils/`
**Responsibility**: Provides structured JSON logging with timestamp, requestId (correlation ID), log level, and message. Ensures no PII or tokens appear in log output. Routes output to stdout (captured by CloudWatch).

---

## Component: OrderModel (Mongoose Schema)
**Layer**: Data model
**Module**: `src/orders/`
**Responsibility**: Defines the MongoDB document schema for orders using Mongoose. Enforces field types, required fields, enum values for status, and index definitions (`customerId`, `status`, `createdAt`).

---
