# Application Design Plan — Customer Orders REST API

## Execution Checklist

- [x] Step A: Define components and responsibilities
- [x] Step B: Define component method signatures
- [x] Step C: Define service layer and orchestration
- [x] Step D: Define component dependencies and communication patterns
- [x] Step E: Generate components.md
- [x] Step F: Generate component-methods.md
- [x] Step G: Generate services.md
- [x] Step H: Generate component-dependency.md
- [x] Step I: Generate application-design.md (consolidated)

---

## Clarifying Questions

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
Let me know when you're done.

---

## Question 1
What architectural layering pattern should be used?

A) 3-layer — Controller → Service → Repository (standard MVC-style)
B) Clean Architecture — Controllers → Use Cases → Domain → Repository (strict dependency inversion)
C) Flat — Route handlers call repository directly (minimal layers, simple CRUD)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2
How should the authentication component be structured?

A) Middleware only — a single JWT validation middleware applied to all protected routes
B) Dedicated Auth module — separate AuthController (login), AuthService (token issuance/validation), and middleware
C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 3
How should the Order domain be organized?

A) Single module — OrderController, OrderService, OrderRepository all in one `orders/` folder
B) Split by concern — separate `controllers/`, `services/`, `repositories/` top-level folders
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4
Should input validation be a dedicated component or embedded in controllers?

A) Dedicated validation middleware/schemas — Zod or Joi schemas defined separately, applied as middleware before controllers
B) Inline in controllers — validation logic lives inside each route handler
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 5
How should errors be handled across the application?

A) Centralized global error handler middleware — all errors bubble up to a single Express/Fastify error handler
B) Per-controller try/catch — each controller handles its own errors and formats responses
C) Other (please describe after [Answer]: tag below)

[Answer]: A
