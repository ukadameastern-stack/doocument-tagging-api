# Requirements Clarification Questions

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
If none of the options match your needs, choose the last option (Other) and describe your preference.
Let me know when you're done.

---

## Question 1
What programming language / framework should be used for the REST API?

A) Java with Spring Boot
B) Python with FastAPI or Flask
C) Node.js with Express or Fastify
D) Go (net/http or Gin)
E) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 2
What database should be used to persist orders?

A) PostgreSQL (relational)
B) MySQL (relational)
C) MongoDB (document NoSQL)
D) SQLite (lightweight, local)
E) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 3
What fields should a customer order contain?

A) Minimal — orderId, customerId, items (list), status, createdAt
B) Standard — orderId, customerId, items (with product/quantity/price), totalAmount, status, createdAt, updatedAt
C) Extended — all of Standard plus shippingAddress, paymentMethod, notes
D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 4
What order statuses should be supported?

A) Simple — PENDING, COMPLETED, CANCELLED
B) Standard — PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
C) Custom (please describe after [Answer]: tag below)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 5
Should the API require authentication / authorization?

A) No authentication (open API — suitable for internal/PoC use)
B) API key authentication
C) JWT-based authentication
D) OAuth2 / OpenID Connect
E) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 6
What pagination / filtering should be supported on the list orders endpoint?

A) No pagination or filtering (return all orders)
B) Pagination only (page + size)
C) Pagination + filter by customerId and status
D) Full filtering + sorting + pagination
E) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question 7
Should the API be containerized / deployable to AWS?

A) No — local development only
B) Yes — Docker container only
C) Yes — Docker + AWS ECS/Fargate
D) Yes — AWS Lambda (serverless)
E) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question 8
What level of testing is required?

A) No tests
B) Unit tests only
C) Unit tests + integration tests
D) Unit tests + integration tests + contract/e2e tests
E) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)
B) Partial — enforce PBT rules only for pure functions and serialization round-trips
C) No — skip all PBT rules (suitable for simple CRUD applications or thin integration layers)
X) Other (please describe after [Answer]: tag below)

[Answer]: A
