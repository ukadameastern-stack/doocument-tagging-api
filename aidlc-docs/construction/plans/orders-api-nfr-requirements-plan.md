# NFR Requirements Plan — orders-api

## Execution Checklist

- [x] Step A: Assess scalability and performance requirements
- [x] Step B: Assess availability and reliability requirements
- [x] Step C: Finalize security requirements
- [x] Step D: Finalize tech stack selections
- [x] Step E: Assess maintainability and observability requirements
- [x] Step F: Generate nfr-requirements.md
- [x] Step G: Generate tech-stack-decisions.md

---

## Clarifying Questions

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
Let me know when you're done.

---

## Question 1
What is the expected request volume for this API?

A) Low — up to 100 requests/minute (small user base, internal or early-stage)
B) Medium — up to 1,000 requests/minute (growing product, moderate traffic)
C) High — up to 10,000 requests/minute (production scale, significant user base)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2
What is the required availability SLA?

A) Best-effort — no formal SLA (dev/staging environment)
B) 99.9% uptime (~8.7 hours downtime/year)
C) 99.95% uptime (~4.4 hours downtime/year)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 3
Should the Lambda function be deployed in a single AWS region or multiple regions?

A) Single region — simpler deployment, acceptable for most use cases
B) Multi-region active-active — highest availability, more complex
C) Multi-region active-passive — failover only, moderate complexity
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4
What JWT token expiry time should be used?

A) Short — 15 minutes (high security, requires refresh token flow)
B) Medium — 1 hour (balanced security and usability)
C) Long — 24 hours (convenience-focused, lower security)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 5
Should a refresh token mechanism be implemented alongside the access JWT?

A) Yes — issue both access token (short-lived) and refresh token (long-lived)
B) No — single access token only, user re-authenticates when it expires
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 6
What rate limiting strategy should be applied to the API?

A) Per-IP rate limiting — limit requests per IP address (simple, no auth required)
B) Per-user rate limiting — limit requests per authenticated userId (more precise)
C) Both — per-IP on unauthenticated endpoints, per-user on authenticated endpoints
D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 7
What Node.js framework should be used — Express or Fastify?

A) Express — widely adopted, large ecosystem, familiar to most Node.js developers
B) Fastify — higher performance, built-in schema validation, lower overhead
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 8
What AWS Lambda deployment tool should be used?

A) AWS SAM (Serverless Application Model) — AWS-native, tight CloudFormation integration
B) Serverless Framework — multi-cloud, large plugin ecosystem, simpler syntax
C) AWS CDK (TypeScript) — full programmatic IaC, best for complex infrastructure
D) Other (please describe after [Answer]: tag below)

[Answer]: C
