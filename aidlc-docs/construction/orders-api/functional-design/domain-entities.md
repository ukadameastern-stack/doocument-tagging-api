# Domain Entities — orders-api

---

## Entity: Order

**Description**: The central aggregate representing a customer purchase.

| Field | Type | Required | Notes |
|---|---|---|---|
| `orderId` | string (UUID) | Yes | Auto-generated on create |
| `customerId` | string | Yes | Supplied by client, validated against JWT `sub` (admin may set any) |
| `items` | OrderItem[] | Yes | Min 1, max 50 items |
| `totalAmount` | number | Yes | Stored; computed as sum of (quantity × unitPrice) per item |
| `status` | OrderStatus | Yes | Default: `PENDING` on create |
| `shippingAddress` | ShippingAddress | Yes | Required on create |
| `paymentMethod` | PaymentMethod | Yes | Required on create |
| `notes` | string | No | Optional free-text; max 500 chars |
| `createdAt` | Date | Yes | Auto-set on create; immutable |
| `updatedAt` | Date | Yes | Auto-updated on every mutation |
| `deletedAt` | Date | No | Null = active; set on soft-delete |

---

## Value Object: OrderItem

| Field | Type | Required | Constraints |
|---|---|---|---|
| `productId` | string | Yes | Non-empty |
| `productName` | string | Yes | Non-empty, max 200 chars |
| `quantity` | number (integer) | Yes | >= 1 |
| `unitPrice` | number | Yes | > 0 |

---

## Value Object: ShippingAddress

| Field | Type | Required | Constraints |
|---|---|---|---|
| `street` | string | Yes | Non-empty, max 200 chars |
| `city` | string | Yes | Non-empty, max 100 chars |
| `state` | string | Yes | Non-empty, max 100 chars |
| `postalCode` | string | Yes | Non-empty, max 20 chars |
| `country` | string | Yes | Non-empty, max 100 chars |

---

## Enum: OrderStatus

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
                                           ↘ CANCELLED (from any except DELIVERED)
```

Valid values: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`

---

## Enum: PaymentMethod

Valid values: `CREDIT_CARD`, `DEBIT_CARD`, `PAYPAL`, `BANK_TRANSFER`

---

## Entity: User (auth context only — not persisted by this service)

| Field | Type | Notes |
|---|---|---|
| `userId` | string | JWT `sub` claim |
| `role` | `customer` or `admin` | JWT `role` claim |

---

## MongoDB Index Strategy

| Index | Fields | Type | Purpose |
|---|---|---|---|
| Primary | `orderId` | Unique | Fast lookup by ID |
| Query | `customerId` | Single | Filter orders by customer |
| Query | `status` | Single | Filter orders by status |
| Query | `createdAt` | Single | Sort and date-range filter |
| Soft-delete | `deletedAt` | Single | Exclude soft-deleted docs |
| Compound | `customerId + status` | Compound | Combined filter queries |
