---
name: khufu-api
description: >-
  This skill should be used when the user wants to generate API tests, asks for "API tests", mentions "API测试", "khufu-api", "REST tests", "contract tests", or wants to test HTTP/REST/gRPC endpoints. Supports spec-based generation (with @path to OpenAPI/Swagger spec or API documentation) and code-based generation (from existing route definitions and handlers). API tests verify the application from the network boundary — status codes, response bodies, headers, and error formats.
version: 0.3.0
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
  - Task
  - Agent
---

# khufu-api: API Test Generator

Generate API tests — the **service boundary layer** of the test pyramid. API tests verify that the application's HTTP, REST, gRPC, or GraphQL endpoints behave correctly from the network boundary. They are black-box tests that validate status codes, response bodies, headers, error handling, and authentication/authorization.

## Core Principles

- **Black-box from the boundary**: Test through HTTP/gRPC — no internal method calls
- **Contract validation**: Verify the API response shape matches the spec (OpenAPI/Swagger/GraphQL schema)
- **Status codes matter**: Test correct 2xx, 4xx, 5xx responses for each scenario
- **Error format validation**: Verify error responses have consistent structure
- **Auth scenarios**: Test unauthenticated, unauthorized, and authorized access paths
- **Idempotency**: GET, PUT, DELETE should be idempotent; POST should create new resources
- **EDD**: Define evaluation criteria first (Read `_shared/evaluation-framework.md`)

## Workflow

### Step 1: Environment Setup (Shared)

Read the following shared modules to configure the test generation environment:

1. **Read `_shared/mode-selection.md`** — determines spec-based vs code-based generation mode. For API tests, spec-based mode supports OpenAPI/Swagger (`.yaml`, `.json`), GraphQL schema (`.graphql`), API Blueprint, or Markdown API docs.
2. **Read `_shared/language-detection.md`** — detects language, build system, and reads `khufu.yaml` configuration.
3. **Read `_shared/framework-selector.md`** with `layer: api` — selects the API test framework (REST Assured, Supertest, httpx, etc.).
4. **Read `_shared/directory-resolver.md`** with `layer: api` — determines the output directory.

### Step 1.5: Verify Source Compilation (Pre-Generation)

**Read `_shared/compilation-verification.md` Phase 0** and follow its workflow:

1. **Determine the build command** for the detected language and build system.
2. **Run source compilation** using **Bash** to verify the target project compiles BEFORE generating tests.
3. **If compilation FAILS**: categorize errors, report diagnosis with fix suggestions. **DO NOT proceed** with test generation.
4. **If compilation SUCCEEDS**: log confirmation and continue to Step 2.

### Step 2: EDD — Define Evaluation Criteria

**Read `_shared/evaluation-framework.md`** and follow its EDD workflow:

1. For API layer, select applicable dimensions:
   - **Correctness** (required): status codes, response body shape, header presence
   - **Contract** (required): schema validation, content-type correctness, error format consistency
   - **Robustness** (recommended): auth/authz scenarios, rate limiting, CORS headers
   - **Maintainability** (required): test independence, base URL configurability

2. Populate the spec file's `## Evaluation Criteria` section.

### Step 3: Dedup Checks

#### 3.0 Spec Doc Scan (Pre-Generation Dedup — Execution Records)

**Read `_shared/spec-doc-scanner.md`** and follow its workflow to scan `docs/khufu/` execution record specs:

1. **Glob for ALL API spec docs**: `docs/khufu/api/*-api-test-cases.md` (all dates, not just today)
2. **Parse every spec doc** — extract endpoint (Target Class) + HTTP method (Target Method) + Status from ALL rows
3. **Build a comprehensive skip list** across ALL dates of already-tested API endpoints
4. **Cross-reference with discovered endpoints** to produce a Coverage Gap Analysis
5. Hold this skip list for merging with spec-sync results in Step 3.2

**If no spec docs exist** (first ever run): return empty skip list and proceed normally.

#### 3.1 Pyramid Dedup (Cross-Layer)

**Read `_shared/test-pyramid-strategy.md`.** Before generating API tests:

1. **Scan for existing UT and IT tests** — use **Glob** to find lower-layer tests.
2. **For each candidate API test scenario**, check:
   - Does UT already cover the business logic? → API doesn't need to re-verify logic.
   - Does IT already cover DB persistence? → API doesn't need to inspect DB.
   - What NEW risk does API add? → HTTP status code mapping, response schema shape, auth middleware behavior, content negotiation.
3. **Skip scenarios** where API adds no new risk dimension.
4. Record skipped scenarios with rationale.

#### 3.2 Spec Sync — Incremental Check (Cross-Run)

**Read `_shared/spec-sync.md`.** Before generating API tests, check if previous runs have already produced tests. This prevents regenerating the same API tests on repeated executions.

Follow the module's workflow to build a **skip list**:

1. **Check spec system status**: Read `khufu.yaml` → `spec.enabled`.

2. **If spec enabled AND spec files exist** (Phase 2):
   - Glob for `specs/**/spec.v*.md`
   - Parse each spec file for API test cases with `status: implemented` AND `Test File:` paths
   - Filter to `API-` prefixed cases only
   - Map endpoint paths back to route handlers → these are already covered
   - Build the skip list

3. **If spec disabled OR no spec files exist** (Phase 3 — file-based fallback):
   - Glob for existing API test files in the API test directory
   - Infer covered endpoints from test file names (e.g., `user.api.test.ts` → `/api/users/*`)
   - Build the skip list
   - **Warn**: File-based fallback is less precise; recommend enabling spec system

4. **Feed skip list forward**: The merged skip list is consumed by Step 5.

#### 3.3 Early Exit Gate — Fully Covered

**After merging skip lists**, compare against all discovered API endpoints:

- **If ALL endpoints are fully covered** → **Exit immediately**:
  ```
  ✓ All API endpoints are already covered by existing tests. No new tests needed.
    - <N> spec docs scanned across <M> dates
    - <X> endpoints — all covered
    To regenerate tests, delete the relevant spec docs or test files first.
  ```

- **If gaps exist** → Continue to Step 4. Focus generation ONLY on uncovered endpoints.

**Key rule**: An API test that already exists and is tracked MUST NOT be regenerated.

### Step 4: Setup Test Data Strategy

**Read `_shared/test-data-factories.md`.** For API tests:

1. **Preferred**: Create test data through the API itself (validate the write path):
   ```typescript
   const res = await request(app).post('/api/users').send(aDefaultUser());
   ```
2. **Fallback**: For complex prerequisites, seed directly via DB (reuse IT data factories):
   ```typescript
   await seedUser(anAdminUser()); // from shared factory
   ```

### Step 5: Generate API Tests

#### 5.0 Parallel Execution (Large Systems)

For large systems with many API endpoints, writing API tests sequentially is time-consuming. Before generating tests, evaluate whether parallel sub-agent execution is appropriate.

**Read `_shared/parallel-execution.md`** and follow its workflow:

1. **Count target API endpoints/resource groups**: If the total number of endpoint groups to test is **>= 3**, parallel execution is warranted.

2. **Detect sub-agent support**: Check if the host agent supports the `Agent` tool for spawning sub-agents.

3. **If sub-agent supported AND target count >= 3**:
   - **Partition work** following `_shared/parallel-execution.md` Phase 2:
     - **Code-based**: Group API endpoints by resource (e.g., `/api/users/*`, `/api/orders/*`, `/api/products/*`).
     - **Spec-based**: Group OpenAPI paths by tag/resource group, or partition spec scenarios by domain.
   - **Ensure independence**: Partitions should cover disjoint resource paths. If one endpoint depends on data created by another endpoint's partition, either merge partitions or note the dependency for sequential data setup.
   - **Launch parallel sub-agents** in a single message (all concurrent), each receiving a self-contained prompt with:
     - Assigned API endpoints or spec scenarios
     - Language, framework (from Step 1.2 and Step 1.3)
     - Test directory (from Step 1.4)
     - Evaluation criteria (from Step 2)
     - Pyramid dedup results — scenarios to skip (from Step 3)
     - Test data strategy (from Step 4)
     - Base URL pattern and auth configuration
     - Annotation format (from the skill's annotation guidelines)
     - Instructions to read route handlers or parse spec, generate tests per Steps 5.1-5.2 guidelines, and write test files
   - **Collect results**: After all sub-agents complete, merge their summaries and endpoint coverage matrices.
   - **Handle failures**: If any sub-agent fails, generate remaining tests for that partition sequentially.
   - **Skip Steps 5.1-5.2**. Proceed to Step 6.

4. **If sub-agent NOT supported**: Fall through to Steps 5.1-5.2 for sequential generation.

5. **If target count < 3**: Skip parallel execution. Fall through to Steps 5.1-5.2.

#### 5.1 SPEC-BASED Generation:

1. **Parse the API specification**:
   - **OpenAPI/Swagger** (`.yaml`, `.json`): Parse paths, methods, request/response schemas, status codes, security schemes
   - **GraphQL schema** (`.graphql`): Parse queries, mutations, types, required fields
   - **API Blueprint**: Parse resource groups, actions, request/response pairs
   - **Markdown docs**: Parse documented endpoints, example requests/responses

2. For each endpoint in the spec, generate tests covering:
   - **Happy path**: Valid request → expected 2xx response with correct body shape
   - **Response schema validation**: Verify response body matches the declared schema
   - **Required headers**: Check that required response headers are present
   - **Authentication required** (if endpoint has security): Test without auth → 401
   - **Authorization** (if endpoint has scopes/roles): Test with insufficient permissions → 403
   - **Validation errors**: Invalid/missing required fields → 422 or 400 with error details
   - **Not found**: Non-existent resource ID → 404
   - **Content type**: Verify correct Content-Type header
   - **Pagination**: (if applicable) Test page size limits, empty pages, invalid page params
   - **Rate limiting**: (if documented) Test rate limit headers

3. If the spec includes multiple status code responses, generate a test for each documented status code.
4. If the spec includes example request/response pairs, use those as test fixtures.
5. Each test includes: `// Spec: API-<ENTITY>-<NNN> | Evaluates: <dimension>`

#### 5.2 CODE-BASED Generation:

1. **Discover API routes**: Use **Glob** and **Grep** to find route definitions:
   - Java: `@GetMapping`, `@PostMapping`, `@RequestMapping` (Spring), `@Path` (JAX-RS)
   - Python: `@app.route`, `@router.get`, `@api_view` (Flask/FastAPI/Django)
   - TypeScript: `app.get(`, `router.post(` (Express), `@Get`, `@Post` (NestJS)
   - Go: `mux.HandleFunc`, `router.GET`, `r.Group(`
   - C#: `[HttpGet]`, `[HttpPost]`, `MapGet` (ASP.NET Core)

2. **Read each route handler**: Use **Read** to understand HTTP method, path, params, auth, responses.

3. For each endpoint, after pyramid dedup (Step 3), generate tests covering:
   - **All documented HTTP methods** (GET, POST, PUT, PATCH, DELETE)
   - **Path parameter variations**: valid ID, non-existent ID, malformed ID
   - **Query parameter combinations**: required params, optional params, invalid values
   - **Request body validation**: valid body, missing required fields, wrong types
   - **Auth scenarios**: no token, expired token, wrong role
   - **CORS headers**: (if applicable) OPTIONS preflight, allowed origins

### Step 6: Configure API Coverage

Traditional code coverage tools don't apply well to API tests. Use **endpoint coverage** instead:

1. **Generate an endpoint coverage matrix:**

| Method | Path | Status Codes Tested | Schema Validated |
|--------|------|--------------------|--------------------|
| GET | /api/users/{id} | 200, 404 | ✅ |
| POST | /api/users | 201, 400, 422 | ✅ |
| DELETE | /api/users/{id} | 204, 404 | N/A |

2. **Status Code Coverage**: For each endpoint, verify that all documented status codes are covered.

3. **Schema/Contract Coverage**: If using OpenAPI/Swagger, recommend validators (`openapi-validator`, `chai-openapi-response-validator`, `schemathesis`).

4. Document the coverage tracking approach for the selected language.

### Step 7: Generate Spec File

Same process — see `_shared/evaluation-framework.md`. Mark generated API test cases with `status: implemented`.

### Step 8: Write Tests to Files

1. Use **Write** to create each test file in the API test directory.
2. Organize tests by resource/endpoint group.
3. Include test data/fixtures as constants or helper functions (referencing shared factories from `_shared/test-data-factories.md`).
4. Add a base URL configuration that can be overridden by environment variables.
5. Include spec reference header comment.

### Step 9: Verify Test Compilation & Execution

#### 9-A: Verify Test Compilation

**Read `_shared/compilation-verification.md` Phase 1** and follow its workflow:

1. **Run the test compilation command** for the language and framework.
2. **If test compilation FAILS**: categorize, auto-fix (up to 3 retries), or report unfixable errors.
3. **Note for API tests**: May depend on HTTP client libraries (REST Assured, Supertest, httpx) and schema validators. Ensure they are added to test dependencies.

#### 9-B: Verify Test Execution

**Read `_shared/test-execution-verification.md`** and follow its workflow:

1. **Check API-specific prerequisites**:
   - Application entry point identified and startable.
   - Port configuration known (or use random port for testing).
   - Auth credentials/test tokens available for protected endpoints.
2. **For in-process API tests** (Supertest, Spring MockMvc, pytest TestClient): start the app in test mode and verify it boots.
3. **For out-of-process API tests** (REST Assured, httpx): verify the app can start on a test port.
4. **Run a dry-run smoke test** — GET a known endpoint or health check.
5. **If runtime error**: diagnose (app fails to start? port in use? auth config missing?) and report fix.
6. **Run all generated API tests** and categorize results.
7. **Report execution summary**.

### Step 10: Generate Spec Documentation (SDD)

**Read `_shared/spec-doc-generator.md`** and follow its workflow to produce the execution record spec document.

**MANDATORY — Before any file operations**, ensure the base directory and current layer's subdirectory exist:

```bash
mkdir -p docs/khufu/api
```

> Only create the `api/` subdirectory — do NOT create subdirectories for other test types (ut/, it/, e2e/). Other types will create their own when they run.

1. **Collect data** from Steps 8 (test execution) and 9 (endpoint coverage):
   - Resource group/endpoint inventory and test files generated
   - Test execution results: pass/fail/skip per endpoint
   - Endpoint coverage matrix: method, path, status codes, schema validated
   - Framework info: test framework + version
   - Test case details grouped by resource: Test Class, Endpoint (Target), HTTP Methods, Status

2. **Determine the spec doc path**:
   - Read `khufu.yaml` → `spec.docsDirectory` (default: `docs/khufu/`)
   - Path: `docs/khufu/api/<YYYY-MM-DD>-api-test-cases.md`

3. **Build the spec doc** following the template in `_shared/spec-doc-generator.md` (for API, modules → resource groups, Target Class → Endpoint, Target Method(s) → HTTP Methods)

4. **Check for existing spec doc** (same date + same layer):
   - **If exists**: Read → increment `**Version**` → **APPEND** within each resource group's subsection
   - **If not exists**: Create with `**Version**: 1`

5. **Write the spec doc** and **update the wizard file** `docs/khufu/test-cases.md`.

### Step 11: Report Summary

**Read `_shared/report-template.md`** and generate using the API-specific sections:
- Summary table with pyramid skip count
- Endpoint coverage matrix
- Coverage by HTTP method and status code category
- Evaluation Results (if EDD enabled)
- Spec Coverage (if spec system enabled)
- Suggested run command (start app + execute tests)

## API Test Patterns

### REST Assured (Java)
```java
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

@Tag("api")
class UserApiTest {
    @Test
    @DisplayName("API-USER-001: shouldReturnUser_whenValidIdGiven")
    // Spec: specs/UserRegistration/spec.v1.md
    // Evaluates: Correctness — HTTP 契约正确
    void shouldReturnUser_whenValidIdGiven() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/users/{id}", 1)
        .then()
            .statusCode(200)
            .body("id", equalTo(1))
            .body("name", notNullValue());
    }

    @Test
    @DisplayName("API-USER-002: shouldReturn404_whenUserNotFound")
    // Evaluates: Contract — 错误状态码覆盖
    void shouldReturn404_whenUserNotFound() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/users/{id}", 99999)
        .then()
            .statusCode(404);
    }
}
```

### Supertest (TypeScript)
```typescript
import request from 'supertest';
import app from '../app';

/**
 * Spec: specs/UserRegistration/spec.v1.md
 * Test Cases: API-USER-001, API-USER-002
 */
describe('GET /api/users/:id', () => {
  it('should return user with valid id', async () => {
    // Spec ID: API-USER-001 | Evaluates: Correctness
    const res = await request(app)
      .get('/api/users/1')
      .expect(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('name');
  });

  it('should return 404 for non-existent user', async () => {
    // Spec ID: API-USER-002 | Evaluates: Contract
    await request(app)
      .get('/api/users/99999')
      .expect(404);
  });
});
```

### pytest + httpx (Python)
```python
import pytest
import httpx

BASE_URL = "http://localhost:8000"

@pytest.mark.asyncio
# Spec: specs/UserRegistration/spec.v1.md
# Spec ID: API-USER-001
# Evaluates: Correctness — HTTP 契约正确
async def test_get_user_valid_id():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/users/1")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
```

### Language-Agnostic API Testing for C++ Backends

**Important:** For C++ HTTP/REST API backends, we recommend **language-agnostic API testing**. API tests verify behavior at the HTTP boundary — the backend implementation language is irrelevant to the test client.

**Primary recommendation: Python pytest + httpx**

Python has the richest ecosystem for API testing (schemathesis, hypothesis, OpenAPI tooling). Use it to test any HTTP API regardless of backend language.

```python
import pytest
import httpx

BASE_URL = "http://localhost:8080"

# Spec: specs/UserService/spec.v1.md
# Spec ID: API-USER-001
# Evaluates: Correctness — HTTP 契约正确
@pytest.mark.asyncio
async def test_get_user_valid_id():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/users/1")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
```

**Alternative: Node.js Supertest (language-agnostic)**

```typescript
import request from 'supertest';

const BASE_URL = 'http://localhost:8080';

/**
 * Spec: specs/UserService/spec.v1.md
 * Spec ID: API-USER-001 | Evaluates: Correctness
 */
describe('GET /api/users/:id', () => {
  it('should return user with valid id', async () => {
    const res = await request(BASE_URL)
      .get('/api/users/1')
      .expect(200);
    expect(res.body).toHaveProperty('id', 1);
  });
});
```

**C++ Native Option (for teams that prefer C++ throughout):**

```cpp
#include <gtest/gtest.h>
#include <httplib.h>

// Spec: specs/UserService/spec.v1.md
// Spec ID: API-USER-001
// Evaluates: Correctness — HTTP 契约正确
TEST(UserApiTest, ShouldReturnUserWhenValidIdGiven) {
    httplib::Client cli("http://localhost:8080");
    auto res = cli.Get("/api/users/1");
    ASSERT_EQ(res->status, 200);
    // Parse and validate JSON response
}
```

## Contract Testing (Optional)

If the user mentions "contract testing" or "Pact", also generate consumer contract tests:
- Define expected interactions (request → response)
- Generate Pact files for provider verification
- Verify against the provider's actual implementation

## Best Practices

- Use environment variables for base URL, credentials, API keys
- Keep test data representative of real API usage
- Test error response bodies, not just status codes
- Verify response time is acceptable (add timeout assertions)
- Group tests by resource (users, orders, products) for readability
- Each test should be independent (create its own data, clean up if needed)
- Test the API contract, not the internal implementation
- Read `_shared/test-data-factories.md` for shared data setup — prefer API-based data creation
