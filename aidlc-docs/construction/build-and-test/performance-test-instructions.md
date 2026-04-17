# Performance Test Instructions — orders-api

## Performance Requirements (from NFR-01)

| Endpoint | Target (p95) |
|---|---|
| POST /orders | < 300ms |
| GET /orders/:id | < 300ms |
| PUT /orders/:id | < 300ms |
| PATCH /orders/:id/cancel | < 300ms |
| DELETE /orders/:id | < 300ms |
| GET /orders (paginated) | < 500ms |
| POST /auth/login | < 500ms |

**Peak load**: ≤ 100 requests/minute  
**Error rate target**: < 1%

---

## Recommended Tool: k6

```bash
npm install -g k6
```

---

## Setup

### 1. Deploy to staging environment

```bash
cd infra && npx cdk deploy --all --context deployEnv=staging
```

### 2. Obtain a valid JWT for load testing

```bash
export API_URL=https://api-staging.example.com
export TOKEN=$(curl -s -X POST $API_URL/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"loadtest@example.com","password":"<password>"}' \
  | jq -r '.accessToken')
```

---

## Load Test Script

Create `tests/performance/load-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '2m',  target: 20 },   // steady state (~100 req/min)
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed:   ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL;
const TOKEN    = __ENV.TOKEN;
const HEADERS  = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

export default function () {
  // Create order
  const create = http.post(`${BASE_URL}/orders`, JSON.stringify({
    customerId: 'loadtest-user',
    items: [{ productId: 'p1', productName: 'Widget', quantity: 1, unitPrice: 10 }],
    shippingAddress: { street: '1 Main St', city: 'NYC', state: 'NY', postalCode: '10001', country: 'US' },
    paymentMethod: 'CREDIT_CARD',
  }), { headers: HEADERS });
  check(create, { 'create 201': (r) => r.status === 201 });

  const orderId = create.json('orderId');

  // Get order
  const get = http.get(`${BASE_URL}/orders/${orderId}`, { headers: HEADERS });
  check(get, { 'get 200': (r) => r.status === 200 });

  // List orders
  const list = http.get(`${BASE_URL}/orders?limit=20`, { headers: HEADERS });
  check(list, { 'list 200': (r) => r.status === 200 });

  sleep(1);
}
```

### Run Load Test

```bash
k6 run -e API_URL=$API_URL -e TOKEN=$TOKEN tests/performance/load-test.js
```

---

## Analyze Results

k6 outputs a summary including:
- `http_req_duration` — p50, p90, p95, p99 latencies
- `http_req_failed` — error rate
- `http_reqs` — total requests and RPS

**Pass criteria**:
- `p(95) < 500ms` ✅
- `error rate < 1%` ✅

---

## Lambda Cold Start Validation

After a period of inactivity (> 15 min), send a single request and measure:

```bash
time curl -s -o /dev/null -w "%{time_total}" \
  -H "Authorization: Bearer $TOKEN" \
  $API_URL/orders
```

**Expected**: < 2 seconds (cold start with provisioned concurrency = 0 in staging)  
**Production**: < 300ms (provisioned concurrency = 1 eliminates cold start)
