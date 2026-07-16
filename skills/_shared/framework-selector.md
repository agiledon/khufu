# Test Framework Selector

Shared module for selecting the appropriate test framework based on language and test layer.

## Usage

The caller must provide the current **test layer**: `ut`, `it`, `api`, or `e2e`.

## Workflow

### 1. Check khufu.yaml

If `khufu.yaml` has `frameworks.<layer>` configured (e.g., `frameworks.ut: jest`), use that framework directly. Skip to confirmation.

### 2. Present Framework Options by Language and Layer

Use **AskUserQuestion** to let the user choose. Present the most relevant options first, with "(Recommended)" for the top choice.

---

### Unit Test Frameworks (layer: ut)

**Java:**
- **JUnit 5** (Recommended): Modern framework with parameterized tests, dynamic tests, extension model. Use for all new projects.
- **JUnit 4**: Legacy but widely used. Supported by many tools but lacks modern features.
- **TestNG**: Advanced test configuration with grouping, parallel execution, data providers.

**Python:**
- **pytest** (Recommended): Modern, idiomatic Python testing with fixtures, parameterization, rich plugins.
- **unittest**: Standard library. No dependencies but less expressive.

**TypeScript/JavaScript:**
- **Jest** (Recommended): Popular with snapshot testing, built-in mocking, code coverage. Use ts-jest for TypeScript.
- **Vitest** (Recommended): Fast, Vite-native, Jest-compatible API, native TypeScript support.

**Go:**
- **testing + testify** (Recommended): Standard library with testify for assertions and mocking.
- **testing (stdlib)**: No external dependencies, pure standard library.

**C++:**
- **Google Test** (Recommended): Google's C++ testing and mocking framework. Widely adopted, feature-rich with test discovery, fixtures, and death tests. Use gmock for mocking.
- **Catch2** (Alternative): Modern, header-only test framework with expressive assertion macros and BDD-style sections.
- **doctest** (Alternative): Fastest C++ testing framework with low compile-time overhead. Single-header.
- **Qt Test** (Alternative for Qt projects): Qt's built-in testing module. Integrates with signal/slot mechanism and event loop.

**C#:**
- **xUnit** (Recommended): Modern .NET framework with excellent extensibility.
- **NUnit**: Mature with rich assertion model.
- **MSTest**: Microsoft official, good VS integration.

**Rust:**
- **cargo test** (Built-in): The standard Rust test framework. Always use this.

---

### Integration Test Frameworks (layer: it)

**Java:**
- **Spring Boot Test + JUnit 5** (Recommended for Spring): Context loading, auto-configuration, test slices (`@WebMvcTest`, `@DataJpaTest`).
- **Testcontainers + JUnit 5** (Production Recommended): Docker-based real database/message queue testing.
- **H2 + JUnit 5** (Lightweight): In-memory database, zero Docker dependency, ideal for fast CI feedback. Suitable for SQL-standard scenarios. Note: differs from PostgreSQL/MySQL in functions, sequences, and locking behavior — not suitable for testing database-specific features.

**Python:**
- **pytest + testcontainers-python** (Recommended): Docker-based test containers.
- **pytest-django**: Django-specific fixtures and test client.
- **pytest-flask**: Flask application testing with test client.

**TypeScript/JavaScript:**
- **Jest + Supertest** (Recommended): HTTP integration testing for Express/Koa/Fastify apps.
- **Vitest + testcontainers**: Docker-based testing with Vitest.

**Go:**
- **testing + dockertest** (Recommended): Docker-based test containers for Go.
- **testing + httptest**: Built-in HTTP test server for handler testing.

**C++:**
- **Google Test + testcontainers-c** (Recommended): Google Test with Docker-based service containers for database and external service testing.
- **Google Test + Boost.Beast** (Alternative): HTTP client/server integration testing using Boost.Beast.

**C#:**
- **xUnit + Testcontainers** (Recommended): Docker-based test containers for .NET.
- **xUnit + WebApplicationFactory**: ASP.NET Core integration testing with in-memory test server.

---

### API Test Frameworks (layer: api)

**Java:**
- **REST Assured** (Recommended): Fluent Java DSL for REST API testing. Given/When/Then syntax.
- **Spring MockMvc** (Recommended for Spring): Server-side testing without deployment.
- **Pact JVM**: Consumer-driven contract testing between services.

**Python:**
- **pytest + httpx** (Recommended): Modern async HTTP client for testing REST APIs.
- **pytest + requests**: Classic approach with the popular requests library.
- **schemathesis**: Property-based API testing from OpenAPI schemas.

**TypeScript/JavaScript:**
- **Supertest** (Recommended): HTTP assertion library for Express/Koa/Fastify APIs.
- **Pact JS**: Consumer-driven contract testing.

**Go:**
- **testing + httptest** (Recommended): Standard library HTTP test server.
- **go-resty + testing**: Fluent HTTP client for API testing.

**C++:**
- **Language-agnostic (pytest + httpx)** (Recommended): Use Python's pytest + httpx for API testing of C++ backends. Language-agnostic — test HTTP endpoints regardless of backend implementation language. Richer ecosystem for API testing.
- **Language-agnostic (Supertest)** (Alternative): Use Node.js Supertest for API testing. Great for teams using JS/TS tooling.
- **Google Test + cpp-httplib** (Alternative, C++ native): For teams that prefer staying in C++ across all layers.

**C#:**
- **RestSharp + xUnit** (Recommended): Popular REST client with xUnit integration.
- **xUnit + WebApplicationFactory**: ASP.NET Core in-memory test server.

---

### E2E Test Frameworks (layer: e2e)

**Universal** (work with any language/frontend):
- **Playwright** (Recommended): Modern cross-browser automation with auto-wait, trace viewer, API mocking. Supports Java, Python, .NET, and JS/TS.

**TypeScript/JavaScript ecosystem:**
- **Playwright (JS/TS)** (Recommended)
- **Cypress**: Developer-friendly with time-travel debugging and real-time reloads. JavaScript/TypeScript only.

**Java ecosystem:**
- **Playwright (Java)** or **Selenium (Java)**

**Python ecosystem:**
- **Playwright (Python)** or **Selenium (Python)**

**C++ ecosystem:**
- **Playwright (external)** (Recommended for web frontends): E2E testing in a separate project.
- **Qt Test** (Alternative for Qt desktop apps): Qt's built-in GUI testing with widget interaction simulation.

---

### Coverage Tools

For most languages, a single standard coverage tool is used (JaCoCo for Java, pytest-cov for Python, Istanbul for TypeScript, etc.).

**C++ coverage tools — OS-dependent, user must choose:**

When the detected language is C++, use **AskUserQuestion** to present the options based on the user's OS:

**Question**: "Select C++ coverage tool based on your operating system and toolchain:"

| Option | OS | Toolchain | Best For |
|--------|----|-----------|----------|
| **gcov + lcov** (Recommended for Linux) | Linux | GCC | Standard Linux CI/CD; generates LCOV/HTML/Cobertura |
| **gcovr** | Linux / Windows | GCC / MinGW | Cross-platform GCC projects; better formatting than lcov |
| **OpenCppCoverage** (Recommended for Windows) | Windows | MSVC | Native Windows CI/CD; no GCC dependency |
| **llvm-cov + llvm-profdata** | Linux / macOS / Windows | Clang | Projects using Clang compiler; cross-platform |

**Decision Guide:**
| OS | Compiler | Recommended Tool |
|----|---------|-----------------|
| Linux | GCC | gcov + lcov |
| Linux | Clang | llvm-cov + llvm-profdata |
| Windows | MSVC | OpenCppCoverage |
| Windows | MinGW/GCC | gcovr |
| macOS | Clang (default) | llvm-cov + llvm-profdata |
| macOS | GCC | gcovr |

---

### 3. Confirm Selection

After the user selects a framework, confirm and store the selection.

### 4. Return

After this module completes, the caller should have:
- `framework`: the selected framework name and version
- `mockingFramework`: the appropriate mocking library for the language+framework combination:
  - Java: Mockito (`org.mockito:mockito-core` for JUnit 5, `mockito-junit-jupiter` for integration)
  - Python: `unittest.mock` (stdlib) or `pytest-mock`
  - TypeScript/JS: Jest built-in mocks or Vitest `vi.fn()`
  - Go: testify mocks or manual interface mocks
  - C#: Moq or NSubstitute
