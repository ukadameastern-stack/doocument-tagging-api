# How We Built This Project Using AI-DLC

This document explains step-by-step how the **Customer Orders REST API** was built using the **AI-DLC (AI-Driven Development Life Cycle)** workflow with **Amazon Q Developer** inside VS Code.

---

## What is AI-DLC?

AI-DLC is a structured software development workflow that guides Amazon Q Developer through three phases:

```
INCEPTION  →  CONSTRUCTION  →  OPERATIONS
(Plan)         (Build)          (Deploy)
```

It adapts to your project — simple changes skip unnecessary stages, complex projects get full treatment with design, security, and testing coverage.

---

## Prerequisites

- [VS Code](https://code.visualstudio.com/) installed
- [Amazon Q Developer extension](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.amazon-q-vscode) installed and signed in
- Node.js 20.x installed
- Git installed

---

## Step 1: Clone the AI-DLC Rules Repository

The AI-DLC rules tell Amazon Q Developer how to run the workflow. Clone them first:

```bash
git clone https://github.com/awslabs/aidlc-workflows
```

This gives you two folders you need:
```
aidlc-workflows/
  aws-aidlc-rules/          # core workflow rule (core-workflow.md)
  aws-aidlc-rule-details/   # detailed stage rules + extensions
```

---

## Step 2: Create Your Project Folder

```bash
mkdir my-orders-api
cd my-orders-api
git init
```

---

## Step 3: Copy AI-DLC Rules Into Your Project

Amazon Q Developer looks for rules in `.amazonq/rules/` and rule details in `.amazonq/aws-aidlc-rule-details/`:

```bash
# Create the required directories
mkdir -p .amazonq/rules
mkdir -p .amazonq/aws-aidlc-rule-details

# Copy the core workflow rule
cp -R /path/to/aidlc-workflows/aws-aidlc-rules \
      .amazonq/rules/

# Copy the rule details (stage instructions + extensions)
cp -R /path/to/aidlc-workflows/aws-aidlc-rule-details/* \
      .amazonq/aws-aidlc-rule-details/
```

After copying, your project structure should look like:

```
my-orders-api/
  .amazonq/
    rules/
      aws-aidlc-rules/
        core-workflow.md        # main workflow orchestrator
    aws-aidlc-rule-details/
      common/                   # shared rules (logging, validation, etc.)
      inception/                # planning stage rules
      construction/             # build stage rules
      extensions/
        security/baseline/      # security rules (opt-in)
        testing/property-based/ # PBT rules (opt-in)
      operations/               # deployment stage rules
```

---

## Step 4: Open the Project in VS Code

```bash
code .
```

Make sure the Amazon Q Developer extension is active (check the status bar at the bottom of VS Code).

---

## Step 5: Start the AI-DLC Workflow

Open the **Amazon Q Developer chat panel** (click the Q icon in the sidebar).

Type your request:

```
Create a REST API for managing customer orders with CRUD operations
```

Amazon Q will automatically:
1. Display the AI-DLC welcome message
2. Detect your workspace (greenfield — no existing code)
3. Start the **INCEPTION PHASE**

---

## Step 6: Answer the Requirements Questions

Amazon Q creates a questions file at:
```
aidlc-docs/inception/requirements/requirement-verification-questions.md
```

Open it and fill in your answers after each `[Answer]:` tag. For this project we answered:

| Question | Answer |
|---|---|
| Framework | Node.js + Express |
| Database | MongoDB |
| Order model fields | Extended (items, shippingAddress, paymentMethod, notes) |
| Order statuses | Standard (PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED / CANCELLED) |
| Authentication | JWT |
| Pagination/filtering | Full filtering + sorting + pagination |
| Deployment | AWS Lambda |
| Testing level | Unit + Integration + Contract/E2E |
| Security extension | Yes — enforce all rules |
| PBT extension | Yes — enforce all rules |

Then type in chat: **Done**

---

## Step 7: Add User Stories (Optional)

When Amazon Q asked whether to include User Stories, we typed:

```
Add User Stories
```

Amazon Q created:
```
aidlc-docs/inception/plans/story-generation-plan.md
```

We answered 6 questions about personas, story format, and breakdown approach, then typed **Done**.

Amazon Q generated:
- `aidlc-docs/inception/user-stories/stories.md` — 11 stories across 3 epics
- `aidlc-docs/inception/user-stories/personas.md` — Customer and Admin personas

---

## Step 8: Approve the Workflow Plan

Amazon Q presented an execution plan showing which stages would run. We reviewed:
```
aidlc-docs/inception/plans/execution-plan.md
```

Then typed: **Approve & Continue**

---

## Step 9: Application Design

Amazon Q asked 5 questions about architecture:
- Layering pattern → 3-layer (Controller → Service → Repository)
- Auth structure → Dedicated Auth module
- Domain organization → Single module per domain
- Validation → Dedicated Zod middleware
- Error handling → Centralized global handler

After answering, Amazon Q generated 5 design artifacts in:
```
aidlc-docs/inception/application-design/
```

We typed: **Approve & Continue**

---

## Step 10: CONSTRUCTION PHASE — Functional Design

Amazon Q asked 7 questions about business rules:
- `totalAmount` → stored in DB (computed on create/update)
- Status transitions → strict state machine
- Cancellation rules → any status except DELIVERED
- Update restrictions → PENDING only for customers
- `customerId` source → client-supplied, JWT-validated
- Item validation → standard (1–50 items, qty≥1, price>0)
- Delete strategy → soft delete (`deletedAt` timestamp)

Amazon Q generated:
```
aidlc-docs/construction/orders-api/functional-design/
  domain-entities.md      # Order, OrderItem, ShippingAddress schemas
  business-rules.md       # 10 business rules (BR-01 to BR-10)
  business-logic-model.md # Operation flows + PBT property identification
```

We typed: **Continue to Next Stage**

---

## Step 11: NFR Requirements

Amazon Q asked 8 questions about non-functional requirements:
- Volume → Low (≤100 req/min)
- Availability → 99.9% SLA
- Region → Single (us-east-1)
- JWT expiry → 1 hour
- Refresh tokens → Yes
- Rate limiting → Both per-IP and per-user
- Framework → Express
- Deployment tool → AWS CDK

Amazon Q generated:
```
aidlc-docs/construction/orders-api/nfr-requirements/
  nfr-requirements.md       # performance, security, availability targets
  tech-stack-decisions.md   # all technology choices with rationale
```

We typed: **Continue to Next Stage**

---

## Step 12: NFR Design

Amazon Q asked 7 questions about design patterns:
- MongoDB retry → Fail-fast (503 immediately)
- Lambda cold starts → Provisioned concurrency (1 warm instance)
- Refresh token store → Redis (ElastiCache)
- Response compression → No
- CORS → Dev-permissive, prod-strict
- Login lockout store → Redis
- Request logging → Log all requests

Amazon Q generated:
```
aidlc-docs/construction/orders-api/nfr-design/
  nfr-design-patterns.md   # resilience, scalability, security patterns
  logical-components.md    # Redis, middleware pipeline, JWT service, etc.
```

We typed: **Continue to Next Stage**

---

## Step 13: Infrastructure Design

Amazon Q asked 7 questions about AWS infrastructure:
- Environments → 3 (dev, staging, prod)
- Region → us-east-1
- Custom domain → Yes (ACM + Route 53)
- MongoDB Atlas connection → AWS PrivateLink
- Lambda in VPC → Yes
- CloudWatch dashboard → Yes
- CDK stack strategy → 2 stacks (NetworkStack + AppStack)

Amazon Q generated:
```
aidlc-docs/construction/orders-api/infrastructure-design/
  infrastructure-design.md    # full AWS service mapping
  deployment-architecture.md  # architecture diagram + CDK stack structure
```

We typed: **Continue to Next Stage**

---

## Step 14: Code Generation

Amazon Q presented a 19-step code generation plan covering all 11 user stories. We reviewed it and typed: **Approve & Continue**

Amazon Q then generated **35 files**:

```
src/
  config/index.ts           # secrets loader + env config
  app.ts                    # Express app + middleware pipeline
  server.ts                 # Lambda handler
  dev.ts                    # local HTTP server
  db.ts                     # MongoDB connection
  redis.ts                  # Redis client
  auth/                     # register, login, refresh, logout
  orders/                   # full CRUD with business rules
  middleware/               # error handler, request-id, validation
  utils/                    # logger, custom errors
tests/
  unit/                     # auth + order service tests
  integration/              # full HTTP cycle tests
  e2e/                      # order lifecycle tests
  pbt/                      # fast-check property-based tests
infra/
  lib/network-stack.ts      # VPC, subnets, security groups
  lib/app-stack.ts          # Lambda, API GW, Redis, alarms
  bin/app.ts                # CDK entry point
```

We typed: **Continue to Next Stage**

---

## Step 15: Build and Test Instructions

Amazon Q generated 5 instruction files:
```
aidlc-docs/construction/build-and-test/
  build-instructions.md
  unit-test-instructions.md
  integration-test-instructions.md
  performance-test-instructions.md
  build-and-test-summary.md
```

We typed: **Approve & Continue**

---

## Step 16: Post-Generation Fixes

After running `npm run dev` we hit a few issues that Amazon Q fixed interactively:

| Issue | Fix |
|---|---|
| `Cannot find module 'aws-lambda'` | Added `@types/aws-lambda` to devDependencies |
| `npm run dev` used Lambda types | Created `src/dev.ts` as a plain HTTP server entry point |
| TypeScript type errors in `server.ts` | Switched to generic `Handler` type |
| `process.env.MONGODB_URI` was `undefined` | Added `dotenv` — `import 'dotenv/config'` in `config/index.ts` |
| No Redis running locally | Added `ioredis-mock` fallback in `src/redis.ts` |
| No MongoDB running locally | Added `mongodb-memory-server` fallback in `src/db.ts` |
| `MOCK_USERS` in-memory — no real user persistence | Created `user.model.ts` + `register()` endpoint |

---

## Step 17: Run the Project

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
# Set MONGODB_URI to your Atlas connection string

# Start local dev server
npm run dev
# → http://localhost:3000
```

---

## Step 18: Verify It Works

```bash
# Health check
curl http://localhost:3000/health

# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create an order (use accessToken from login response)
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<userId-from-register>",
    "items": [{"productId":"p1","productName":"Widget","quantity":1,"unitPrice":10}],
    "shippingAddress": {"street":"123 Main St","city":"NYC","state":"NY","postalCode":"10001","country":"US"},
    "paymentMethod": "CREDIT_CARD"
  }'
```

---

## Final Project Structure

```
my-orders-api/
  .amazonq/                   # AI-DLC rules (not committed — add to .gitignore if preferred)
  aidlc-docs/                 # all AI-DLC generated documentation
    inception/                # requirements, user stories, application design
    construction/             # functional design, NFR, infrastructure, code summary
    aidlc-state.md            # workflow progress tracker
    audit.md                  # complete audit trail of all decisions
  src/                        # application source code
  tests/                      # all test suites
  infra/                      # AWS CDK infrastructure
  .env.example                # environment variable template
  .gitignore
  package.json
  tsconfig.json
  README.md
  HOW-WE-BUILT-THIS.md        # this file
```

---

## Key AI-DLC Concepts Used

| Concept | What it did |
|---|---|
| Adaptive workflow | Skipped Reverse Engineering (greenfield) and Units Generation (single unit) |
| Extension opt-in | Security Baseline + PBT extensions enforced as blocking constraints |
| Question files | All clarifying questions placed in `.md` files with `[Answer]:` tags — never in chat |
| Audit trail | Every decision logged with timestamp in `aidlc-docs/audit.md` |
| Checkbox tracking | Every plan step marked `[x]` immediately after completion |
| Story traceability | All 11 user stories tracked through to code generation |
