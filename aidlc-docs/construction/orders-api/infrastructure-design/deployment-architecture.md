# Deployment Architecture — orders-api

**Region**: us-east-1 | **Environments**: dev, staging, prod

---

## Architecture Diagram (Text)

```
Internet
    |
    v
+---------------------------+
|  Amazon Route 53          |
|  api.example.com          |
+---------------------------+
    |
    v
+---------------------------+
|  ACM Certificate          |
|  (TLS termination)        |
+---------------------------+
    |
    v
+---------------------------+
|  API Gateway HTTP API     |
|  Throttling: 500 burst    |
|  CORS: strict allowlist   |
+---------------------------+
    |
    v
+=====================================================+
|  VPC: 10.0.0.0/16  (us-east-1)                    |
|                                                     |
|  +-----------------------------------------------+ |
|  |  Private Subnet AZ-a  (10.0.1.0/24)           | |
|  |                                                | |
|  |  +------------------+  +------------------+   | |
|  |  |  Lambda Function |  |  ElastiCache     |   | |
|  |  |  orders-api-prod |  |  Redis Serverless|   | |
|  |  |  512MB / 30s     |  |  (TLS + AUTH)    |   | |
|  |  |  Provisioned: 1  |  +------------------+   | |
|  |  +------------------+                          | |
|  |         |                                      | |
|  |         | (lambda-sg outbound)                 | |
|  |         v                                      | |
|  |  +------------------+                          | |
|  |  |  VPC Endpoint    |                          | |
|  |  |  (PrivateLink)   |                          | |
|  |  |  MongoDB Atlas   |                          | |
|  |  +------------------+                          | |
|  |                                                | |
|  |  +------------------+  +------------------+   | |
|  |  |  VPC Endpoint    |  |  VPC Endpoint    |   | |
|  |  |  Secrets Manager |  |  CloudWatch Logs |   | |
|  |  +------------------+  +------------------+   | |
|  +-----------------------------------------------+ |
|                                                     |
|  +-----------------------------------------------+ |
|  |  Public Subnet AZ-a  (10.0.0.0/24)            | |
|  |  NAT Gateway                                   | |
|  +-----------------------------------------------+ |
+=====================================================+
    |                              |
    v                              v
+------------------+    +------------------+
|  MongoDB Atlas   |    |  AWS Secrets     |
|  M10 Replica Set |    |  Manager         |
|  (PrivateLink)   |    |  jwt-secret      |
|  Encryption: on  |    |  mongodb-uri     |
|  Backup: PITR    |    |  redis-url       |
+------------------+    +------------------+

+------------------+    +------------------+
|  CloudWatch Logs |    |  CloudWatch      |
|  /aws/lambda/    |    |  Alarms +        |
|  orders-api-prod |    |  Dashboard       |
|  Retention: 90d  |    +------------------+
+------------------+
```

---

## CDK Stack Dependency Graph

```
NetworkStack (orders-api-network-{env})
  └── VPC
  └── Subnets (public + private)
  └── NAT Gateway
  └── Security Groups (lambda-sg, redis-sg)
  └── VPC Endpoints (Secrets Manager, CloudWatch Logs)
        |
        | (exports: vpcId, privateSubnetIds, lambdaSgId, redisSgId)
        v
AppStack (orders-api-app-{env})
  └── ElastiCache Serverless (Redis)
  └── Secrets Manager secrets
  └── IAM execution role
  └── Lambda function
  └── Lambda alias + provisioned concurrency (prod)
  └── API Gateway HTTP API
  └── Custom domain + ACM cert + Route 53 record
  └── CloudWatch Log Group
  └── CloudWatch Alarms + SNS topic
  └── CloudWatch Dashboard
```

---

## Deployment Flow

```
1. Developer pushes to main branch
        |
        v
2. CI pipeline (GitHub Actions / CodePipeline)
   - npm ci
   - npm run lint
   - npm run test (unit + integration + PBT)
   - npm run build (tsc + esbuild bundle)
   - npm audit (SECURITY-10)
        |
        v
3. CDK deploy NetworkStack (if changed)
   cdk deploy orders-api-network-{env}
        |
        v
4. CDK deploy AppStack
   cdk deploy orders-api-app-{env}
   - Uploads Lambda bundle to S3
   - Updates Lambda function code
   - Updates Lambda alias
   - Applies provisioned concurrency (prod)
        |
        v
5. Post-deploy smoke test
   - GET /health → 200
   - POST /auth/login → 200 (test credentials)
        |
        v
6. Promote to next environment (staging → prod)
```

---

## Security Compliance Summary (Infrastructure Design)

| Rule | Status | Notes |
|---|---|---|
| SECURITY-01 | Compliant | MongoDB Atlas encryption at rest (AES-256) + TLS enforced; ElastiCache TLS + encryption at rest; all connections use TLS 1.2+ |
| SECURITY-02 | Compliant | API Gateway access logging enabled to CloudWatch; log group defined in CDK |
| SECURITY-03 | Compliant | CloudWatch Log Group with 90-day retention; structured JSON from Lambda |
| SECURITY-04 | N/A | No HTML-serving endpoints |
| SECURITY-05 | Compliant | API Gateway request body size limit + Lambda-level Zod validation |
| SECURITY-06 | Compliant | Lambda execution role with specific ARN-scoped permissions; no wildcard actions |
| SECURITY-07 | Compliant | Lambda in private VPC subnet; no inbound from internet; Redis SG restricts to lambda-sg; NAT Gateway for outbound; private endpoints for Secrets Manager and CloudWatch |
| SECURITY-08 | Compliant | JWT validation in Lambda middleware; CORS restricted to allowlist in prod |
| SECURITY-09 | Compliant | Generic error responses; no stack traces in prod |
| SECURITY-10 | Compliant | npm audit in CI pipeline; package-lock.json committed; pinned CDK version |
| SECURITY-11 | Compliant | Rate limiting on all public endpoints; auth logic isolated |
| SECURITY-12 | Compliant | Secrets in Secrets Manager; no hardcoded credentials in CDK or Lambda code |
| SECURITY-13 | Compliant | CI/CD pipeline access-controlled; CDK stack changes require PR approval; critical data mutations logged with requestId |
| SECURITY-14 | Compliant | CloudWatch alarms on error rate, latency, throttles, login failures; log retention 90 days; Lambda role cannot delete its own log group |
| SECURITY-15 | Compliant | Lambda timeout 30s; graceful shutdown; global error handler; fail-closed on all errors |
