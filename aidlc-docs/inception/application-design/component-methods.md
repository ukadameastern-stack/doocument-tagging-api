# Component Methods — Customer Orders REST API

**Note**: Detailed business rules and logic are defined in Functional Design (CONSTRUCTION phase).

---

## AuthController

| Method | HTTP | Path | Input | Output |
|---|---|---|---|---|
| login | POST | /auth/login | `{ email, password }` | `{ token, expiresIn }` |

---

## AuthService

| Method | Input | Output | Purpose |
|---|---|---|---|
| login | `{ email, password }` | `{ token, expiresIn }` | Validate credentials, issue signed JWT |
| verifyToken | `token: string` | `DecodedPayload` | Verify and decode JWT (used by middleware) |

---

## AuthMiddleware

| Method | Input | Output | Purpose |
|---|---|---|---|
| authenticate | `(req, res, next)` | void / 401 | Validate Bearer token, attach `req.user = { userId, role }` |

---

## OrderController

| Method | HTTP | Path | Input | Output |
|---|---|---|---|---|
| createOrder | POST | /orders | `OrderCreateDto` (body) | `201` + created Order |
| getOrder | GET | /orders/:id | `id` (param) | `200` + Order |
| listOrders | GET | /orders | `ListOrdersQueryDto` (query) | `200` + paginated list |
| updateOrder | PUT | /orders/:id | `id` (param) + `OrderUpdateDto` (body) | `200` + updated Order |
| cancelOrder | PATCH | /orders/:id/cancel | `id` (param) | `200` + cancelled Order |
| deleteOrder | DELETE | /orders/:id | `id` (param) | `204` No Content |

---

## OrderService

| Method | Input | Output | Purpose |
|---|---|---|---|
| createOrder | `(dto: OrderCreateDto, requestingUser: RequestUser)` | `Order` | Create order, compute totalAmount, set status PENDING |
| getOrderById | `(orderId: string, requestingUser: RequestUser)` | `Order` | Fetch order, enforce ownership/admin check |
| listOrders | `(query: ListOrdersQueryDto, requestingUser: RequestUser)` | `PaginatedResult<Order>` | List orders with filters/sort/pagination, scope by role |
| updateOrder | `(orderId: string, dto: OrderUpdateDto, requestingUser: RequestUser)` | `Order` | Update order fields, enforce ownership/admin check |
| cancelOrder | `(orderId: string, requestingUser: RequestUser)` | `Order` | Set status to CANCELLED, enforce ownership/admin check |
| deleteOrder | `(orderId: string, requestingUser: RequestUser)` | `void` | Delete order, enforce ownership/admin check |

---

## OrderRepository

| Method | Input | Output | Purpose |
|---|---|---|---|
| create | `(data: Partial<Order>)` | `Order` | Insert new order document |
| findById | `(orderId: string)` | `Order or null` | Find single order by ID |
| findAll | `(filters: OrderFilters, pagination: Pagination, sort: SortOptions)` | `PaginatedResult<Order>` | Query orders with filters, sort, pagination |
| update | `(orderId: string, data: Partial<Order>)` | `Order or null` | Update order document by ID |
| delete | `(orderId: string)` | `void` | Delete order document by ID |

---

## ValidationMiddleware

| Method | Input | Output | Purpose |
|---|---|---|---|
| validateBody | `(schema: ZodSchema)` | middleware fn | Validate `req.body` against schema, return 400 on failure |
| validateQuery | `(schema: ZodSchema)` | middleware fn | Validate `req.query` against schema, return 400 on failure |

---

## ErrorHandler

| Method | Input | Output | Purpose |
|---|---|---|---|
| globalErrorHandler | `(err, req, res, next)` | HTTP error response | Map errors to status codes, return generic message in production |

---

## Logger

| Method | Input | Output | Purpose |
|---|---|---|---|
| info | `(message: string, meta?: object)` | void | Log informational message with context |
| warn | `(message: string, meta?: object)` | void | Log warning with context |
| error | `(message: string, meta?: object)` | void | Log error with context (no stack traces in production) |

---

## Key Types

```
RequestUser       { userId: string, role: 'customer' | 'admin' }
OrderCreateDto    { customerId, items[], shippingAddress, paymentMethod, notes? }
OrderUpdateDto    { items?, shippingAddress?, paymentMethod?, notes? }
ListOrdersQueryDto { customerId?, status?, fromDate?, toDate?, sortBy?, sortOrder?, page?, limit? }
OrderFilters      { customerId?, status?, createdAt?: { gte?, lte? } }
Pagination        { page: number, limit: number }
SortOptions       { field: string, order: 'asc' | 'desc' }
PaginatedResult<T> { data: T[], total: number, page: number, limit: number, totalPages: number }
```
