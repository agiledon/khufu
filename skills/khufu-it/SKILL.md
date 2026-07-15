---
name: khufu-it
description: >-
  This skill should be used when the user wants to generate integration tests, asks for "integration tests", mentions "集成测试", "khufu-it", or wants to test how multiple components work together. Supports spec-based generation (with @path to spec documents) and code-based generation (from existing implementations). Integration tests verify multiple real components interacting together, such as service + database or controller + service + repository.
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

# khufu-it: Integration Test Generator

Generate integration tests — the **middle layer** of the test pyramid. Integration tests verify that multiple real components work together correctly, testing data flow through layers, transaction boundaries, and component wiring.

## Core Principles

- **Real components**: Test with real databases, message queues, and services (not mocks for internal components)
- **Focused scope**: Test a vertical slice (service + repository + DB), not the whole system
- **Database strategy**: Choose between lightweight H2 (fast CI) and Testcontainers (production-realistic)
- **Data isolation**: Each test sets up its own data and cleans up after itself
- **Transaction boundaries**: Verify that writes actually persist and reads return committed data
- **EDD**: Define evaluation criteria first (Read `_shared/evaluation-framework.md`)

## Workflow

### Step 1: Environment Setup (Shared)

Read the following shared modules to configure the test generation environment:

1. **Read `_shared/mode-selection.md`** — determines spec-based vs code-based generation mode. Follow its workflow exactly.
2. **Read `_shared/language-detection.md`** — detects language, build system, and reads `khufu.yaml` configuration. Follow its workflow exactly.
3. **Read `_shared/framework-selector.md`** with `layer: it` — selects the integration test framework. Note the H2 vs Testcontainers options for Java (see Step 4 for details).
4. **Read `_shared/directory-resolver.md`** with `layer: it` — determines the output directory for integration test files.

### Step 1.5: Verify Source Compilation (Pre-Generation)

**Read `_shared/compilation-verification.md` Phase 0** and follow its workflow:

1. **Determine the build command** for the detected language and build system.
2. **Run source compilation** using **Bash** to verify the target project compiles BEFORE generating tests.
3. **If compilation FAILS**:
   - Categorize the errors (missing dependencies, build config, source code errors, missing tools).
   - **Report the diagnosis to the user** with specific, actionable fix suggestions.
   - **DO NOT proceed** with test generation.
   - Exit gracefully after providing the diagnosis and fix suggestions.
4. **If compilation SUCCEEDS**: log confirmation and continue to Step 2.

### Step 2: EDD — Define Evaluation Criteria

**Read `_shared/evaluation-framework.md`** and follow its EDD workflow:

1. **Define evaluation criteria BEFORE generating tests.** For IT layer, select applicable dimensions:
   - **Correctness** (required): data persistence, component wiring correctness
   - **Robustness** (required): transaction rollback, concurrent access, constraint violations
   - **Coverage** (recommended): line ≥ 60%, branch ≥ 50%
   - **Performance** (recommended): each test < 2s (H2) / < 10s (PostgreSQL)
   - **Maintainability** (required): test independence, data isolation

2. Populate the spec file's `## Evaluation Criteria` section accordingly.

### Step 3: Dedup Checks

#### 3.0 Spec Doc Scan (Pre-Generation Dedup — Execution Records)

**Read `_shared/spec-doc-scanner.md`** and follow its workflow to scan `docs/khufu/` execution record specs:

1. **Glob for ALL IT spec docs**: `docs/khufu/it/*-it-test-cases.md` (all dates, not just today)
2. **Parse every spec doc** — extract Test Class, Test Method, Target Class, Target Method, Status from ALL rows
3. **Build a comprehensive skip list** across ALL dates of already-tested vertical slices and components
4. **Cross-reference with source code** to produce a Coverage Gap Analysis
5. Hold this skip list for merging with spec-sync results in Step 3.2

**If no spec docs exist** (first ever run): return empty skip list and proceed normally.

#### 3.1 Pyramid Dedup (Cross-Layer)

**Read `_shared/test-pyramid-strategy.md`.** Before generating IT tests:

1. **Scan for existing UT tests** — use **Glob** to find `__tests__/**/*.test.*` (or language-equivalent UT directories).
2. **For each candidate IT scenario**, check if a UT already covers the logic. IT should only add tests for:
   - DB persistence: actual INSERT/UPDATE/DELETE and read-back (UT mocks this)
   - Transaction boundaries: atomic writes, rollback on failure (UT can't test)
   - ORM/entity mappings: schema-column alignment (UT doesn't touch DB)
   - Constraint violations: unique keys, foreign keys, NOT NULL (only DB enforces)
   - Serialization/deserialization: entity ↔ DTO mapping correctness through real layers
3. **Skip scenarios** where UT already verifies the behavior and IT adds no new risk dimension.
4. Record skipped scenarios in the report.

#### 3.2 Spec Sync — Incremental Check (Cross-Run)

**Read `_shared/spec-sync.md`.** Before generating integration tests, check if previous runs have already produced tests. This prevents regenerating the same IT tests on repeated executions.

Follow the module's workflow to build a **skip list**:

1. **Check spec system status**: Read `khufu.yaml` → `spec.enabled`.

2. **If spec enabled AND spec files exist** (Phase 2):
   - Glob for `specs/**/spec.v*.md`
   - Parse each spec file for IT test cases with `status: implemented` AND `Test File:` paths
   - Filter to `IT-` prefixed cases only
   - Map `Source File:` fields or vertical slice descriptions back to components → these are already covered
   - Build the skip list

3. **If spec disabled OR no spec files exist** (Phase 3 — file-based fallback):
   - Glob for existing IT test files in the integration test directory
   - Infer covered vertical slices/components from test file names
   - Build the skip list
   - **Warn**: File-based fallback is less precise; recommend enabling spec system

4. **Feed skip list forward**: The skip list is consumed by Step 6 (generation skips already-covered components/vertical slices).

#### 3.3 Early Exit Gate — Fully Covered

**After merging skip lists**, compare against all discoverable components/vertical slices:

- **If ALL components are fully covered** → **Exit immediately**:
  ```
  ✓ All integration points are already covered by existing tests. No new tests needed.
    - <N> spec docs scanned across <M> dates
    - <X> vertical slices — all covered
    To regenerate tests, delete the relevant spec docs or test files first.
  ```

- **If gaps exist** → Continue to Step 4. Focus generation ONLY on uncovered vertical slices.

**Key rule**: An integration test that already exists and is tracked MUST NOT be regenerated.

### Step 4: Select Database Strategy (Java-Specific)

For Java projects, offer the database strategy choice using **AskUserQuestion**:

**Question**: "Choose the database strategy for integration tests:"
**Options**:
1. **"H2 In-Memory Database (Recommended for fast CI)"** — Zero Docker dependency, tests start in <5s. Suitable for SQL-standard operations. Note: differs from PostgreSQL/MySQL in functions, sequences, and locking behavior.
2. **"Testcontainers with real database (Production Recommended)"** — Docker-based real database, identical to production. Slower startup (~30s) but catches database-specific issues.

**Decision Guide:**
| Scenario | Recommendation |
|----------|---------------|
| PR validation / fast CI feedback | H2 |
| Testing PostGIS, stored procedures, DB-specific features | Testcontainers |
| Both can coexist — configure separate Gradle/Maven profiles |

If not Java, use the Testcontainers-based approach appropriate for the language.

### Step 5: Setup Test Data Strategy

**Read `_shared/test-data-factories.md`.** For IT tests, use the **Repository direct write** pattern:

1. Define shared test data factories (if not already present) at `src/testFixtures/` or `tests/factories/`.
2. In IT tests, inject data directly via Repository/ORM to set up preconditions.
3. Use transaction rollback (`@Transactional` / `transaction=True`) for cleanup — fastest and cleanest.
4. For distributed tests (parallel execution), use unique data per test (UUID-suffixed identifiers).

### Step 6: Generate Integration Tests

#### 6.0 Parallel Execution (Large Systems)

For large or complex systems, writing integration tests sequentially is time-consuming. Before generating tests, evaluate whether parallel sub-agent execution is appropriate.

**Read `_shared/parallel-execution.md`** and follow its workflow:

1. **Count target vertical slices**: If the total number of integration test files to generate is **>= 3**, parallel execution is warranted.

2. **Detect sub-agent support**: Check if the host agent supports the `Agent` tool for spawning sub-agents.

3. **If sub-agent supported AND target count >= 3**:
   - **Partition work** following `_shared/parallel-execution.md` Phase 2:
     - **Code-based**: Group vertical slices by module/domain (e.g., `users/` — UserService + UserRepository, `orders/` — OrderService + OrderRepository, `products/` — ProductService + ProductRepository).
     - **Spec-based**: Group integration scenarios by feature/domain.
   - **Ensure independence**: Partitions must not share database tables that would conflict during parallel test execution. If two modules write to the same table, merge their partitions or assign unique data prefixes.
   - **Launch parallel sub-agents** in a single message (all concurrent), each receiving a self-contained prompt with:
     - Assigned vertical slices or spec scenarios
     - Language, framework, and mocking library (from Step 1.2 and Step 1.3)
     - Test directory (from Step 1.4)
     - Evaluation criteria (from Step 2)
     - Pyramid dedup results — scenarios to skip (from Step 3)
     - Database strategy — H2 or Testcontainers (from Step 4)
     - Test data factory paths (from Step 5)
     - Annotation format (from the skill's annotation guidelines)
     - Instructions to read components, generate tests per Steps 6.1-6.2 guidelines, configure DB, and write test files
   - **Collect results**: After all sub-agents complete, merge their summaries.
   - **Handle failures**: If any sub-agent fails, generate remaining tests for that partition sequentially.
   - **Skip Steps 6.1-6.2**. Proceed to Step 7.

4. **If sub-agent NOT supported**: Fall through to Steps 6.1-6.2 for sequential generation.

5. **If target count < 3**: Skip parallel execution. Fall through to Steps 6.1-6.2.

#### 6.1 SPEC-BASED Generation:

1. Read spec documents at the given path.
2. Extract integration-level scenarios — look for:
   - Multi-step workflows: "When a user registers, their profile should be created in the database"
   - Data persistence: "After saving, the record should be retrievable by ID"
   - Service orchestration: "When order is placed, inventory should be updated and notification sent"
   - Transactional boundaries: "If payment fails, the order should not be created"
3. For each scenario with `status: planned`, generate an integration test that:
   - Sets up the full component chain (no mocks for internal components)
   - Uses the selected database strategy (H2 or Testcontainers)
   - Verifies side effects across components (DB state, messages published, etc.)
   - Cleans up test data in teardown
   - Includes spec reference: `// Spec: IT-<ENTITY>-<NNN> | Evaluates: <dimension>`

#### 6.2 CODE-BASED Generation:

1. **Discover the architecture**: Use **Glob** to find:
   - Service/use-case classes (`*Service.java`, `*UseCase.ts`, `*_service.py`)
   - Repository/DAO classes (`*Repository.java`, `*DAO.java`, `*Repo.ts`)
   - Controller/handler classes (`*Controller.java`, `*Handler.ts`)
2. **Identify vertical slices**: Group services with their repositories and controllers.
3. **Read each component**: Use **Read** to understand wiring, schema, transactions, and external calls.
4. For each vertical slice, after checking pyramid dedup (Step 3), generate tests covering:
   - **Happy path**: Full flow from controller/router → service → repository → database → response
   - **Data persistence**: Verify CRUD operations actually persist and can be retrieved
   - **Transaction rollback**: When an error occurs mid-operation, verify partial changes are rolled back
   - **Concurrent access**: (if applicable) Multiple simultaneous operations on the same data
   - **Schema validation**: Verify entity mappings match the database schema
   - **Cascade operations**: Parent-child entity operations propagate correctly
5. For external dependencies impractical to run in tests (payment gateways, external APIs):
   - Use WireMock/Mountebank for HTTP APIs
   - Use embedded or test-container versions for databases and message queues

### Step 7: Write Tests with Database Configuration

For each test file, include the database configuration as code:

**Java + Spring Boot + H2:**
```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@DataJpaTest
@Tag("integration")
// Spec: specs/UserRegistration/spec.v1.md
class UserRepositoryIT {
    @Autowired private UserRepository repository;
    @Autowired private TestEntityManager em;

    @Test
    @DisplayName("IT-USER-001: shouldPersistUserToDatabase")
    // Evaluates: Robustness — 数据实际持久化
    void shouldPersistUserToDatabase() {
        User user = UserTestData.aDefaultUser().build();
        User saved = repository.save(user);
        em.flush();
        em.clear();
        User found = em.find(User.class, saved.getId());
        assertEquals(user.getName(), found.getName());
    }
}
```

**Java + Spring Boot + Testcontainers:**
```java
@SpringBootTest
@Testcontainers
@Tag("integration")
class UserRepositoryIT {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    // ... tests
}
```

**Python + pytest:**
```python
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="module")
def postgres():
    with PostgresContainer("postgres:16") as pg:
        yield pg

# Spec: specs/UserRegistration/spec.v1.md
# Spec ID: IT-USER-001
# Evaluates: Robustness — 数据实际持久化
def test_create_and_get_user(client, postgres):
    pass
```

### Step 8: Configure Code Coverage

**Read `_shared/coverage-config.md`** with `layer: it`. Follow its workflow:
1. Check `khufu.yaml` coverage.it settings
2. Configure separate coverage reports from UT (e.g., `coverage-it/` directory, separate report files)
3. Set thresholds (default: 60% line, 50% branch for IT)
4. If user wants combined UT + IT coverage, configure report merging

### Step 9: Generate Spec File

Same process as UT — see `_shared/evaluation-framework.md`. Mark generated IT test cases in the spec file with `status: implemented`.

### Step 10: Verify Test Compilation & Execution

#### 10-A: Verify Test Compilation

**Read `_shared/compilation-verification.md` Phase 1** and follow its workflow:

1. **Run the test compilation command** for the language and framework.
2. **If test compilation FAILS**: categorize, auto-fix (up to 3 retries), or report unfixable errors.
3. **Note for IT**: Integration tests may need additional build configuration (test source sets, H2 dependency, Testcontainers dependency). If compilation fails due to missing IT-specific deps, add them to the build file automatically and recompile.

#### 10-B: Verify Test Execution

**Read `_shared/test-execution-verification.md`** and follow its workflow:

1. **Check IT-specific prerequisites**:
   - Database connectivity (or suggest H2 embedded for fast CI).
   - Docker daemon (if using Testcontainers — `docker --version`).
   - Migration/DDL scripts present and runnable.
2. **Run a dry-run smoke test** — a single simple persistence test.
3. **If runtime error**: diagnose (DB connection? Docker not running? migration not applied?) and report fix.
4. **Run all generated IT tests** and categorize results (passed / failed assertion / runtime error).
5. **Report execution summary** with distinction between assertion failures (acceptable) and runtime errors (blocking).

### Step 11: Generate Spec Documentation (SDD)

**Read `_shared/spec-doc-generator.md`** and follow its workflow to produce the execution record spec document.

**MANDATORY — Before any file operations**, ensure the base directory and current layer's subdirectory exist:

```bash
mkdir -p docs/khufu/it
```

> Only create the `it/` subdirectory — do NOT create subdirectories for other test types (ut/, api/, e2e/). Other types will create their own when they run.

1. **Collect data** from Steps 9 (test execution) and 10 (coverage):
   - Module/component inventory and test files generated
   - Test execution results: pass/fail/skip per component
   - Coverage data: overall line/branch coverage
   - Framework info: test framework + version, coverage tool + version
   - Test case details grouped by component: Test Class, Target Class, Target Method(s), Status

2. **Determine the spec doc path**:
   - Read `khufu.yaml` → `spec.docsDirectory` (default: `docs/khufu/`)
   - Path: `docs/khufu/it/<YYYY-MM-DD>-it-test-cases.md`

3. **Build the spec doc** following the template in `_shared/spec-doc-generator.md`:
   - Metadata block, Summary, Module Summary, Test Cases by component, Coverage Statistics, Known Issues

4. **Check for existing spec doc** (same date + same layer):
   - **If exists**: Read → increment `**Version**` → **APPEND** within each component's subsection
   - **If not exists**: Create with `**Version**: 1`

5. **Write the spec doc** and **update the wizard file** `docs/khufu/test-cases.md`.

### Step 12: Report Summary

**Read `_shared/report-template.md`** and generate a report using the IT-specific sections:
- Summary table with skipped-by-pyramid count
- Database strategy used (H2 / Testcontainers)
- External dependencies configured
- Coverage configuration
- Evaluation Results (if EDD enabled)
- Files created
- Next steps: start Docker containers (if Testcontainers), run migrations, execute tests

### C++ / Google Test + testcontainers-c
```cpp
#include <gtest/gtest.h>
#include <testcontainers/testcontainers.h>

// Spec: specs/UserRegistration/spec.v1.md
// Spec ID: IT-USER-001
// Evaluates: Robustness — 数据实际持久化
class UserRepositoryIT : public ::testing::Test {
protected:
    void SetUp() override {
        // Start PostgreSQL testcontainer
        postgres_ = testcontainers::PostgresContainer("postgres:16");
        postgres_.start();

        // Connect and create tables
        db_ = connectToDb(postgres_.getJdbcUrl(),
                          postgres_.getUsername(),
                          postgres_.getPassword());
        runMigrations(db_);
    }

    void TearDown() override {
        postgres_.stop();
    }

    testcontainers::PostgresContainer postgres_;
    Database db_;
};

TEST_F(UserRepositoryIT, ShouldPersistUserToDatabase) {
    User user{0, "test@example.com"};
    repository_.save(user);

    auto found = repository_.findById(user.getId());
    ASSERT_TRUE(found.has_value());
    EXPECT_EQ(found->getEmail(), "test@example.com");
}
```

## Integration Test Patterns

### H2 Lightweight (Java + Spring Boot)
```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@DataJpaTest
@Tag("integration")
class UserRepositoryIT {
    @Autowired private UserRepository repository;
    @Autowired private TestEntityManager em;

    @Test
    void shouldPersistAndRetrieveUser() {
        User user = UserTestData.aDefaultUser().build();
        User saved = repository.save(user);
        em.flush();
        em.clear();
        User found = em.find(User.class, saved.getId());
        assertNotNull(found);
        assertEquals(user.getEmail(), found.getEmail());
    }
}
```

### Testcontainers (Java + Spring Boot)
```java
@SpringBootTest
@Testcontainers
@Tag("integration")
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

## Best Practices

- Each integration test should own its data (create in setup, clean in teardown)
- **H2 for fast CI, Testcontainers for production confidence** — use both profiles
- Tag/categorize integration tests so they can be run separately from unit tests
- Keep integration tests focused on ONE vertical slice per test
- Avoid testing business logic in integration tests — that belongs in unit tests
- Test the wiring, not the logic
- Read `_shared/test-data-factories.md` for shared data setup patterns
