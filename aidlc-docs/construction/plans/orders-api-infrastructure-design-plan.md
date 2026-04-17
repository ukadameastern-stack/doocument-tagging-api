# Infrastructure Design Plan — orders-api

## Execution Checklist

- [x] Step A: Map compute infrastructure (Lambda configuration)
- [x] Step B: Map storage infrastructure (MongoDB Atlas, Redis)
- [x] Step C: Map networking infrastructure (VPC, API Gateway, security groups)
- [x] Step D: Map monitoring infrastructure (CloudWatch, alarms, dashboards)
- [x] Step E: Map secrets and IAM infrastructure
- [x] Step F: Define environment strategy (dev/staging/prod)
- [x] Step G: Generate infrastructure-design.md
- [x] Step H: Generate deployment-architecture.md

---

## Clarifying Questions

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
Let me know when you're done.

---

## Question 1 — Deployment Environment
How many deployment environments are needed?

A) Two — dev and prod
B) Three — dev, staging, and prod
C) One — prod only (simplest setup)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 2 — Deployment Environment
Which AWS region should be used for deployment?

A) us-east-1 (N. Virginia) — most services available, lowest cost
B) us-west-2 (Oregon) — popular alternative US region
C) eu-west-1 (Ireland) — EU region
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 3 — Compute Infrastructure
Should the Lambda function use a custom domain name via API Gateway?

A) Yes — configure a custom domain (e.g. `api.example.com`) with ACM certificate
B) No — use the default API Gateway URL (e.g. `https://{id}.execute-api.{region}.amazonaws.com`)
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4 — Storage Infrastructure
Should MongoDB Atlas be connected to the VPC via VPC Peering or AWS PrivateLink?

A) VPC Peering — Atlas VPC peered with Lambda VPC (standard, lower cost)
B) AWS PrivateLink — private endpoint in Lambda VPC (higher security, higher cost)
C) Public endpoint with IP allowlist — simpler but less secure (not recommended for production)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 5 — Networking Infrastructure
Should the Lambda function be placed inside a VPC?

A) Yes — Lambda in private VPC subnet (required for VPC Peering to Atlas and Redis access)
B) No — Lambda outside VPC (simpler, but cannot use VPC Peering or ElastiCache)
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 6 — Monitoring Infrastructure
Should a CloudWatch dashboard be created to visualise key metrics?

A) Yes — create a CDK-defined dashboard with Lambda invocations, errors, duration, and Redis/MongoDB metrics
B) No — rely on individual CloudWatch metrics and alarms without a consolidated dashboard
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 7 — Shared Infrastructure
Should the CDK stack be split into separate stacks (e.g. network stack, app stack) or a single stack?

A) Single stack — all resources in one CDK stack (simpler for small projects)
B) Two stacks — network stack (VPC, security groups) + app stack (Lambda, API GW, Redis, alarms)
C) Three stacks — network + data (MongoDB config, Redis) + app (Lambda, API GW)
D) Other (please describe after [Answer]: tag below)

[Answer]: B
