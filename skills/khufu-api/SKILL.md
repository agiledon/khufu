---
name: khufu-api
description: >-
  This skill should be used when the user wants to generate API tests, asks for "API tests", mentions "API测试", "khufu-api", "REST tests", "contract tests", or wants to test HTTP/REST/gRPC endpoints. Supports spec-based generation (with @path to OpenAPI/Swagger spec or API documentation) and code-based generation (from existing route definitions and handlers). API tests verify the application from the network boundary — status codes, response bodies, headers, and error formats.
version: 0.1.0
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
  - Task
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

## Workflow

### Step 1: Determine Generation Mode

**If `$ARGUMENTS` contains a file or directory path** (user provided `@path/to/specs`):
- SPEC-BASED mode: Read the API spec (OpenAPI/Swagger YAML/JSON, GraphQL schema, API Blueprint, or plain documentation)

**If `$ARGUMENTS` is empty**:
- Use the **AskUserQuestion** tool:
  1. "Spec-based: I'll provide API specification documents (OpenAPI/Swagger/etc.)"
  2. "Code-based: Read existing route definitions and handlers"

### Step 2: Detect or Confirm Language

1. Check `khufu.yaml` for configured language.
2. Auto-detect from project files if absent.
3. Confirm with user using **AskUserQuestion**.

### Step 3: Select API Test Framework

Based on the language, present options using **AskUserQuestion**:

**For Java**:
- **REST Assured** (Recommended): Fluent Java DSL for REST API testing. Given/When/Then syntax.
- **Spring MockMvc** (Recommended for Spring): Server-side testing without deployment.
- **Pact JVM**: Consumer-driven contract testing between services.

**For Python**:
- **pytest + httpx** (Recommended): Modern async HTTP client for testing REST APIs.
- **pytest + requests**: Classic approach with the popular requests library.
- **schemathesis**: Property-based API testing from OpenAPI schemas.

**For TypeScript/JavaScript**:
- **Supertest** (Recommended): HTTP assertion library for Express/Koa/Fastify APIs.
- **Pact JS**: Consumer-driven contract testing.
- **k6**: Performance-oriented API testing (for load-bearing API tests).

**For Go**:
- **testing + httptest** (Recommended): Standard library HTTP test server.
- **go-resty + testing**: Fluent HTTP client for API testing.

**For C#**:
- **RestSharp + xUnit** (Recommended): Popular REST client with xUnit integration.
- **xUnit + WebApplicationFactory**: ASP.NET Core in-memory test server.

### Step 4: Determine Test Directory

| Language | API Test Location |
|----------|-------------------|
| Java | `src/test/java/<package>/api/` or separate `api-test` module |
| Python | `tests/api/` |
| TypeScript/JS | `__tests__/api/` or `tests/api/` |
| Go | `api/` directory or `*_api_test.go` files |
| C# | `<Project>.ApiTests/` test project |

Check `khufu.yaml` for custom directory overrides.

### Step 5: Generate API Tests

#### SPEC-BASED Generation:

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

#### CODE-BASED Generation:

1. **Discover API routes**: Use **Glob** and **Grep** to find route definitions:
   - Java: `@GetMapping`, `@PostMapping`, `@RequestMapping` (Spring), `@Path` (JAX-RS)
   - Python: `@app.route`, `@router.get`, `@api_view` (Flask/FastAPI/Django)
   - TypeScript: `app.get(`, `router.post(` (Express), `@Get`, `@Post` (NestJS)
   - Go: `mux.HandleFunc`, `router.GET`, `r.Group(`
   - C#: `[HttpGet]`, `[HttpPost]`, `MapGet` (ASP.NET Core)

2. **Read each route handler**: Use **Read** to understand:
   - HTTP method and path (including path parameters)
   - Required request body/query parameters
   - Authentication/authorization middleware
   - Response status codes used
   - Response body structure

3. For each endpoint, generate tests covering:
   - **All documented HTTP methods** (GET, POST, PUT, PATCH, DELETE)
   - **Path parameter variations**: valid ID, non-existent ID, malformed ID
   - **Query parameter combinations**: required params, optional params, invalid values
   - **Request body validation**: valid body, missing required fields, wrong types
   - **Auth scenarios**: no token, expired token, wrong role
   - **CORS headers**: (if applicable) OPTIONS preflight, allowed origins

### Step 6: Configure API Coverage Tracking

Traditional code coverage tools don't apply well to API tests (they test from outside the process). Instead, configure **API coverage** metrics that measure endpoint and contract coverage.

1. **Endpoint Coverage**: Track which API endpoints have tests and which don't. Generate an endpoint coverage matrix:

| Method | Path | Status Codes Tested | Schema Validated |
|--------|------|--------------------|--------------------|
| GET | /api/users/{id} | 200, 404 | ✅ |
| POST | /api/users | 201, 400, 422 | ✅ |
| DELETE | /api/users/{id} | 204, 404 | N/A |

2. **Status Code Coverage**: For each endpoint, verify that all documented status codes are covered by at least one test.

3. **Schema/Contract Coverage**: If using OpenAPI/Swagger:
   - Use an OpenAPI validator (e.g., `openapi-validator`, `chai-openapi-response-validator`) to verify response schemas
   - Ensure every schema property is tested
   - If using Pact for contract testing, verify provider states against consumer expectations

4. **Tools for API Coverage Tracking**:

| Language | API Coverage Approach |
|----------|----------------------|
| Java | REST Assured + OpenAPI validator; or generate an endpoint coverage report via custom test listener |
| Python | pytest + `schemathesis` (property-based API testing from OpenAPI); `pytest-httpserve` for recording |
| TypeScript/JS | Supertest + `jest-html-reporters`; or `swagger-coverage` tool |
| Go | `httptest` + custom coverage tracking via test helpers |

5. **If the project has an OpenAPI spec**: Configure `schemathesis` or an OpenAPI coverage tool to measure:
   - Path coverage (% of documented paths with tests)
   - Status code coverage per path
   - Response schema validation pass rate

6. **Generate a coverage tracking document** (e.g., `api-coverage.md`) summarizing endpoint coverage, with TODOs for uncovered paths.

### Step 7: Write Tests to Files

1. Use **Write** to create each test file in the API test directory.
2. Organize tests by resource/endpoint group.
3. Include test data/fixtures as constants or helper functions.
4. Add a base URL configuration that can be overridden by environment variables.
5. Add a comment indicating generated by khufu-api.

### Step 8: Report Summary

Report:
- Number of API test files created
- Number of endpoints covered
- Coverage by HTTP method (GET, POST, PUT, DELETE, etc.)
- Coverage by status code category (2xx, 4xx, 5xx)
- API coverage matrix showing gaps
- API coverage tooling recommended (e.g., schemathesis, OpenAPI validator)
- Endpoints that need manual review (complex auth flows, file uploads, etc.)
- Suggested command to run: how to start the app and execute the API tests
- Coverage by status code category (2xx, 4xx, 5xx)
- Endpoints that need manual review (complex auth flows, file uploads, etc.)
- Suggested command to run: how to start the app and execute the API tests

## API Test Patterns

### REST Assured (Java)
```java
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

class UserApiTest {
    @Test
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

### pytest + httpx (Python)
```python
import pytest
import httpx

BASE_URL = "http://localhost:8000"

@pytest.mark.asyncio
async def test_get_user_valid_id():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/users/1")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data

@pytest.mark.asyncio
async def test_create_user_valid_body():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.post(
            "/api/users",
            json={"name": "Alice", "email": "alice@example.com"}
        )
        assert response.status_code == 201
```

### Supertest (TypeScript)
```typescript
import request from 'supertest';
import app from '../app';

describe('GET /api/users/:id', () => {
  it('should return user with valid id', async () => {
    const res = await request(app)
      .get('/api/users/1')
      .expect(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('name');
  });

  it('should return 404 for non-existent user', async () => {
    await request(app)
      .get('/api/users/99999')
      .expect(404);
  });
});
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
