---
name: khufu-it
description: >-
  This skill should be used when the user wants to generate integration tests, asks for "integration tests", mentions "集成测试", "khufu-it", or wants to test how multiple components work together. Supports spec-based generation (with @path to spec documents) and code-based generation (from existing implementations). Integration tests verify multiple real components interacting together, such as service + database or controller + service + repository.
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

# khufu-it: Integration Test Generator

Generate integration tests — the **middle layer** of the test pyramid. Integration tests verify that multiple real components work together correctly, testing data flow through layers, transaction boundaries, and component wiring.

## Core Principles

- **Real components**: Test with real databases, message queues, and services (not mocks)
- **Focused scope**: Test a vertical slice (service + repository + DB), not the whole system
- **Test containers**: Prefer Docker-based test containers (Testcontainers) for external dependencies
- **Data isolation**: Each test sets up its own data and cleans up after itself
- **Transaction boundaries**: Verify that writes actually persist and reads return committed data
- **TDD**: Follow Red → Green → Refactor cycle adapted for integration scope

## Workflow

### Step 1: Determine Generation Mode

**If `$ARGUMENTS` contains a file or directory path** (user provided `@path/to/specs`):
- SPEC-BASED mode: Read the spec file(s) and extract integration scenarios

**If `$ARGUMENTS` is empty**:
- Use the **AskUserQuestion** tool to let the user choose:
  1. "Spec-based: I'll provide spec documents" → ask for spec path
  2. "Code-based: Read existing code to generate integration tests"

### Step 2: Detect or Confirm Language

1. Check `khufu.yaml` for configured language.
2. If absent, auto-detect from project files.
3. Confirm with user using **AskUserQuestion**.

### Step 3: Select Integration Test Framework

Based on the language, present options using **AskUserQuestion**:

**For Java**:
- **Spring Boot Test + JUnit 5** (Recommended for Spring): Context loading, auto-configuration, test slices (`@WebMvcTest`, `@DataJpaTest`).
- **Testcontainers + JUnit 5** (Recommended): Docker-based real database/message queue testing. Works with any framework.
- **Arquillian**: Deploy to real application server environments (Java EE/Jakarta EE).

**For Python**:
- **pytest + testcontainers-python** (Recommended): Docker-based test containers.
- **pytest-django**: Django-specific fixtures and test client.
- **pytest-flask**: Flask application testing with test client.

**For TypeScript/JavaScript**:
- **Jest + Supertest** (Recommended): HTTP integration testing for Express/Koa/Fastify apps.
- **Vitest + testcontainers**: Docker-based testing with Vitest.

**For Go**:
- **testing + dockertest** (Recommended): Docker-based test containers for Go.
- **testing + httptest**: Built-in HTTP test server for handler testing.

**For C#**:
- **xUnit + Testcontainers** (Recommended): Docker-based test containers for .NET.
- **xUnit + WebApplicationFactory**: ASP.NET Core integration testing with in-memory test server.

### Step 4: Determine Test Directory

Integration tests typically go in a separate source set or directory:

| Language | Integration Test Location |
|----------|--------------------------|
| Java (Maven) | `src/test/java/<package>/` with `@Tag("integration")` or separate module |
| Java (Gradle) | `src/integrationTest/java/` (separate source set) |
| Python | `tests/integration/` or `integration_tests/` |
| TypeScript/JS | `__tests__/integration/` or `tests/integration/` |
| Go | `integration/` directory with `//go:build integration` tag |
| C# | Separate test project: `<Project>.IntegrationTests/` |

Check `khufu.yaml` for custom directory overrides.

### Step 5: Generate Integration Tests

#### SPEC-BASED Generation:

1. Read spec documents at the given path.
2. Extract integration-level scenarios — look for:
   - Multi-step workflows: "When a user registers, their profile should be created in the database"
   - Data persistence: "After saving, the record should be retrievable by ID"
   - Service orchestration: "When order is placed, inventory should be updated and notification sent"
   - Transactional boundaries: "If payment fails, the order should not be created"
3. For each scenario, generate an integration test that:
   - Sets up the full component chain (no mocks for internal components)
   - Uses real or test-container-backed databases
   - Verifies side effects across components (DB state, messages published, etc.)
   - Cleans up test data in teardown

#### CODE-BASED Generation:

1. **Discover the architecture**: Use **Glob** to find:
   - Service/use-case classes (look for `*Service.java`, `*UseCase.ts`, `*_service.py`, etc.)
   - Repository/DAO classes (`*Repository.java`, `*DAO.java`, `*Repo.ts`, etc.)
   - Controller/handler classes (`*Controller.java`, `*Handler.ts`, `*_controller.py`, etc.)
2. **Identify vertical slices**: Group services with their repositories and controllers.
3. **Read each component**: Use **Read** to understand:
   - How components are wired together (dependency injection structure)
   - Database schema / ORM entity relationships
   - Transaction boundaries (annotations like `@Transactional`, middleware, etc.)
   - External service calls (message queues, caches, third-party APIs)
4. For each vertical slice, generate integration tests covering:
   - **Happy path**: Full flow from controller/router → service → repository → database → response
   - **Data persistence**: Verify CRUD operations actually persist and can be retrieved
   - **Transaction rollback**: When an error occurs mid-operation, verify partial changes are rolled back
   - **Concurrent access**: (if applicable) Multiple simultaneous operations on the same data
   - **Schema validation**: Verify entity mappings match the database schema
   - **Cascade operations**: Parent-child entity operations propagate correctly
5. For external dependencies that are impractical to run in tests (third-party payment gateways, external APIs):
   - Use test doubles or WireMock/Mountebank for HTTP APIs
   - Use embedded or test-container versions for databases and message queues

### Step 6: Setup Test Infrastructure

For each generated test, include setup instructions as comments:
- Required Docker containers (database, message queue)
- Database migration/fixture setup
- Environment variables needed
- Seed data scripts

### Step 7: Configure Code Coverage for Integration Tests

Integration tests benefit from coverage measurement, though with lower thresholds than unit tests (they test fewer lines but more critical paths).

1. **Check `khufu.yaml`**: Read `coverage.it` for the configured coverage tool and thresholds.

2. **Configure coverage for integration tests**. The tools are the same as unit tests, but configured for the integration test source set:

| Language | Coverage Tool | Integration Test Run Command |
|----------|-------------|------------------------------|
| Java | JaCoCo | `mvn verify jacoco:report -P integration-test` |
| Python | pytest-cov | `pytest tests/integration/ --cov=. --cov-report=html` |
| TypeScript/JS (Jest) | Istanbul | `jest --config jest.integration.config.js --coverage` |
| Go | go test -cover | `go test -coverprofile=coverage.out -tags=integration ./...` |
| C# | coverlet | `dotnet test --filter Category=Integration /p:CollectCoverage=true` |

3. **Set appropriate thresholds** for integration tests:
   - Integration tests: 60% line coverage, 50% branch coverage
   - These are lower than UT thresholds because integration tests exercise broader paths

4. **Configure separate coverage reports** so integration test coverage can be distinguished from unit test coverage:
   - Output to `coverage/integration/` directory
   - Use separate report file names (e.g., `coverage-it.lcov` vs `coverage-ut.lcov`)

5. **When merging coverage reports**: If the user wants combined UT + IT coverage, configure the tool to merge reports (e.g., JaCoCo aggregate, Istanbul merge, `coverage combine`).

### Step 8: Write Tests to Files

1. Use **Write** to create each test file in the integration test directory.
2. Include test class annotations/tags for integration test categorization.
3. Add setup/teardown methods for database fixtures.
4. Use the test container pattern for external services.
5. Add a comment indicating generated by khufu-it.

### Step 9: Report Summary

Report:
- Number of integration test files created
- Number of vertical slices covered
- External dependencies configured (databases, queues, etc.)
- Test data setup included
- Coverage tool configured and coverage run command
- Coverage thresholds set (default: 60% line, 50% branch for IT)
- Suggested next steps: start Docker containers, run migrations, execute tests with coverage
- External dependencies configured (databases, queues, etc.)
- Test data setup included
- Suggested next steps: start Docker containers, run migrations, execute tests

## Integration Test Patterns

### Database Integration
```java
// Java + Spring Boot + Testcontainers
@SpringBootTest
@Testcontainers
class UserRepositoryIT {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private UserRepository repository;

    @Test
    void shouldPersistAndRetrieveUser() { /* ... */ }
}
```

### HTTP Service Integration
```python
# Python + pytest + testcontainers
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="module")
def postgres():
    with PostgresContainer("postgres:16") as pg:
        yield pg

def test_create_and_get_user(client, postgres):
    # Full flow: HTTP request → service → repository → DB → response
    pass
```

## Best Practices

- Each integration test should own its data (create in setup, clean in teardown)
- Use test containers over embedded databases (closer to production)
- Tag/categorize integration tests so they can be run separately from unit tests
- Keep integration tests focused on ONE vertical slice per test
- Avoid testing business logic in integration tests — that belongs in unit tests
- Test the wiring, not the logic
