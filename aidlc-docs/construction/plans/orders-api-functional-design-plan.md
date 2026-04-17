# Functional Design Plan — orders-api

## Execution Checklist

- [x] Step A: Design Order domain entity and data model
- [x] Step B: Define order status lifecycle and transition rules
- [x] Step C: Define totalAmount computation logic
- [x] Step D: Define object-level authorization rules (IDOR)
- [x] Step E: Define input validation rules per endpoint
- [x] Step F: Define error scenarios and exception types
- [x] Step G: Identify PBT-01 testable properties
- [x] Step H: Generate domain-entities.md
- [x] Step I: Generate business-rules.md
- [x] Step J: Generate business-logic-model.md

---

## Clarifying Questions

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
Let me know when you're done.

---

## Question 1
Should `totalAmount` be stored in the database or computed on-the-fly when reading an order?

A) Stored — computed on create/update and persisted in the document (fast reads, must stay in sync)
B) Computed on-the-fly — derived from items on every read (always accurate, slightly more CPU)
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2
Should order status transitions be strictly enforced (only valid progressions allowed)?

A) Yes — enforce a strict state machine (e.g. PENDING → CONFIRMED only, not PENDING → SHIPPED)
B) No — any status value can be set freely via update (no transition validation)
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 3
Can a customer cancel an order at any status, or only before a certain point?

A) Only PENDING or CONFIRMED orders can be cancelled by a customer
B) Any status except DELIVERED can be cancelled by a customer
C) Admin can cancel any order; customers can only cancel PENDING orders
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 4
What should happen when a customer tries to update an order that is no longer in PENDING status?

A) Allow updates to non-status fields (shippingAddress, notes) regardless of status
B) Only allow updates when order is in PENDING status; reject otherwise with 409 Conflict
C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 5
Should `customerId` in the order body be taken from the JWT (server-enforced) or supplied by the client?

A) Always taken from JWT `sub` claim — client cannot set or override customerId
B) Supplied by client, but validated to match JWT `sub` (admin can set any customerId)
C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 6
What validation rules apply to order items?

A) Minimal — at least 1 item required; quantity >= 1; unitPrice >= 0
B) Standard — at least 1 item; quantity >= 1; unitPrice > 0; productId and productName required; max 50 items per order
C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 7
Should soft-delete (mark as deleted) or hard-delete (permanently remove) be used for order deletion?

A) Hard delete — permanently remove the document from MongoDB
B) Soft delete — set a `deletedAt` timestamp; exclude from queries by default
C) Other (please describe after [Answer]: tag below)

[Answer]: B
