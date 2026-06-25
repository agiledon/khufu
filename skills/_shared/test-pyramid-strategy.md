# Test Pyramid Strategy

Shared module defining the responsibilities of each test layer, coverage overlap rules, and deduplication strategy.

## Core Principle

> **Each layer tests what the layer below CANNOT.** Higher layers should only add tests for risk dimensions that lower layers are structurally incapable of covering. Testing the same behavior at multiple layers is waste.

## Layer Responsibility Matrix

| Dimension | UT (Unit) | IT (Integration) | API (Boundary) | E2E (End-to-End) |
|-----------|-----------|------------------|----------------|------------------|
| **Scope** | Single function/method | Multiple real components | HTTP/gRPC endpoints | Complete user journeys |
| **What to test** | Business logic, algorithms, validation rules, state transitions, error handling | Component wiring, transaction boundaries, ORM mappings, DB constraints, serialization/deserialization | Status codes, response schemas, headers, auth/authz, error format, content negotiation, CORS | Critical business flows, multi-page workflows, user-visible outcomes |
| **What NOT to test** | Framework internals, DB queries, HTTP routing, UI rendering | Business logic details (belongs in UT), HTTP status codes (belongs in API), UI behavior (belongs in E2E) | Component internals, DB state (belongs in IT), UI rendering | Edge-case validation (belongs in UT), exhaustive error paths (belongs in UT), visual styling |
| **Mock strategy** | ALL external deps mocked | Only external services mocked (payment gateways, email) | App runs real; external services mocked | Nothing mocked — full system |
| **Typical quantity** | Hundreds | Tens | Tens | ~5-10 |
| **Typical speed** | <100ms each | <2s each | <500ms each | 10s-60s each |

## Coverage Decision Matrix

When a lower layer already covers a scenario, use this table to decide whether a higher layer should also test it:

| Lower Layer Coverage | Should IT Test? | Should API Test? | Should E2E Test? |
|---------------------|-----------------|------------------|------------------|
| UT: `createUser()` logic (validation, edge cases) | ❌ No new risk | ❌ No new risk | ❌ No new risk |
| UT: Exception thrown on duplicate email | ❌ No new risk | ❌ No new risk | ❌ No new risk |
| UT doesn't cover DB persistence | ✅ **IT adds**: verify actual INSERT, read-back | ❌ IT covers this | ❌ IT covers this |
| UT doesn't cover transaction rollback | ✅ **IT adds**: verify atomic writes | ❌ IT covers this | ❌ IT covers this |
| IT doesn't cover HTTP status codes | — | ✅ **API adds**: verify 200/201/400/404/422 | ❌ API covers this |
| IT doesn't cover auth token handling | — | ✅ **API adds**: verify 401/403 | ❌ API covers this |
| API doesn't cover browser rendering | — | — | ✅ **E2E adds**: verify user sees success message |
| API doesn't cover multi-page flow | — | — | ✅ **E2E adds**: verify registration→login→dashboard |

## Deduplication Workflow

When generating tests at a given layer, follow this process:

### Step 1: Scan Lower Layers

Use **Glob** to find existing test files from lower layers:

```
UT → scan for `__tests__/**/*.test.*`
IT → scan for `__tests__/**/*.test.*` (UT) and `__tests__/integration/**/*.test.*` (other IT)
API → scan for `__tests__/**/*.test.*` (UT+IT) and `__tests__/api/**/*.test.*` (other API)
E2E → scan for all lower layer tests
```

### Step 2: Analyze for New Risk

For each candidate test scenario, ask:

1. **What is the core verification point?** (e.g., "validation throws exception")
2. **Can a lower layer structurally verify this?** (e.g., UT can verify exception is thrown — YES)
3. **Is there a NEW risk dimension only this layer can catch?** (e.g., "exception maps to 422 status code" — only API can verify)

| Layer | Unique Risk Dimensions |
|-------|----------------------|
| UT | Algorithm correctness, boundary conditions, state machine transitions |
| IT | DB constraint violations, transaction boundaries, ORM configuration, data integrity across tables |
| API | HTTP status code correctness, response header presence, auth middleware behavior, content negotiation |
| E2E | Cross-page state, browser interactions, visual feedback, network failures during navigation |

### Step 3: Decision

```
Lower layer covers the verification point?
├── No → Generate test (new coverage)
└── Yes
    └── Current layer has a UNIQUE risk dimension?
        ├── Yes → Generate test (focused on the unique dimension only)
        └── No → SKIP. Record as "Skipped (covered by <lower-layer>)"
```

### Step 4: Report

Include skipped scenarios in the report with explicit rationale:

```markdown
### Skipped (Covered by Lower Layer)

| Scenario | Skipped At | Already Covered By |
|----------|-----------|-------------------|
| Duplicate email throws exception | IT | UT: `UserService.test.ts` — `shouldThrowException_whenDuplicateEmail` |
| User data persisted to DB | API | IT: `UserServiceIT.test.ts` — `shouldPersistUserToDatabase` |
```

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | What to Do Instead |
|-------------|-------------|-------------------|
| Re-testing business logic in IT | Slow, redundant, fragile | Move logic verification to UT; IT only verifies wiring |
| API test checking DB contents | API tests should be black-box; DB inspection belongs to IT | Verify through subsequent API calls or move to IT |
| E2E testing all error paths | Extremely slow; E2E should cover critical flows only | Error path coverage belongs in UT + API |
| Mocking in E2E | Defeats the purpose of end-to-end verification | Use real services; seed test data for error scenarios |

## When to Break the Rules

- **Regulatory/compliance requirement**: If auditors require a specific test at a specific layer, write it regardless of overlap.
- **Critical security path**: Authentication and authorization flows warrant testing at EVERY layer.
- **External contract**: API tests for externally-consumed endpoints should be comprehensive even if IT covers the internals.
