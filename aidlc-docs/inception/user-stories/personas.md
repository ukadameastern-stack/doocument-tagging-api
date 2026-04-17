# Personas — Customer Orders REST API

---

## Persona 1: Customer

**Name**: Alex Chen
**Role**: End Customer
**Description**: A person who shops via a frontend application backed by this API. Alex places orders, tracks their status, and can cancel orders that haven't shipped yet.

**Goals**:
- Place new orders quickly and reliably
- View the current status and details of their orders
- Cancel an order before it is processed or shipped
- Browse their order history with filtering and sorting

**Frustrations**:
- Receiving vague error messages when something goes wrong
- Being unable to track order progress in real time
- Accidentally accessing or modifying another customer's data

**Technical Context**:
- Authenticates via JWT obtained from the login endpoint
- Interacts through a frontend app (not directly with the API)
- Can only access their own orders (`customerId` must match JWT subject)

**Stories**: US-01, US-02, US-03, US-04, US-05, US-06, US-07

---

## Persona 2: Admin

**Name**: Udaysinh Kadam
**Role**: Operations Administrator
**Description**: An internal operations staff member who manages all orders across all customers. Jordan can view, update, and delete any order, and is responsible for progressing orders through the status lifecycle.

**Goals**:
- View and search all orders across all customers
- Update order status as fulfilment progresses (e.g., CONFIRMED → PROCESSING → SHIPPED)
- Delete erroneous or test orders
- Monitor order volume and filter by status or date range

**Frustrations**:
- Lack of visibility into orders from specific customers or date ranges
- Inability to correct order data when a customer makes a mistake

**Technical Context**:
- Authenticates via JWT with `role: admin` claim
- Has full access to all orders regardless of `customerId`
- Interacts via internal tooling or admin dashboard

**Stories**: US-08, US-09, US-10, US-11

---
