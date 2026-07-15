---
name: khufu-e2e
description: >-
  This skill should be used when the user wants to generate end-to-end tests, asks for "E2E tests", mentions "端到端测试", "khufu-e2e", "browser tests", "UI tests", or wants to test complete user journeys through the entire system. Supports spec-based generation (with @path to user story or workflow documents) and code-based generation (from existing application routes and pages). E2E tests are the tip of the test pyramid — fewest in number, slowest, but cover the most critical business flows.
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

# khufu-e2e: End-to-End Test Generator

Generate end-to-end tests — the **tip** of the test pyramid. E2E tests simulate real user journeys through the complete system, including the browser/frontend, backend services, and databases. They are the slowest and most brittle tests, so write only for the most critical business flows.

## Core Principles

- **Real user journeys**: Test complete workflows that real users perform
- **Full system**: All services running, real browser (or headless), real database
- **Few and focused**: Only test critical paths — login, checkout, core workflows
- **User perspective**: Test what the user sees and does, not internal state
- **Smoke tests**: A small set of E2E tests can serve as production smoke tests
- **Clean state**: Each test should start from a known, clean system state
- **EDD**: Define evaluation criteria first, especially User Journey and Correctness dimensions

## Workflow

### Step 1: Environment Setup (Shared)

Read the following shared modules to configure the test generation environment:

1. **Read `_shared/mode-selection.md`** — determines spec-based vs code-based generation mode. For E2E, spec-based mode reads user story documents, BDD feature files, or workflow descriptions.
2. **Read `_shared/language-detection.md`** — detects language AND frontend framework (React, Vue, Angular, etc.).
3. **Read `_shared/framework-selector.md`** with `layer: e2e` — selects Playwright (Recommended), Cypress, or Selenium.
4. **Read `_shared/directory-resolver.md`** with `layer: e2e` — determines the output directory.

### Step 1.5: Verify Source Compilation (Pre-Generation)

**Read `_shared/compilation-verification.md` Phase 0** and follow its workflow:

1. **Determine the build command** for the detected language and frontend framework.
2. **Run compilation** (frontend + backend if applicable) to verify the project builds.
3. **If compilation FAILS**: categorize errors, report diagnosis with fix suggestions. **DO NOT proceed** with test generation.
4. **If compilation SUCCEEDS**: log confirmation and continue to Step 2.

### Step 2: EDD — Define Evaluation Criteria

**Read `_shared/evaluation-framework.md`** and follow its EDD workflow:

1. For E2E layer, select applicable dimensions:
   - **Correctness** (required): critical user journey outcomes, observable results
   - **User Journey** (required): P0/P1 path coverage, multi-page flow completeness
   - **Maintainability** (required): Page Object pattern usage, stable selectors (`data-testid`)
   - **Performance** (optional): page load time budgets, navigation timing

2. Populate the spec file's `## Evaluation Criteria` section.

### Step 3: Dedup Checks

#### 3.0 Spec Doc Scan (Pre-Generation Dedup — Execution Records)

**Read `_shared/spec-doc-scanner.md`** and follow its workflow to scan `docs/khufu/` execution record specs:

1. **Glob for ALL E2E spec docs**: `docs/khufu/e2e/*-e2e-test-cases.md` (all dates, not just today)
2. **Parse every spec doc** — extract user journey (Target Class) + page flow (Target Method) + Status from ALL rows
3. **Build a comprehensive skip list** across ALL dates of already-tested user journeys
4. **Cross-reference with discovered user journeys** to produce a Coverage Gap Analysis
5. Hold this skip list for merging with spec-sync results in Step 3.2

**If no spec docs exist** (first ever run): return empty skip list and proceed normally.

#### 3.1 Pyramid Dedup (Cross-Layer)

**Read `_shared/test-pyramid-strategy.md`.** Before generating E2E tests:

1. **Scan for existing UT, IT, and API tests** — use **Glob** to find lower-layer tests.
2. **For each candidate E2E user journey**, check:
   - Does UT/IT/API already verify individual steps within this journey?
   - What NEW risk does E2E add? → cross-page state, browser rendering, visual feedback, network failures during navigation, real user interaction (clicks, keyboard, form fill).
   - E2E tests the "story" — the integration of ALL layers from the user's eyes. It doesn't re-verify what lower layers already check.
3. **Skip** user journeys that are purely single-step operations already well-covered by API tests.
4. **Keep** user journeys that span multiple pages or involve browser-specific interactions.

#### 3.2 Spec Sync — Incremental Check (Cross-Run)

**Read `_shared/spec-sync.md`.** Before generating E2E tests, check if previous runs have already produced tests. This prevents regenerating the same E2E tests on repeated executions.

Follow the module's workflow to build a **skip list**:

1. **Check spec system status**: Read `khufu.yaml` → `spec.enabled`.

2. **If spec enabled AND spec files exist** (Phase 2):
   - Glob for `specs/**/spec.v*.md`
   - Parse each spec file for E2E test cases with `status: implemented` AND `Test File:` paths
   - Filter to `E2E-` prefixed cases only
   - Map user journey names back to page flows → these are already covered
   - Build the skip list

3. **If spec disabled OR no spec files exist** (Phase 3 — file-based fallback):
   - Glob for existing E2E test files (e.g., `e2e/**/*.spec.ts`)
   - Extract user journey names from test file names or `test.describe` blocks
   - Build the skip list
   - **Warn**: File-based fallback is less precise; recommend enabling spec system

4. **Feed skip list forward**: The merged skip list is consumed by Step 6.

#### 3.3 Early Exit Gate — Fully Covered

**After merging skip lists**, compare against all critical user journeys:

- **If ALL P0/P1 user journeys are fully covered** → **Exit immediately**:
  ```
  ✓ All critical user journeys are already covered by existing E2E tests. No new tests needed.
    - <N> spec docs scanned across <M> dates
    - <X> user journeys — all covered
    To regenerate tests, delete the relevant spec docs or test files first.
  ```

- **If gaps exist** → Continue to Step 4. Focus generation ONLY on uncovered user journeys.

**Key rule**: An E2E test that already exists and is tracked MUST NOT be regenerated.

### Step 4: Identify Critical Flows

When identifying which flows to test (both spec-based and code-based), prioritize:

1. **Authentication** (highest priority): login, logout, session expiry
2. **Core business transactions**: the 1-2 things your app exists to do
3. **Data entry workflows**: forms that users spend significant time on
4. **Search and navigation**: how users find and access content
5. **Error recovery**: what happens when things go wrong

Skip:
- Edge case UI states (belongs in component/unit tests)
- Visual regression (use separate visual testing tools)
- Exhaustive form validation (belongs in unit tests for validation logic)
- Non-critical admin pages (unless that's the core product)

### Step 5: Setup Test Data Strategy

**Read `_shared/test-data-factories.md`.** For E2E tests:

1. **Preferred**: Pre-seed data via DB scripts or API seed endpoints before browser tests:
   ```typescript
   test.beforeAll(async () => {
     await seedDatabase({ users: [aDefaultUser(), anAdminUser()] });
   });
   ```
2. Clean up data between test suites — use unique test users or DB reset.

### Step 6: Generate E2E Tests

#### 6.0 Parallel Execution (Large Systems)

For large systems with many critical user journeys, writing E2E tests sequentially is time-consuming. Before generating tests, evaluate whether parallel sub-agent execution is appropriate.

**Read `_shared/parallel-execution.md`** and follow its workflow:

1. **Count target user journeys**: If the total number of E2E test files to generate is **>= 3**, parallel execution is warranted.

2. **Detect sub-agent support**: Check if the host agent supports the `Agent` tool for spawning sub-agents.

3. **If sub-agent supported AND target count >= 3**:
   - **Partition work** following `_shared/parallel-execution.md` Phase 2:
     - **Code-based**: Group user journeys by business domain (e.g., Authentication flows, Checkout flows, Account Management flows).
     - **Spec-based**: Group BDD scenarios or user stories by feature area.
   - **Ensure independence**: E2E partitions must use isolated test data (different test users, different entities). If two flows share the same user account, assign unique test accounts per partition.
   - **Launch parallel sub-agents** in a single message (all concurrent), each receiving a self-contained prompt with:
     - Assigned user journeys or spec scenarios
     - Language, frontend framework, E2E framework — Playwright/Cypress (from Step 1.2 and Step 1.3)
     - Test directory (from Step 1.4)
     - Evaluation criteria (from Step 2)
     - Pyramid dedup results — scenarios to skip (from Step 3)
     - Critical flow priorities (from Step 4)
     - Test data strategy and seed scripts (from Step 5)
     - Page Object pattern and `data-testid` conventions
     - Annotation format (from the skill's annotation guidelines)
     - Instructions to read pages/routes, generate tests per Steps 6.1-6.2 guidelines, and write test files
   - **Collect results**: After all sub-agents complete, merge their summaries.
   - **Handle failures**: If any sub-agent fails, generate remaining tests for that partition sequentially.
   - **Skip Steps 6.1-6.2**. Proceed to Step 7.

4. **If sub-agent NOT supported**: Fall through to Steps 6.1-6.2 for sequential generation.

5. **If target count < 3**: Skip parallel execution. Fall through to Steps 6.1-6.2.

#### 6.1 SPEC-BASED Generation:

1. **Read user story or workflow documents** at the given path.
2. Parse user journeys — look for:
   - BDD scenarios: `Feature:`, `Scenario:`, `Given`, `When`, `Then`
   - User stories: "As a <role>, I want to <action>, so that <benefit>"
   - Workflow diagrams/descriptions: step-by-step user actions
   - Acceptance criteria: numbered list of conditions
3. For each critical user journey (status: `planned`), generate an E2E test:
   - **Given**: Sets up the system state (seed data, login state)
   - **When**: Performs the user actions (click, type, navigate)
   - **Then**: Verifies the observable outcome (page content, URL, success message)
4. Focus on the **top 3-5 business-critical flows** — not every possible path.
5. Each test includes: `// Spec: E2E-<ENTITY>-<NNN> | Evaluates: User Journey`

#### 6.2 CODE-BASED Generation:

1. **Discover the application structure**:
   - For web apps: Use **Glob** to find page components, route definitions
   - Use **Read** to understand the main navigation structure and key pages
2. **Identify critical flows** by examining authentication, CRUD, business workflows.
3. For each identified flow, after pyramid dedup (Step 3), generate an E2E test:
   - Test name describes the user journey: `userCanLoginAndViewDashboard`
   - Steps are written from the user's perspective
   - Assertions verify user-visible outcomes
   - Use `data-testid` attributes as selectors (recommend adding them if missing)

### Step 7: Generate E2E Test Infrastructure

Alongside the tests, generate:

1. **Configuration file** (if not present):
   - Playwright: `playwright.config.ts` with `webServer`, `trace: 'on-first-retry'`, browsers config
   - Cypress: `cypress.config.ts`
2. **Setup/teardown scripts**: database seed/reset, app startup commands, Docker Compose for dependencies
3. **Page Object Models** (for code-based mode):
   - Create page object classes for key pages with centralized element locators
   - Prefer `data-testid` selectors

### Step 8: Configure E2E Scenario Coverage

1. Generate a **Scenario Coverage Matrix**:

| Priority | User Journey | Test File | Status | Notes |
|----------|-------------|-----------|--------|-------|
| P0 | User can login | `login.spec.ts` | ✅ | Happy path + error |
| P0 | User can complete purchase | `checkout.spec.ts` | ✅ | 3 payment methods |
| P1 | User can reset password | — | ❌ | Needs implementation |

2. **Categorize by business impact**:
   - **P0 (Critical)**: Core revenue paths, login — must have 100% coverage
   - **P1 (Important)**: Secondary flows, error recovery — aim for 80%+
   - **P2 (Nice-to-have)**: Edge cases, power-user features

3. Browser/device coverage: Chromium, Firefox, WebKit; desktop, tablet, mobile viewports.

### Step 9: Generate Spec File

Same process — see `_shared/evaluation-framework.md`. Mark generated E2E test cases with `status: implemented`, update the scenario coverage matrix.

### Step 10: Write Tests to Files

1. Use **Write** to create E2E test files in the E2E directory.
2. Use Page Object pattern for maintainability.
3. Add descriptive test names that read like user journey descriptions.
4. Include spec reference comments.
5. Use `data-testid` for selectors (recommend adding attributes if missing).

### Step 11: Verify Test Compilation & Execution

#### 11-A: Verify Test Compilation

**Read `_shared/compilation-verification.md` Phase 1** and follow its workflow:

1. **Run the test compilation command** (TypeScript check for Playwright/Cypress tests).
2. **If test compilation FAILS**: categorize, auto-fix (up to 3 retries), or report unfixable errors.
3. **Note for E2E**: Playwright/Cypress config files may need TypeScript types. Ensure `@playwright/test` or `cypress` is in devDependencies.

#### 11-B: Verify Test Execution

**Read `_shared/test-execution-verification.md`** and follow its workflow:

1. **Check E2E-specific prerequisites**:
   - Playwright/Cypress installed: `npx playwright --version` or `npx cypress --version`.
   - Browser binaries installed: `npx playwright install chromium` (if not installed).
   - Application start command identified.
   - Base URL configured in `playwright.config.ts` or `cypress.config.ts`.
2. **Start the application** (or verify it's running) — needed for browser tests.
3. **Run a dry-run smoke test** — navigate to the app's home page and verify it loads.
4. **If runtime error**: diagnose (app not running? wrong port? browser driver missing?) and report fix.
5. **Run all generated E2E tests** and categorize results.
6. **Report execution summary** with emphasis on which user journeys are covered.

### Step 12: Generate Spec Documentation (SDD)

**Read `_shared/spec-doc-generator.md`** and follow its workflow to produce the execution record spec document.

**MANDATORY — Before any file operations**, ensure the base directory and current layer's subdirectory exist:

```bash
mkdir -p docs/khufu/e2e
```

> Only create the `e2e/` subdirectory — do NOT create subdirectories for other test types (ut/, it/, api/). Other types will create their own when they run.

1. **Collect data** from Steps 10 (test execution) and 11 (scenario coverage):
   - User journey inventory and test files generated
   - Test execution results: pass/fail/skip per journey
   - Scenario coverage matrix: user journey, priority, status
   - Framework info: Playwright version (or Qt Test)
   - Test case details grouped by feature area: Test File, User Journey (Target), Page Flow(s), Status

2. **Determine the spec doc path**:
   - Read `khufu.yaml` → `spec.docsDirectory` (default: `docs/khufu/`)
   - Path: `docs/khufu/e2e/<YYYY-MM-DD>-e2e-test-cases.md`

3. **Build the spec doc** following the template in `_shared/spec-doc-generator.md` (for E2E, modules → feature areas, Target Class → User Journey, Target Method(s) → Page Flow(s))

4. **Check for existing spec doc** (same date + same layer):
   - **If exists**: Read → increment `**Version**` → **APPEND** within each feature area's subsection
   - **If not exists**: Create with `**Version**: 1`

5. **Write the spec doc** and **update the wizard file** `docs/khufu/test-cases.md`.

### Step 13: Report Summary

**Read `_shared/report-template.md`** and generate using the E2E-specific sections:
- Summary table with pyramid skip count
- Scenario coverage matrix (P0/P1/P2 breakdown)
- Browser/device coverage configuration
- Coverage gaps and what's needed to fill them
- Evaluation Results (if EDD enabled)
- Spec Coverage (if spec system enabled)
- Suggested run command + CI integration hint

## E2E Test Patterns

### C++ Project Notes

**For C++ backend services with web frontends:** Use Playwright in a separate project (TypeScript recommended). E2E tests are language-agnostic — they interact with the running application through the browser, regardless of the backend implementation language.

**For Qt desktop applications:** E2E testing is tied to the C++ Qt framework. Use Qt Test with widget simulation:

```cpp
#include <QtTest>
#include <QApplication>
#include <QPushButton>
#include <QSignalSpy>

class LoginE2ETest : public QObject {
    Q_OBJECT

private slots:
    // Spec: specs/LoginFlow/spec.v1.md
    // Spec ID: E2E-LOGIN-001
    // Evaluates: User Journey — 关键用户旅程
    void shouldLoginSuccessfullyWithValidCredentials() {
        QPushButton loginButton("Login");
        QSignalSpy spy(&loginButton, &QPushButton::clicked);

        QTest::mouseClick(&loginButton, Qt::LeftButton);
        QCOMPARE(spy.count(), 1);
    }
};

QTEST_MAIN(LoginE2ETest)
#include "login_e2e.moc"
```

**Note:** Qt E2E testing requires a running QApplication event loop. For complex UI flows, consider Squish (commercial) or test widgets/screens in isolation with Qt Test.

### Playwright (TypeScript) — Recommended
```typescript
import { test, expect } from '@playwright/test';

/**
 * Spec: specs/UserRegistration/spec.v1.md
 * Test Cases: E2E-USER-001
 * Evaluation: User Journey — 关键用户旅程完整
 */
test.describe('User Login Flow', () => {
  test('user can login with valid credentials', async ({ page }) => {
    // Given: User is on the login page
    await page.goto('/login');

    // When: User enters credentials and submits
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Then: User is redirected to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]'))
      .toContainText('Welcome back');
  });

  test('user sees error with invalid credentials', async ({ page }) => {
    // Spec ID: E2E-USER-002 | Evaluates: Correctness
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrong');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]'))
      .toBeVisible();
  });
});
```

### Playwright (Java)
```java
import com.microsoft.playwright.*;
import org.junit.jupiter.api.*;

@Tag("e2e")
class LoginE2ETest {
    static Playwright playwright;
    static Browser browser;

    @BeforeAll
    static void setup() {
        playwright = Playwright.create();
        browser = playwright.chromium().launch();
    }

    @AfterAll
    static void teardown() {
        browser.close();
        playwright.close();
    }

    @Test
    @DisplayName("E2E-USER-001: userCanLoginWithValidCredentials")
    // Spec: specs/UserRegistration/spec.v1.md
    // Evaluates: User Journey — 关键用户旅程
    void userCanLoginWithValidCredentials() {
        Page page = browser.newPage();
        page.navigate("http://localhost:3000/login");
        page.fill("[data-testid='email-input']", "user@example.com");
        page.fill("[data-testid='password-input']", "password123");
        page.click("[data-testid='login-button']");

        assertEquals("http://localhost:3000/dashboard", page.url());
        assertTrue(page.locator("[data-testid='welcome-message']").textContent()
            .contains("Welcome back"));
        page.close();
    }
}
```

### Playwright (Python)
```python
import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(scope="session")
def browser():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        yield browser
        browser.close()

# Spec: specs/UserRegistration/spec.v1.md
# Spec ID: E2E-USER-001
# Evaluates: User Journey — 关键用户旅程完整
def test_user_can_login_with_valid_credentials(page: Page):
    page.goto("/login")
    page.fill("[data-testid='email-input']", "user@example.com")
    page.fill("[data-testid='password-input']", "password123")
    page.click("[data-testid='login-button']")

    expect(page).to_have_url("/dashboard")
    expect(page.locator("[data-testid='welcome-message']")) \
        .to_contain_text("Welcome back")
```

## CI Integration

```yaml
# GitHub Actions example
- name: Run E2E tests
  run: npx playwright test --project=chromium
- name: Upload E2E report
  uses: actions/upload-artifact@v4
  with:
    name: e2e-report
    path: playwright-report/
```

## Best Practices

- Use `data-testid` attributes for element selectors (avoid CSS classes, IDs, XPath)
- Set reasonable timeouts (Playwright auto-wait is good, but add explicit waits for slow operations)
- Run E2E tests against a staging/pre-production environment, not production
- Keep test data isolated — use unique test users and clean up created data
- Run E2E tests less frequently than unit/integration tests (nightly or per-release)
- Debug with traces and screenshots — Playwright's trace viewer is invaluable
- One E2E test should cover one complete user journey (not a single action)
- Read `_shared/test-data-factories.md` for shared data setup — use seed scripts for E2E
