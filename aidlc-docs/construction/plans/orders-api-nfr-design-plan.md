# NFR Design Plan — orders-api

## Execution Checklist

- [x] Step A: Design resilience patterns (retry, timeout, circuit breaker)
- [x] Step B: Design scalability patterns (connection pooling, Lambda warm-up)
- [x] Step C: Design performance patterns (caching, indexing, response shaping)
- [x] Step D: Design security patterns (middleware chain, token storage, CORS)
- [x] Step E: Define logical components (rate limiter, token store, middleware pipeline)
- [x] Step F: Generate nfr-design-patterns.md
- [x] Step G: Generate logical-components.md

---

## Clarifying Questions

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
Let me know when you're done.

---

## Question 1 — Resilience Patterns
Should the API implement retry logic for transient MongoDB connection failures?

A) Yes — automatic retry with exponential backoff (up to 3 attempts) on connection errors
B) No — fail fast on first error, return 503 to client immediately
C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 2 — Resilience Patterns
Should Lambda provisioned concurrency be used to eliminate cold starts?

A) Yes — provision at least 1 warm instance to guarantee sub-second response on first request
B) No — accept occasional cold starts (< 2s); cost not justified at low volume
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 3 — Scalability Patterns
Where should the refresh token be stored server-side for validation and revocation?

A) In-memory (Lambda) — simplest, but tokens cannot be revoked across Lambda instances
B) MongoDB — persist refresh tokens in a dedicated collection; supports revocation
C) Redis (ElastiCache) — fastest lookup, supports TTL-based expiry and revocation
D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 4 — Performance Patterns
Should API responses compress large payloads (e.g. list orders with many items)?

A) Yes — enable gzip/brotli compression via Express middleware (`compression` package)
B) No — payloads are small enough at this scale; skip compression overhead
C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 5 — Security Patterns
How should CORS be configured?

A) Strict — explicit allowlist of origins defined in config (e.g. `https://app.example.com`)
B) Development-permissive — allow all origins in dev, strict allowlist in production
C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 6 — Security Patterns
Should the brute-force login lockout be tracked in-memory (per Lambda instance) or in a shared store?

A) In-memory — simplest; lockout resets on Lambda restart or new instance (acceptable for low volume)
B) MongoDB — shared across all Lambda instances; persistent lockout
C) Redis (ElastiCache) — shared, fast, TTL-based expiry (best for distributed lockout)
D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 7 — Logical Components
Should a request logging middleware emit logs for every request (including successful ones)?

A) Yes — log all requests with method, path, status code, and duration (full audit trail)
B) No — log only errors and warnings (reduce CloudWatch costs)
C) Other (please describe after [Answer]: tag below)

[Answer]: A
