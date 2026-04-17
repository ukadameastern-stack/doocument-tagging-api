# Infrastructure Design — orders-api

**Cloud Provider**: AWS
**Region**: us-east-1
**Environments**: dev, staging, prod
**IaC Tool**: AWS CDK (TypeScript)
**CDK Stack Strategy**: Two stacks — NetworkStack + AppStack

---

## Service Mapping

| Logical Component | AWS Service | Tier / Config |
|---|---|---|
| REST API handler | AWS Lambda | Node.js 20.x, 512MB, 30s timeout |
| API layer | Amazon API Gateway (HTTP API) | Lambda proxy integration |
| Custom domain | Amazon Route 53 + ACM | `api.example.com`, TLS cert via ACM |
| MongoDB | MongoDB Atlas | M10 (prod/staging), M0 (dev), PrivateLink |
| Redis (refresh tokens + lockout) | Amazon ElastiCache for Redis | Serverless (prod/staging), local Redis (dev) |
| Secrets | AWS Secrets Manager | JWT secret, MongoDB URI, Redis URL |
| Logs | Amazon CloudWatch Logs | 90-day retention, structured JSON |
| Metrics & Alarms | Amazon CloudWatch | Lambda + custom alarms |
| Dashboard | Amazon CloudWatch Dashboard | CDK-defined |
| IAM | AWS IAM | Least-privilege Lambda execution role |
| Networking | Amazon VPC | Private subnets, NAT Gateway |
| Provisioned concurrency | Lambda Alias | `production` alias, 1 provisioned instance |

---

## CDK Stack Structure

### Stack 1: NetworkStack (`orders-api-network-{env}`)
**Resources**:
- VPC with 2 AZs, public + private subnets
- NAT Gateway (1 per AZ in prod; 1 shared in dev/staging)
- Security Group: `lambda-sg` — outbound to MongoDB PrivateLink endpoint, Redis, Secrets Manager
- Security Group: `redis-sg` — inbound port 6379 from `lambda-sg` only
- VPC Endpoint: Secrets Manager (interface endpoint, private subnet)
- VPC Endpoint: CloudWatch Logs (interface endpoint, private subnet)

### Stack 2: AppStack (`orders-api-app-{env}`)
**Depends on**: NetworkStack (imports VPC, security groups)
**Resources**:
- Lambda function (`orders-api-{env}`)
- Lambda alias `production` with provisioned concurrency = 1 (prod only)
- API Gateway HTTP API with Lambda integration
- API Gateway custom domain + ACM certificate (Route 53 DNS validation)
- ElastiCache Serverless cluster (prod/staging) in private subnet
- Secrets Manager secrets: `orders-api/{env}/jwt-secret`, `orders-api/{env}/mongodb-uri`, `orders-api/{env}/redis-url`
- CloudWatch Log Group: `/aws/lambda/orders-api-{env}`, retention 90 days
- CloudWatch Alarms: error rate, p95 duration, throttles
- CloudWatch Dashboard: `orders-api-{env}`
- IAM execution role for Lambda

---

## Compute: Lambda

| Property | Dev | Staging | Prod |
|---|---|---|---|
| Memory | 512MB | 512MB | 512MB |
| Timeout | 30s | 30s | 30s |
| Runtime | Node.js 20.x | Node.js 20.x | Node.js 20.x |
| Provisioned concurrency | 0 | 0 | 1 |
| Reserved concurrency | none | none | none |
| Environment vars | `NODE_ENV=development` | `NODE_ENV=staging` | `NODE_ENV=production` |
| Secrets | Secrets Manager | Secrets Manager | Secrets Manager |

**Lambda bundle**: esbuild — single minified JS file, no `node_modules` (tree-shaken)
**Lambda layer**: none (bundle includes all dependencies)

---

## Networking: VPC

```
VPC: 10.0.0.0/16 (us-east-1)
  ├── Public Subnet AZ-a:  10.0.0.0/24  — NAT Gateway
  ├── Public Subnet AZ-b:  10.0.16.0/24 — NAT Gateway (prod only)
  ├── Private Subnet AZ-a: 10.0.1.0/24  — Lambda, ElastiCache
  └── Private Subnet AZ-b: 10.0.17.0/24 — Lambda, ElastiCache

Security Groups:
  lambda-sg:
    Inbound:  none (Lambda invoked by API Gateway — no inbound SG needed)
    Outbound: TCP 27017 → mongodb-privatelink-sg (Atlas PrivateLink)
              TCP 6379  → redis-sg (ElastiCache)
              TCP 443   → 0.0.0.0/0 (Secrets Manager, CloudWatch via VPC endpoints)

  redis-sg:
    Inbound:  TCP 6379 from lambda-sg
    Outbound: none

Internet access for Lambda: via NAT Gateway (outbound only — no inbound from internet)
```

---

## Storage: MongoDB Atlas (PrivateLink)

| Property | Dev | Staging | Prod |
|---|---|---|---|
| Atlas tier | M0 (free) | M10 | M10 |
| Connection | Public + IP allowlist | PrivateLink | PrivateLink |
| Encryption at rest | Atlas default | AES-256 | AES-256 |
| Backup | None | Daily snapshots | Continuous (PITR) |
| Replica set | No (M0) | Yes (3-node) | Yes (3-node) |

**PrivateLink setup** (prod/staging):
- Atlas creates a PrivateLink endpoint service
- CDK creates `aws_ec2.InterfaceVpcEndpoint` in private subnet pointing to Atlas endpoint service
- MongoDB URI uses the PrivateLink endpoint hostname
- Security group allows outbound TCP 27017 from `lambda-sg` to PrivateLink endpoint

---

## Storage: ElastiCache for Redis

| Property | Dev | Staging | Prod |
|---|---|---|---|
| Type | Local Redis (Docker) | ElastiCache Serverless | ElastiCache Serverless |
| Encryption in transit | N/A | TLS enabled | TLS enabled |
| Encryption at rest | N/A | Enabled | Enabled |
| Auth | None | Redis AUTH token | Redis AUTH token |
| Subnet | N/A | Private subnet | Private subnet |

---

## API Gateway: HTTP API

| Property | Value |
|---|---|
| Type | HTTP API (not REST API — lower cost) |
| Integration | Lambda proxy |
| Auth | None at gateway level (JWT validated in Lambda middleware) |
| CORS | Configured at gateway level (mirrors Express CORS config) |
| Throttling | 100 req/s burst, 50 req/s steady (dev/staging); 500/200 (prod) |
| Custom domain | `api-{env}.example.com` (dev: `api-dev.example.com`, prod: `api.example.com`) |
| ACM certificate | DNS-validated via Route 53, us-east-1 |
| Stage | `$default` (HTTP API uses single default stage) |

---

## Secrets Manager

| Secret Name | Contents | Rotation |
|---|---|---|
| `orders-api/{env}/jwt-secret` | `{ "secret": "..." }` | Manual (CDK creates, app reads) |
| `orders-api/{env}/mongodb-uri` | `{ "uri": "mongodb+srv://..." }` | Manual |
| `orders-api/{env}/redis-url` | `{ "url": "rediss://..." }` | Manual |

**IAM**: Lambda execution role has `secretsmanager:GetSecretValue` on specific secret ARNs only (SECURITY-06)

---

## IAM: Lambda Execution Role

**Permissions** (least-privilege — SECURITY-06):
```
secretsmanager:GetSecretValue  → arn:aws:secretsmanager:us-east-1:{account}:secret:orders-api/{env}/*
logs:CreateLogGroup            → arn:aws:logs:us-east-1:{account}:*
logs:CreateLogStream           → arn:aws:logs:us-east-1:{account}:log-group:/aws/lambda/orders-api-{env}:*
logs:PutLogEvents              → arn:aws:logs:us-east-1:{account}:log-group:/aws/lambda/orders-api-{env}:*
ec2:CreateNetworkInterface     → * (required for VPC Lambda)
ec2:DescribeNetworkInterfaces  → *
ec2:DeleteNetworkInterface     → *
```

No wildcard actions. No wildcard resources except EC2 VPC networking (API does not support resource-level permissions).

---

## Monitoring: CloudWatch

**Log Group**: `/aws/lambda/orders-api-{env}` — retention 90 days

**Alarms** (prod):
| Alarm | Metric | Threshold | Period | Action |
|---|---|---|---|---|
| High error rate | Errors/Invocations | > 1% | 5 min | SNS → email |
| High p95 latency | Duration p95 | > 1000ms | 5 min | SNS → email |
| Throttles | Throttles | > 0 | 5 min | SNS → email |
| Login failures | Custom metric `LoginFailures` | > 20/min | 1 min | SNS → email |

**Dashboard** (`orders-api-{env}`):
- Lambda: Invocations, Errors, Duration (p50/p95/p99), Throttles, ConcurrentExecutions
- API Gateway: 4xx rate, 5xx rate, Latency
- Custom: LoginFailures, OrdersCreated, OrdersCancelled

---

## Environment Strategy

| Concern | Dev | Staging | Prod |
|---|---|---|---|
| CDK context key | `dev` | `staging` | `prod` |
| Atlas tier | M0 | M10 | M10 |
| Redis | Local Docker | ElastiCache Serverless | ElastiCache Serverless |
| Provisioned concurrency | 0 | 0 | 1 |
| NAT Gateways | 1 | 1 | 2 (one per AZ) |
| Alarms | None | Warning only | Full alerting |
| Log retention | 7 days | 30 days | 90 days |
| Custom domain | `api-dev.example.com` | `api-staging.example.com` | `api.example.com` |
