# Deployment Guide — Customer Orders REST API

---

## Prerequisites

### 1. Install Required Tools

**AWS CLI**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Verify
aws --version
```

**AWS CDK CLI**
```bash
npm install -g aws-cdk

# Verify
cdk --version
```

**Node.js 20.x**
```bash
node --version   # must be >= 20.0.0
```

---

### 2. Configure AWS Credentials

```bash
aws configure
```

Enter when prompted:
- AWS Access Key ID
- AWS Secret Access Key
- Default region → `us-east-1`
- Output format → `json`

**Verify access:**
```bash
aws sts get-caller-identity
```

Expected output:
```json
{
  "UserId": "AIDAXXXXXXXXXXXXXXXXX",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/your-user"
}
```

---

### 3. MongoDB Atlas Setup

1. Sign up or log in at https://cloud.mongodb.com
2. Create a cluster:
   - **Dev**: M0 (free tier)
   - **Staging / Prod**: M10
3. Create a database user with read/write access
4. Copy the connection string — you'll need it in Step 4

---

## Step 1: Build the Lambda Bundle

```bash
cd /path/to/doocument-tagging-api

# Install dependencies
npm install

# Build — runs tsc type-check + esbuild bundle
npm run build
```

Expected output:
```
dist/server.js   XXX kb
```

---

## Step 2: Install CDK Dependencies

```bash
cd infra
npm install
cd ..
```

---

## Step 3: Bootstrap CDK (One-Time Per AWS Account/Region)

This sets up the S3 bucket and IAM roles CDK needs to deploy.

```bash
cd infra
npx cdk bootstrap aws://<YOUR_ACCOUNT_ID>/us-east-1
```

Replace `<YOUR_ACCOUNT_ID>` with your 12-digit AWS account ID from Step 0.

> You only need to run this once per AWS account + region combination.

---

## Step 4: Create Secrets in AWS Secrets Manager

Create the three required secrets before deploying. Replace placeholder values with your real ones.

### Dev Environment

```bash
# JWT Secret
aws secretsmanager create-secret \
  --name "orders-api/dev/jwt-secret" \
  --secret-string '{"secret":"your-strong-jwt-secret-here"}'

# MongoDB Atlas URI
aws secretsmanager create-secret \
  --name "orders-api/dev/mongodb-uri" \
  --secret-string '{"uri":"mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/orders-dev?retryWrites=true&w=majority"}'

# Redis URL (use placeholder — update after deploy in Step 7)
aws secretsmanager create-secret \
  --name "orders-api/dev/redis-url" \
  --secret-string '{"url":"redis://placeholder"}'
```

### Staging Environment

```bash
aws secretsmanager create-secret \
  --name "orders-api/staging/jwt-secret" \
  --secret-string '{"secret":"your-strong-jwt-secret-here"}'

aws secretsmanager create-secret \
  --name "orders-api/staging/mongodb-uri" \
  --secret-string '{"uri":"mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/orders-staging?retryWrites=true&w=majority"}'

aws secretsmanager create-secret \
  --name "orders-api/staging/redis-url" \
  --secret-string '{"url":"redis://placeholder"}'
```

### Prod Environment

```bash
aws secretsmanager create-secret \
  --name "orders-api/prod/jwt-secret" \
  --secret-string '{"secret":"your-strong-jwt-secret-here"}'

aws secretsmanager create-secret \
  --name "orders-api/prod/mongodb-uri" \
  --secret-string '{"uri":"mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/orders-prod?retryWrites=true&w=majority"}'

aws secretsmanager create-secret \
  --name "orders-api/prod/redis-url" \
  --secret-string '{"url":"redis://placeholder"}'
```

---

## Step 5: Deploy

Run from the `infra/` directory. CDK deploys two stacks in order:
1. `orders-api-network-{env}` — VPC, subnets, NAT Gateway, security groups
2. `orders-api-app-{env}` — Lambda, API Gateway, ElastiCache Redis, Secrets, IAM, alarms, dashboard

### Deploy to Dev

```bash
cd infra
npx cdk deploy --all --context deployEnv=dev
```

### Deploy to Staging

```bash
npx cdk deploy --all --context deployEnv=staging
```

### Deploy to Prod

```bash
npx cdk deploy --all --context deployEnv=prod
```

**Expected output at the end:**
```
Outputs:
orders-api-app-dev.ApiUrl = https://xxxxxxxx.execute-api.us-east-1.amazonaws.com

Stack ARN:
arn:aws:cloudformation:us-east-1:123456789012:stack/orders-api-app-dev/...
```

> CDK will ask for confirmation before creating IAM roles and security groups. Type `y` to proceed.

---

## Step 6: Update Redis Secret

After deployment, get the ElastiCache Redis endpoint from the AWS Console:

1. Go to **AWS Console → ElastiCache → Serverless caches**
2. Find `orders-api-{env}`
3. Copy the endpoint URL

Update the secret:

```bash
aws secretsmanager update-secret \
  --secret-id "orders-api/dev/redis-url" \
  --secret-string '{"url":"rediss://<elasticache-endpoint>:6379"}'
```

---

## Step 7: Smoke Test

```bash
export API_URL=https://xxxxxxxx.execute-api.us-east-1.amazonaws.com

# Health check
curl $API_URL/health
# Expected: {"status":"ok"}

# Register a user
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected 201: {"userId":"...","email":"test@example.com","role":"customer"}

# Login
curl -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected 200: {"accessToken":"eyJ...","refreshToken":"uuid","expiresIn":"1h"}

# Create an order (replace <accessToken> and <userId> from above responses)
curl -X POST $API_URL/orders \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<userId>",
    "items": [{"productId":"p1","productName":"Widget","quantity":1,"unitPrice":10}],
    "shippingAddress": {"street":"123 Main St","city":"NYC","state":"NY","postalCode":"10001","country":"US"},
    "paymentMethod": "CREDIT_CARD"
  }'
# Expected 201: {"orderId":"...","status":"PENDING","totalAmount":10,...}
```

---

## Environment Summary

| Property | Dev | Staging | Prod |
|---|---|---|---|
| CDK context key | `deployEnv=dev` | `deployEnv=staging` | `deployEnv=prod` |
| MongoDB Atlas tier | M0 (free) | M10 | M10 |
| Redis | ElastiCache Serverless | ElastiCache Serverless | ElastiCache Serverless |
| Lambda provisioned concurrency | 0 (cold starts OK) | 0 | 1 (always warm) |
| NAT Gateways | 1 | 1 | 2 (one per AZ) |
| CloudWatch alarms | None | Warning only | Full alerting |
| Log retention | 7 days | 30 days | 90 days |
| Custom domain | `api-dev.example.com` | `api-staging.example.com` | `api.example.com` |

---

## Redeploy After Code Changes

```bash
# 1. Rebuild the Lambda bundle
cd /path/to/doocument-tagging-api
npm run build

# 2. Redeploy (CDK detects only what changed)
cd infra
npx cdk deploy --all --context deployEnv=dev
```

---

## View Logs

```bash
# Tail live Lambda logs
aws logs tail /aws/lambda/orders-api-dev --follow

# Last 100 lines
aws logs tail /aws/lambda/orders-api-dev --since 1h
```

---

## Tear Down

```bash
cd infra

# Remove dev environment
npx cdk destroy --all --context deployEnv=dev

# Remove staging
npx cdk destroy --all --context deployEnv=staging

# Remove prod
npx cdk destroy --all --context deployEnv=prod
```

> **Note**: Secrets Manager secrets and CloudWatch log groups are retained after destroy to prevent accidental data loss. Delete them manually if needed:
> ```bash
> aws secretsmanager delete-secret --secret-id "orders-api/dev/jwt-secret" --force-delete-without-recovery
> aws logs delete-log-group --log-group-name /aws/lambda/orders-api-dev
> ```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Unable to resolve AWS account` | AWS credentials not configured | Run `aws configure` |
| `CDK bootstrap required` | CDK not bootstrapped in this account/region | Run `npx cdk bootstrap` |
| `Lambda function timeout` | MongoDB/Redis connection slow | Check VPC peering and security group rules |
| `Internal server error` on all requests | Secret not found in Secrets Manager | Verify secret names match `orders-api/{env}/...` |
| `502 Bad Gateway` | Lambda crashed on cold start | Check CloudWatch logs: `aws logs tail /aws/lambda/orders-api-{env}` |
| `ECONNREFUSED` to Redis | ElastiCache endpoint not updated in secret | Re-run Step 6 with correct endpoint |
