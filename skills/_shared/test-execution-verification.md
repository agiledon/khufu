# Test Execution Verification

Shared module for verifying that generated tests can actually **run**. This is distinct from compilation — a test can compile but fail to execute due to runtime configuration, missing runners, or environment issues.

## Core Principle

> **"Runnable" ≠ "Passing".** The goal is to verify the test infrastructure is correctly configured so tests can execute. Test failures (assertion errors) are expected and acceptable — they mean the test is doing its job. Runtime errors (framework fails to start, runner crashes) are NOT acceptable and indicate a configuration problem.

## When to Run

**After** `_shared/compilation-verification.md` Phase 1 passes (tests compile successfully).

## Workflow

### Step 1: Determine Test Run Command

Based on language, framework, and layer:

| Language | Framework | Run Single Test File | Run All Tests in Dir |
|----------|-----------|---------------------|---------------------|
| Java | JUnit 5 (Maven) | `mvn test -Dtest=<TestClass> -q` | `mvn test -q` |
| Java | JUnit 5 (Gradle) | `./gradlew test --tests "*<TestClass>" -q` | `./gradlew test -q` |
| TypeScript | Jest | `npx jest <test-file> --no-coverage` | `npx jest --no-coverage` |
| TypeScript | Vitest | `npx vitest run <test-file>` | `npx vitest run` |
| JavaScript | Jest | `npx jest <test-file> --no-coverage` | `npx jest --no-coverage` |
| Python | pytest | `python -m pytest <test-file> -v` | `python -m pytest <test-dir>/ -v` |
| Go | testing | `go test <package>/ -v -run <TestName>` | `go test ./... -v` |
| C# | xUnit | `dotnet test --filter <TestClassName>` | `dotnet test` |

For **API tests**: the application server must be running (or started by the test framework).
For **E2E tests**: the full application must be running; browser drivers must be installed.

### Step 2: Check Runtime Prerequisites

Before running tests, verify environment prerequisites:

#### 2.1 Test Runner Available

| Language | Check Command | If Missing |
|----------|--------------|------------|
| Java | `mvn --version` or `./gradlew --version` | Install Maven/Gradle |
| TypeScript/JS | `npx jest --version` or `npx vitest --version` | `npm install --save-dev jest` (or vitest) |
| Python | `python -m pytest --version` | `pip install pytest` |
| Go | `go version` | Install Go |
| C# | `dotnet --version` | Install .NET SDK |

#### 2.2 Test Framework Configuration

Check for required config files:

| Framework | Config File | If Missing |
|-----------|------------|------------|
| Jest | `jest.config.ts` / `jest.config.js` / `package.json`("jest") | Generate a minimal jest config |
| Vitest | `vitest.config.ts` / `vitest.config.js` | Generate a minimal vitest config |
| pytest | `pytest.ini` / `pyproject.toml` / `setup.cfg` | pytest works without config (use defaults) |
| JUnit 5 | (no config needed) | — |
| xUnit | (no config needed) | — |
| Go testing | (no config needed) | — |

#### 2.3 Layer-Specific Prerequisites

**IT (Integration Tests):**
- Database available? → Check connection or suggest H2 as lightweight alternative
- Docker available? (if using Testcontainers) → `docker --version`
- Migration scripts? → Check for Flyway/Liquibase/Alembic migration files

**API Tests:**
- Application entry point identified? → Check for `app.ts`, `main.py`, `Application.java`
- Port configuration? → Check `application.yml`, `.env`, or default ports
- Auth credentials? → Check for test credentials in config

**E2E Tests:**
- Browser installed? → `npx playwright install chromium` or `npx cypress install`
- App start command? → Check `package.json` scripts, `docker-compose.yml`
- Base URL configured? → Check `playwright.config.ts` `baseURL` or env vars

### Step 3: Execute Tests

#### 3.1 Dry-Run Execution (Smoke Test)

Run a single, simple generated test first as a smoke test:

```
Run: <run-single-test command for the simplest generated test>

Expected outcomes:
  ✅ Test runs and PASSES → Framework is correctly configured
  ✅ Test runs and FAILS with assertion error → Framework works; test logic may need review
  ❌ Test fails with RUNTIME ERROR → Framework/config issue (diagnose below)
  ❌ Test runner CRASHES → Environment issue (diagnose below)
```

**If the dry-run test cannot even start**, diagnose the runtime error immediately before running more tests.

#### 3.2 Run All Generated Tests

If the dry-run passes, run all generated tests:

```
Run: <run-all-tests command for the test directory>

Capture: stdout, stderr, exit code
```

### Step 4: Diagnose Runtime Failures

Categorize runtime failures by root cause:

#### Category A: Test Framework Configuration

```
Symptoms:
  - "No tests found" (but test files exist)
  - "Test framework not configured"
  - "Cannot find test files" (but they compile)

Diagnosis & Fix:
  1. Check test file naming convention:
     - Java: *Test.java or *Tests.java
     - Python: test_*.py or *_test.py
     - TypeScript/JS: *.test.ts or *.spec.ts
     - Go: *_test.go
     - C#: *Tests.cs
  
  2. Check test directory matches framework configuration:
     - Jest: testMatch patterns in jest.config
     - Vitest: include patterns in vitest.config
     - pytest: testpaths in pytest.ini
     - Maven Surefire: includes/excludes patterns
  
  3. Check test framework version compatibility with language version

  Action: Fix naming, config, or version. Re-run.
```

#### Category B: Missing Runtime Dependencies

```
Symptoms:
  - "ClassNotFoundException" for test framework classes
  - "Cannot find module" for test utilities
  - "ImportError" for test libraries
  - Runner JARs missing

Diagnosis & Fix:
  1. Check build file for test dependencies with correct scope:
     - Maven: <scope>test</scope>
     - Gradle: testImplementation / testRuntimeOnly
     - npm: devDependencies (not dependencies)
     - pip: pytest and plugins in requirements-dev.txt
  
  2. Verify dependency resolution: re-run install/resolve

  Action: Add missing deps, re-install, re-run.
```

#### Category C: Application Startup Failure (API/E2E)

```
Symptoms:
  - "Connection refused" on API tests
  - "Page not found" / "Navigation failed" on E2E tests
  - Application fails to start

Diagnosis & Fix:
  1. Check application configuration:
     - Properties files, env vars, profiles
  2. Check external service dependencies (DB, Redis, etc.):
     - Are they running? Can we use embedded alternatives?
  3. Check port conflicts:
     - Is the configured port already in use?

  Action:
  1. If docker-compose.yml exists: suggest `docker compose up -d <services>`
  2. If embedded alternatives exist (H2, embedded-redis): suggest using them for tests
  3. If port conflict: suggest changing port or stopping conflicting process
  
  Report clearly: "API/E2E tests require the application to be running. Start the app with: <command>"
```

#### Category D: Test Isolation Issues

```
Symptoms:
  - Some tests pass individually but fail when run together
  - Tests pass on one run, fail on next
  - "Unique constraint violation" on shared test data

Diagnosis & Fix:
  1. Check for shared mutable state between tests
  2. Check for hardcoded test data (IDs, emails, usernames)
  3. Check cleanup/teardown logic

  Action: Add unique data per test (UUID suffixes), add proper cleanup.
```

### Step 5: Execution Result Report

Generate a clear report distinguishing between test framework issues and test logic issues:

```markdown
## Test Execution Report

### Dry-Run Result
- Status: ✅ Passed / ❌ Failed
- Command: `<command>`
- Duration: <N>ms

### Test Execution Summary

| Category | Count | Description |
|----------|-------|-------------|
| ✅ Passed | <N> | Tests ran and assertions passed |
| ❌ Failed (assertion) | <N> | Tests ran but assertions failed — test logic needs review |
| 💥 Runtime Error | <N> | Tests could not execute — config/infra issue |
| ⏭️ Skipped | <N> | Tests not run (depends on failed prerequisite) |

### Assertion Failures (Expected / Acceptable)
These tests ran correctly but their assertions failed. This means the test code is working — the failures point to either:
  - Actual bugs in the target code (the test is doing its job)
  - Incorrect test expectations (the test should be adjusted)

<list of failed tests with failure messages>

### Runtime Errors (Needs Fixing)
These tests could not execute. This indicates a configuration or environment issue:

<for each runtime error>
  **Error:** <error message>
  **Likely Cause:** <diagnosis>
  **Suggested Fix:** <actionable steps>
```

### Step 6: Layer-Specific Execution Notes

#### UT Execution
- Tests should run in < 100ms each. If slower, note in report.
- Tests must be independent — verify random execution order works.

#### IT Execution
- Verify database is accessible (or suggest H2 embedded).
- For Testcontainers: check Docker daemon is running.
- Check that test data cleanup works (no leftover data).

#### API Execution
- Verify the application starts successfully (or suggest how to start it).
- Check that test base URL resolves.
- For auth-protected endpoints: verify test credentials exist.

#### E2E Execution
- Verify Playwright/Cypress is installed (`npx playwright install`).
- Verify browser binaries are present.
- Verify app start command and base URL configuration.
- Suggest running with `--headed` for debugging.

---

## Integration with Compilation Verification

The full quality gate sequence is:

```
Phase 0: Source Compilation  (compilation-verification.md Phase 0)
    ↓ (passes)
Generate Tests               (skill workflow Steps 1-9)
    ↓
Phase 1: Test Compilation    (compilation-verification.md Phase 1)
    ↓ (passes, possibly after auto-fixes)
Phase 2: Test Execution       (this module)
    ↓
Report                        (skill Step 10 / report-template.md)
```

If ANY phase fails in an unfixable way, report the failure clearly and do not proceed to subsequent phases. For execution specifically: assertion failures are NOT blockers (they're the test doing its job); runtime errors ARE blockers and must be diagnosed.

---

## Return

After this module completes:

- `testsRunnable`: `true` | `false` — whether tests can actually execute
- `dryRunPassed`: `true` | `false` — smoke test result
- `passed`: number of passing tests
- `failedAssertions`: number of assertion failures (acceptable)
- `runtimeErrors`: number of runtime errors (blocking)
- `executionDiagnosis`: (if runtime errors) categorized diagnosis with fix suggestions
- `prerequisitesReport`: which prerequisites were checked and their status
- `runCommand`: the exact command to run tests (for CI integration)
