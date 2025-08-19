# Budgets API Lambda

Serverless (AWS Lambda + API Gateway HTTP API) function providing CRUD operations for **budget headers** and **line items** stored in a single DynamoDB table (`Budgets`). A “budget” is represented by a *header record* plus its associated line items sharing the same `budgetId`.

## Table of Contents

1. [Concepts](#concepts)
2. [Data Model](#data-model)
3. [Key Conventions](#key-conventions)
4. [DynamoDB Schema](#dynamodb-schema)
5. [Indexes](#indexes)
6. [API Summary](#api-summary)
7. [Endpoints & Query Patterns](#endpoints--query-patterns)
8. [Request / Response Examples](#request--response-examples)
9. [Creation & Editing Strategy](#creation--editing-strategy)
10. [Validation & Errors](#validation--errors)
11. [Header Totals Strategy](#header-totals-strategy)
12. [Environment Variables](#environment-variables)
13. [Deployment (SAM)](#deployment-sam)
14. [Local Testing](#local-testing)
15. [Extensibility Ideas](#extensibility-ideas)

---

All line items MUST use the `LINE-<uuid>` prefix. Headers MUST use the `HEADER-<uuid>` prefix. There are no legacy raw UUID IDs.

## Concepts

| Term              | Meaning                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Budget**        | Logical grouping of items identified by a `budgetId`. Represented by **one header record** plus lines.                                                                  |
| **Header Record** | Special item summarizing totals & metadata for a budget. Its `budgetItemId` is prefixed with `HEADER-`.                                                                 |
| **Line Item**     | Regular budget entry (cost, description, etc.). `budgetItemId` **MUST** be prefixed with `LINE-<uuid>`. Remove any legacy unprefixed IDs and migrate to the new format. |

## Data Model

Single DynamoDB table: **`Budgets`**

### Required Attributes (Core)

Minimal attributes required on **every** record (header or line):

| Attribute      | Type        | Used In Keys / Indexes                                           | Purpose                                                               |
| -------------- | ----------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `projectId`    | String (PK) | **Primary Key (HASH)**                                           | Partition key grouping all budget items for a project.                |
| `budgetItemId` | String (SK) | **Primary Key (RANGE)**, GSI2 (**HASH** on `budgetItemId-index`) | Sort key; unique per project. `HEADER-` prefix distinguishes headers. |
| `budgetId`     | String      | GSI1 (**HASH** on `budgetId-index`)                              | Groups header + all its lines (UUID).                                 |

> We intentionally **omit** an `itemType` attribute: header detection relies solely on the `HEADER-` prefix of `budgetItemId`.

### Common Metadata

| Attribute                | Notes                                                   |
| ------------------------ | ------------------------------------------------------- |
| `createdAt`, `updatedAt` | ISO 8601 timestamps.                                    |
| `revision`               | Integer revision (optional).                            |
| Domain fields            | e.g. `title`, `amount`, `headerBudgetedTotalCost`, etc. |

### Header-Specific Fields (example)

| Field                     | Meaning                                                 |
| ------------------------- | ------------------------------------------------------- |
| `headerBudgetedTotalCost` | Sum of all budgeted costs in lines (or imported value). |
| `headerActualTotalCost`   | Sum of actuals (nullable).                              |
| `headerEffectiveMarkup`   | Multiplier (e.g. 1.52).                                 |
| `headerFinalTotalCost`    | Final total cost (may be computed).                     |

| Attribute                | Notes                                                   |
| ------------------------ | ------------------------------------------------------- |
| `createdAt`, `updatedAt` | ISO 8601 timestamps.                                    |
| `revision`               | Integer revision (optional).                            |
| Domain fields            | e.g. `title`, `amount`, `headerBudgetedTotalCost`, etc. |

### Header-Specific Fields (example)

| Field                     | Meaning                                                 |
| ------------------------- | ------------------------------------------------------- |
| `headerBudgetedTotalCost` | Sum of all budgeted costs in lines (or imported value). |
| `headerActualTotalCost`   | Sum of actuals (nullable).                              |
| `headerEffectiveMarkup`   | Multiplier (e.g. 1.52).                                 |
| `headerFinalTotalCost`    | Final total cost (may be computed).                     |

---

## Key Conventions

| Convention                                                | Rationale                                                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `HEADER-` prefix for header `budgetItemId` **(required)** | Enables efficient header-only query using `begins_with`.                                                 |
| `LINE-` prefix for line `budgetItemId` **(required)**     | Guarantees self-descriptive IDs and enables efficient queries using `begins_with(budgetItemId,'LINE-')`. |
| ISO timestamps                                            | Readable, lexicographically sortable.                                                                    |
| Server generates IDs (unless supplied)                    | Ensures uniqueness & consistency.                                                                        |
| `budgetId` equals header’s grouping UUID                  | All line items must supply the same `budgetId` to associate with that budget.                            |

### Optional vs Required Summary

| Aspect                        | Required Now  | Why                                                                        |
| ----------------------------- | ------------- | -------------------------------------------------------------------------- |
| `HEADER-` prefix              | Yes (headers) | Distinguishes headers for `begins_with` query.                             |
| `LINE-` prefix                | Yes (lines)   | Enforces consistent ID format; future line-only queries via `begins_with`. |
| Separate `itemType` attribute | No            | Redundant given reliable ID prefixing.                                     |

## DynamoDB Schema

**Primary Key:**

* Partition (HASH): `projectId`
* Sort (RANGE): `budgetItemId`

You must define attribute definitions for: `projectId`, `budgetItemId`, `budgetId`.

---

## Indexes

Below are the two **required** GSIs and an **optional future** index suggestion.

| Index Name                            | PK             | SK             | Projection     | Use                                                                        |
| ------------------------------------- | -------------- | -------------- | -------------- | -------------------------------------------------------------------------- |
| `budgetId-index`                      | `budgetId`     | `budgetItemId` | ALL            | Fetch all items (header + lines) for a specific budget.                    |
| `budgetItemId-index`                  | `budgetItemId` | *(none)*       | ALL            | Lookup an item globally when only its ID is known.                         |
| *(future)* `itemType-projectId-index` | `itemType`     | `projectId`    | (KeysOnly/All) | Fast access to all headers or all lines across projects (not implemented). |

> **Why no index on ****`itemType`**** yet?** Current access patterns are satisfied by primary key + prefix (`begins_with(budgetItemId,'HEADER-')`). Add the future index only if you need *all headers across all projects* or large-scale filtering without scanning.

| Index Name           | PK             | SK             | Use                                                     |
| -------------------- | -------------- | -------------- | ------------------------------------------------------- |
| `budgetId-index`     | `budgetId`     | `budgetItemId` | Fetch all items (header + lines) for a specific budget. |
| `budgetItemId-index` | `budgetItemId` | *(none)*       | Lookup an item globally when only its ID is known.      |

> Headers are also discoverable with: `Query(projectId, begins_with(budgetItemId,'HEADER-'))`.

---

## API Summary

| HTTP    | Path       | Purpose                                      |
| ------- | ---------- | -------------------------------------------- |
| POST    | `/budgets` | Create header or line item.                  |
| PATCH   | `/budgets` | Partial update to an existing item.          |
| DELETE  | `/budgets` | Delete an item (query params).               |
| GET     | `/budgets` | Multiple read patterns via query parameters. |
| OPTIONS | `/budgets` | CORS preflight.                              |

> **Note:** Creation no longer depends on an `itemType` attribute. A header is identified by the server generating a `budgetItemId` with `HEADER-` (or a client-provided one). Lines get a `LINE-` prefix (recommended) or a raw UUID (legacy).

## Endpoints & Query Patterns

All operations point to the single API path (e.g., `/budgets`). Behavior changes based on method & query params.

| Use Case                         | Method | Query Parameters                 | Notes                                                                                                                |   |      |          |                                                                             |   |      |          |                                         |
| -------------------------------- | ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- | - | ---- | -------- | --------------------------------------------------------------------------- | - | ---- | -------- | --------------------------------------- |
| List headers for a project       | GET    | `projectId=...&headers=true`     | Uses `begins_with(budgetItemId,'HEADER-')`.                                                                          |   |      |          |                                                                             |   |      |          |                                         |
| Get single item by composite key | GET    | `projectId=...&budgetItemId=...` | Direct `GetItem`.                                                                                                    |   |      |          |                                                                             |   |      |          |                                         |
| Get all items for a project      | GET    | `projectId=...`                  | `Query` by partition key.                                                                                            |   |      |          |                                                                             |   |      |          |                                         |
| Open a budget (all items)        | GET    | `budgetId=...`                   | Query GSI `budgetId-index`.                                                                                          |   |      |          |                                                                             |   |      |          |                                         |
| Get item by global ID            | GET    | `singleBudgetItemId=...`         | Query `budgetItemId-index` (expect at most one).                                                                     |   |      |          |                                                                             |   |      |          |                                         |
| Create new header                | POST   | *(none)*                         | Body must include `projectId`; if `budgetId` omitted server generates one; server sets `budgetItemId=HEADER-<uuid>`. |   |      |          |                                                                             |   |      |          |                                         |
| Create new line                  | POST   | *(none)*                         | Body must include `projectId` and existing `budgetId`; server sets `budgetItemId=LINE-<uuid>`.                       |   | POST | *(none)* | Body: `projectId`, **existing** `budgetId`; server generates `LINE-<uuid>`. |   | POST | *(none)* | Body: `projectId`, existing `budgetId`. |
| Update (partial)                 | PATCH  | *(none)*                         | Body: `projectId`, `budgetItemId`, and changed fields.                                                               |   |      |          |                                                                             |   |      |          |                                         |
| Delete item                      | DELETE | `projectId=...&budgetItemId=...` | Physical delete.                                                                                                     |   |      |          |                                                                             |   |      |          |                                         |

---

## Request / Response Examples

### Create Header (Server Generates `budgetId`)

**Request**

```http
POST /budgets
Content-Type: application/json

{
  "projectId": "9000",
  "title": "Porsche",
  "headerBudgetedTotalCost": 643000
}
```

**Response (201)**

```json
{
  "projectId": "9000",
  "budgetId": "8b3a6d8e-5b43-41e7-8f6d-69ddf2b5f6f9",
  "budgetItemId": "HEADER-4caa0eb9-4e98-4ab8-a35e-4f2c13a8f1af",
  "title": "Porsche",
  "headerBudgetedTotalCost": 643000,
  "headerActualTotalCost": null,
  "headerEffectiveMarkup": 1,
  "headerFinalTotalCost": 643000,
  "revision": 1,
  "createdAt": "2025-07-19T10:10:22.000Z",
  "updatedAt": "2025-07-19T10:10:22.000Z"
}
```

### Create Line Item

```http
POST /budgets
{
  "projectId": "9000",
  "budgetId": "8b3a6d8e-5b43-41e7-8f6f-69ddf2b5f6f9",
  "description": "Labor",
  "itemBudgetedCost": 5000
}
```

Response includes generated:

```json
{
  "budgetItemId": "LINE-7d4c4f73-8d2c-4c02-a496-6cb7f8f0e74d",
  "projectId": "9000",
  "budgetId": "8b3a6d8e-5b43-41e7-8f6f-69ddf2b5f6f9",
  "description": "Labor",
  "itemBudgetedCost": 5000,
  "createdAt": "2025-07-19T10:12:05.000Z",
  "updatedAt": "2025-07-19T10:12:05.000Z"
}
```

```http
POST /budgets
{
  "projectId": "9000",
  "budgetId": "8b3a6d8e-5b43-41e7-8f6d-69ddf2b5f6f9",
  "name": "Labor",
  "amount": 5000
}
```

Response includes generated:

```json
{
  "budgetItemId": "LINE-7d4c4f73-8d2c-4c02-a496-6cb7f8f0e74d",
  ...
}
```

### List Headers for Project

`GET /budgets?projectId=9000&headers=true`

### Open Budget

`GET /budgets?budgetId=8b3a6d8e-5b43-41e7-8f6d-69ddf2b5f6f9`

### Partial Update (PATCH)

```http
PATCH /budgets
{
  "projectId": "9000",
  "budgetItemId": "LINE-7d4c4f73-8d2c-4c02-a496-6cb7f8f0e74d",
  "amount": 6200
}
```

### Delete

`DELETE /budgets?projectId=9000&budgetItemId=LINE-7d4c4f73-8d2c-4c02-a496-6cb7f8f0e74d`

---

## Additional Examples

### Example Header Record

````json
{
  "projectId": "f3ad4f13-ddc1-4312-880a-ad71a08124bd",
  "budgetItemId": "HEADER-95c01e4b-4b5f-4603-81bc-9fb8b7ede9e7",
  "budgetId": "95c01e4b-4b5f-4603-81bc-9fb8b7ede9e7",
  "title": "MB2 Tahoe",
  "revision": 1,
  "headerBudgetedTotalCost": 81528.08,
  "headerActualTotalCost": null,
  "headerEffectiveMarkup": 1.52,
  "headerFinalTotalCost": 123746.67,
  "startDate": "2025-06-16",
  "endDate": "2025-06-23",
  "client": "",
  "notes": null,
  "createdAt": "2025-07-18T19:06:00Z",
  "updatedAt": "2025-07-18T19:06:00Z"
}
```json
{
  "projectId": "f3ad4f13-ddc1-4312-880a-ad71a08124bd",
  "budgetItemId": "HEADER-95c01e4b-4b5f-4603-81bc-9fb8b7ede9e7",
  "budgetId": "95c01e4b-4b5f-4603-81bc-9fb8b7ede9e7",
  "title": "MB2 Tahoe",
  "headerBudgetedTotalCost": 81528.08,
  "headerEffectiveMarkup": 1.52,
  "headerFinalTotalCost": 123746.67,
  "revision": 1,
  "startDate": "2025-06-16",
  "endDate": "2025-06-23",
  "createdAt": "2025-07-18T19:06:00Z",
  "updatedAt": "2025-07-18T19:06:00Z"
}
````

### Minimal Header Record

```json
{
  "projectId": "f3ad4f13-ddc1-4312-880a-ad71a08124bd",
  "budgetItemId": "HEADER-3b2c9a66-2a5f-42d7-8e96-a7d9d9f9b210",
  "budgetId": "3b2c9a66-2a5f-42d7-8e96-a7d9d9f9b210",
  "title": "New Budget",
  "headerBudgetedTotalCost": 0,
  "headerEffectiveMarkup": 1,
  "headerFinalTotalCost": 0,
  "createdAt": "2025-07-19T10:42:00Z",
  "updatedAt": "2025-07-19T10:42:00Z"
}
```

### Example Line Item Record

````json
{
  "projectId": "f3ad4f13-ddc1-4312-880a-ad71a08124bd",
  "budgetItemId": "LINE-0ee9bf47-0676-41b0-8ea3-1cf74b1580d2",
  "budgetId": "95c01e4b-4b5f-4603-81bc-9fb8b7ede9e7",
  "elementId": "DECOR-0009",
  "elementKey": "M2B-0061",
  "category": "DECOR",
  "areaGroup": "DECOR-ALL",
  "invoiceGroup": "STARLIGHT BALLROOM ENTRY",
  "description": "LED 16'' ORB SET RGB [SET OF 2 UNITS] ",
  "quantity": 1,
  "unit": "",
  "itemBudgetedTotalCost": 275,
  "itemActualTotalCost": null,
  "itemFinalTotalCost": 421.13,
  "itemMarkUp": 0.5314,
  "paymentStatus": "PAID",
  "paymentTerms": "DUE ON RECEIPT",
  "vendor": "MYLG STUDIO",
  "amountPaid": null,
  "balanceDue": null,
  "poNumber": null,
  "vendorInvoiceNumber": null,
  "paymentType": null,
  "startDate": "2025-06-16",
  "endDate": "2025-06-23",
  "title": "MB2 Tahoe",
  "notes": null
}
```json
{
  "projectId": "f3ad4f13-ddc1-4312-880a-ad71a08124bd",
  "budgetItemId": "LINE-0ee9bf47-0676-41b0-8ea3-1cf74b1580d2",
  "budgetId": "95c01e4b-4b5f-4603-81bc-9fb8b7ede9e7",
  "elementId": "DECOR-0009",
  "elementKey": "M2B-0061",
  "category": "DECOR",
  "areaGroup": "DECOR-ALL",
  "invoiceGroup": "STARLIGHT BALLROOM ENTRY",
  "description": "LED 16'' ORB SET RGB [SET OF 2 UNITS] ",
  "quantity": 1,
  "unit": "",
  "itemBudgetedCost": 275,
  "itemMarkUp": 0.5314,
  "itemFinalCost": 421.13,
  "amountPaid": null,
  "balanceDue": null,
  "paymentStatus": "PAID",
  "paymentTerms": "DUE ON RECEIPT",
  "vendor": "MYLG STUDIO",
  "vendorInvoiceNumber": null,
  "poNumber": null,
  "paymentType": null,
  "startDate": "2025-06-16",
  "endDate": "2025-06-23",
  "title": "MB2 Tahoe",
  "client": "T&C RENTALS",
  "notes": null,
  "createdAt": "2025-07-18T19:06:10Z",
  "updatedAt": "2025-07-18T19:06:10Z"
}
```json
{
  "projectId": "f3ad4f13-ddc1-4312-880a-ad71a08124bd",
  "budgetItemId": "LINE-b574b6c0-1d75-4e90-a8cb-9c5b7a4dbf6a",
  "budgetId": "95c01e4b-4b5f-4603-81bc-9fb8b7ede9e7",
  "description": "Truss Rental",
  "itemBudgetedCost": 1200,
  "itemFinalCost": 1824,
  "itemMarkUp": 0.52,
  "quantity": 3,
  "unit": "",
  "startDate": "2025-06-16",
  "endDate": "2025-06-23"
}
````

```json
{
  "projectId": "f3ad4f13-ddc1-4312-880a-ad71a08124bd",
  "budgetItemId": "LINE-b574b6c0-1d75-4e90-a8cb-9c5b7a4dbf6a",
  "budgetId": "95c01e4b-4b5f-4603-81bc-9fb8b7ede9e7",
  "description": "Truss Rental",
  "itemBudgetedCost": 1200,
  "itemFinalCost": 1824,
  "itemMarkUp": 0.52,
  "quantity": 3,
  "unit": "",
  "startDate": "2025-06-16",
  "endDate": "2025-06-23"
}
```

> **Decision:** You can phase out `itemType` entirely *without* refactoring queries; the `HEADER-` prefix alone unambiguously identifies the header. Retain `itemType` only if you want human readability or plan future type-based filters.

This is a *non-header* ("line") budget entry. Note it **does not** have header aggregate fields, and its `budgetItemId` here is *not* prefixed (legacy style). In the current convention we recommend prefixing with `LINE-<uuid>`, but the API supports legacy plain UUIDs.

```json
{
  "projectId": "f3ad4f13-ddc1-4312-880a-ad71a08124bd",
  "budgetItemId": "0ee9bf47-0676-41b0-8ea3-1cf74b1580d2",
  "amountPaid": null,
  "areaGroup": "DECOR-ALL",
  "balanceDue": null,
  "budgetId": "95c01e4b-4b5f-4603-81bc-9fb8b7ede9e7",
  "category": "DECOR",
  "client": "T&C RENTALS",
  "description": "LED 16'' ORB SET RGB [SET OF 2 UNITS] ",
  "elementId": "DECOR-0009",
  "elementKey": "M2B-0061",
  "endDate": "2025-06-23",
  "invoiceGroup": "STARLIGHT BALLROOM ENTRY",
  "itemActualCost": null,
  "itemBudgetedCost": 275,
  "itemFinalCost": 421.13,
  "itemMarkUp": 0.5314,
  "notes": null,
  "paymentStatus": "PAID ",
  "paymentTerms": "DUE ON RECEIPT",
  "paymentType": null,
  "poNumber": null,
  "quantity": 1,
  "unit": "",
  "startDate": "2025-06-16",
  "title": "MB2 Tahoe",
  "vendor": "MYLG STUDIO",
  "vendorInvoiceNumber": null
}
```

## Creation & Editing Strategy

| Operation               | Strategy                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Create                  | **POST**, server-owned ID prefixes, conditional insert to avoid overwriting duplicates. |
| Edit                    | **PATCH** updates only provided fields + `updatedAt`.                                   |
| Remove                  | **DELETE** physical deletion (can convert to soft delete later).                        |
| Full replace (optional) | **PUT** supported only if needed (can be removed to reduce complexity).                 |

---


### Revision Management

- New projects automatically create a budget header with `revision` **1**.
- All line items include a `revision` field matching their parent header.
- Duplicating a revision copies line items and increments the header revision.
- Queries for line items should filter by the active revision.

---

## Validation & Errors

* `projectId` required for all mutations.
* `budgetId` required except when creating a header without one (server generates).
* `budgetItemId` required for `PATCH`, `DELETE`, composite `GET`.
* 400 errors returned as:

  ```json
  { "error": "message" }
  ```
* Conditional create failure (duplicate key) also returns 400 with DynamoDB message.

---

## Header Totals Strategy

Two options:

| Approach | Description                                      | Default                                             |
| -------- | ------------------------------------------------ | --------------------------------------------------- |
| Eager    | Update header aggregates on every line mutation. | Recommended if line counts moderate.                |
| Lazy     | Compute on demand (query lines & sum).           | Simpler code, higher read cost when opening budget. |

Current implementation **stores totals on header**; you decide when/how to recompute.

---

## Environment Variables

| Variable     | Required | Description                                  |
| ------------ | -------- | -------------------------------------------- |
| `TABLE_NAME` | Yes      | DynamoDB table name (defaults to `Budgets`). |

---

## Deployment (SAM)

Example snippet (function only):

```yaml
Resources:
  BudgetsApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs18.x
      CodeUri: .
      MemorySize: 1024
      Timeout: 20
      Policies:
        - AmazonDynamoDBFullAccess # tighten in prod
      Environment:
        Variables:
          TABLE_NAME: Budgets
      Events:
        BudgetsApiEvent:
          Type: HttpApi
          Properties:
            Path: /budgets
            Method: ANY
            ApiId: !Ref BudgetsHttpApi
```

---

## Local Testing

**Invoke create header:**

```bash
sam local invoke BudgetsApiFunction \
  --event <(echo '{"httpMethod":"POST","body":"{\\"projectId\\":\\"9000\\",\\"itemType\\":\\"header\\",\\"title\\":\\"Test\\"}"}')
```

**Query headers:**

```bash
sam local invoke BudgetsApiFunction \
  --event <(echo '{"httpMethod":"GET","queryStringParameters":{"projectId":"9000","headers":"true"}}')
```

---

## Extensibility Ideas

| Feature                | Outline                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| Soft Delete            | Add `deletedAt` and filter in queries.                                |
| Optimistic Concurrency | Store `version` and condition on `version = :expected`.               |
| Pagination             | Add `Limit` & `LastEvaluatedKey` to project / budget queries.         |
| Role-Based Access      | Inject user context (JWT) & enforce per-project rights.               |
| Derived Indexes        | Add `itemType-projectId-index` if you need bulk line or header scans. |
| Batch Endpoints        | Endpoint to return `{ header, items }` in one call (two queries).     |

---

## Changelog

| Date       | Change                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| 2025-07-19 | Initial README draft for Budgets API Lambda, header/line unified model. |

---

**Questions or next steps?** Open an issue or request enhancements (e.g., totals recompute function, seed script).
