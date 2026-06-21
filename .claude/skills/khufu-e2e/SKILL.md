---
name: khufu-e2e
description: >-
  This skill should be used when the user wants to generate end-to-end tests, asks for "E2E tests", mentions "端到端测试", "khufu-e2e", "browser tests", "UI tests", or wants to test complete user journeys through the entire system. Supports spec-based generation (with @path to user story or workflow documents) and code-based generation (from existing application routes and pages). E2E tests are the tip of the test pyramid — fewest in number, slowest, but cover the most critical business flows.
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

# khufu-e2e: End-to-End Test Generator

Generate end-to-end tests — the **tip** of the test pyramid. E2E tests simulate real user journeys through the complete system, including the browser/frontend, backend services, and databases. They are the slowest and most brittle tests, so write only for the most critical business flows.

## Core Principles

- **Real user journeys**: Test complete workflows that real users perform
- **Full system**: All services running, real browser (or headless), real database
- **Few and focused**: Only test critical paths — login, checkout, core workflows
- **User perspective**: Test what the user sees and does, not internal state
- **Smoke tests**: A small set of E2E tests can serve as production smoke tests
- **Clean state**: Each test should start from a known, clean system state

## Workflow

### Step 1: Determine Generation Mode

**If `$ARGUMENTS` contains a file or directory path** (user provided `@path/to/specs`):
- SPEC-BASED mode: Read user story documents, workflow descriptions, or BDD feature files

**If `$ARGUMENTS` is empty**:
- Use the **AskUserQuestion** tool:
  1. "Spec-based: I'll provide user stories or workflow documents"
  2. "Code-based: Read existing application routes and pages to identify critical flows"

### Step 2: Detect or Confirm Language / Frontend Framework

1. Check `khufu.yaml` for configured language.
2. Auto-detect the frontend framework:
   - `package.json` with `react` → React
   - `package.json` with `vue` → Vue
   - `package.json` with `@angular/core` → Angular
   - `pom.xml` with `thymeleaf` or `vaadin` → Server-rendered Java
   - Static HTML → Plain web app
3. Confirm with user using **AskUserQuestion**.

### Step 3: Select E2E Test Framework

E2E frameworks are mostly language-agnostic (test the browser). Present options:

**Universal** (work with any language/frontend):
- **Playwright** (Recommended): Modern cross-browser automation with auto-wait, trace viewer, API mocking. Supports Java, Python, .NET, and JS/TS.
- **Selenium WebDriver**: Mature browser automation. Broad language support but requires more boilerplate.

**TypeScript/JavaScript ecosystem**:
- **Cypress**: Developer-friendly with time-travel debugging and real-time reloads. JavaScript/TypeScript only.

**Java ecosystem**:
- **Playwright (Java)** or **Selenium (Java)**

**Python ecosystem**:
- **Playwright (Python)** or **Selenium (Python)**

### Step 4: Determine Test Directory

E2E tests live in a dedicated directory at the project root:

| Convention | Directory |
|------------|-----------|
| Playwright (default) | `e2e/` or `tests/e2e/` |
| Cypress | `cypress/e2e/` |
| Selenium (Java) | `src/test/java/e2e/` |
| Selenium (Python) | `tests/e2e/` |

Check `khufu.yaml` for custom directory overrides.

### Step 5: Generate E2E Tests

#### SPEC-BASED Generation:

1. **Read user story or workflow documents** at the given path.
2. Parse user journeys — look for:
   - BDD scenarios: `Feature:`, `Scenario:`, `Given`, `When`, `Then`
   - User stories: "As a <role>, I want to <action>, so that <benefit>"
   - Workflow diagrams/descriptions: step-by-step user actions
   - Acceptance criteria: numbered list of conditions
3. For each critical user journey, generate an E2E test that:
   - **Given**: Sets up the system state (seed data, login state)
   - **When**: Performs the user actions (click, type, navigate)
   - **Then**: Verifies the observable outcome (page content, URL, success message, database state)
4. Focus on the **top 3-5 business-critical flows** — not every possible path.
5. Include cross-browser configuration comments if the spec requires it.

#### CODE-BASED Generation:

1. **Discover the application structure**:
   - For web apps: Use **Glob** to find page components, route definitions
   - Use **Read** to understand the main navigation structure and key pages
2. **Identify critical flows** by examining:
   - Authentication: login, logout, registration, password reset
   - Primary CRUD: create, view, edit, delete for core entities
   - Business workflows: checkout, approval, submission, search
3. For each identified flow, generate an E2E test:
   - Test name describes the user journey: `userCanLoginAndViewDashboard`
   - Steps are written from the user's perspective
   - Assertions verify user-visible outcomes
   - Use `data-testid` attributes as selectors (recommend adding them if missing)

### Step 6: Generate E2E Test Infrastructure

Alongside the tests, generate:

1. **Configuration file** (if not present):
   - Playwright: `playwright.config.ts` or `playwright.config.js`
   - Cypress: `cypress.config.ts` or `cypress.config.js`
   - Selenium: test runner configuration

2. **Setup/teardown scripts**:
   - Database seed/reset script
   - Application startup commands
   - Docker Compose for dependent services (if needed)

3. **Page Object Models** (for code-based mode):
   - Create page object classes for key pages with element locators and action methods
   - Keep selectors centralized for maintainability

### Step 7: Configure E2E Scenario Coverage Tracking

E2E tests sit at the top of the pyramid — the fewest in number, covering only critical business flows. Traditional code coverage doesn't apply here. Instead, track **scenario coverage** and **user journey coverage**.

1. **Generate a Scenario Coverage Matrix** listing every critical user journey and its test status:

| Priority | User Journey | Test File | Test Status | Notes |
|----------|-------------|-----------|-------------|-------|
| P0 | User can login | `login.spec.ts` | ✅ Generated | Happy path + error case |
| P0 | User can complete purchase | `checkout.spec.ts` | ✅ Generated | 3 payment methods |
| P1 | User can reset password | — | ❌ Not covered | Needs implementation |
| P1 | Admin can view dashboard | `admin.spec.ts` | ✅ Generated | Basic smoke test |

2. **Categorize journeys by business impact**:
   - **P0 (Critical)**: Core revenue paths, login, primary user workflow — must have 100% coverage
   - **P1 (Important)**: Secondary flows, error recovery, admin functions — aim for 80%+ coverage
   - **P2 (Nice-to-have)**: Edge cases, power-user features, settings pages

3. **Track E2E metrics** beyond just scenario counts:
   - **Browser coverage**: Which browsers are tested (Chromium, Firefox, WebKit)?
   - **Device coverage**: Desktop, tablet, mobile viewports?
   - **Path coverage**: Happy path, error path, retry path, timeout path?

4. **Playwright-specific coverage features** (if using Playwright):
   - Enable `trace: 'on-first-retry'` in config for debugging failures
   - Use Playwright's built-in test reporter to generate HTML reports with pass/fail/timing
   - Configure `webServer` in `playwright.config.ts` to auto-start the app
   - Export test results to CI-friendly formats (JUnit XML, JSON)

5. **Generate a `e2e-coverage.md` document** summarizing:
   - Total scenarios defined vs tested
   - Coverage by priority level (P0/P1/P2)
   - Browser/device matrix status
   - Known gaps and what's needed to fill them
   - Suggested cadence: run smoke tests (P0) on every PR; full E2E nightly

6. **CI Integration hint**: Add a comment in the generated test config showing how to run tests in CI:
   ```yaml
   # GitHub Actions example
   - name: Run E2E tests
     run: npx playwright test --project=chromium
   - name: Upload E2E report
     uses: actions/upload-artifact@v3
     with:
       name: e2e-report
       path: playwright-report/
   ```

### Step 8: Write Tests to Files

1. Use **Write** to create E2E test files in the E2E directory.
2. Use Page Object pattern for maintainability.
3. Add descriptive test names that read like user journey descriptions.
4. Include comments linking back to spec/user story references.
5. Add a comment indicating generated by khufu-e2e.

### Step 9: Report Summary

Report:
- Number of E2E test files created
- Number of user journeys covered
- Scenario coverage matrix (P0/P1/P2 breakdown)
- Browser/device coverage configuration
- Coverage gaps and what's needed to fill them
- Suggested command: how to start the system and execute E2E tests with trace
- Recommended next step: add `data-testid` attributes to UI components for stable selectors
- Page Objects created
- Required infrastructure: databases, services, containers
- Suggested command to run: how to start the system and execute E2E tests
- Recommended next step: add `data-testid` attributes to UI components for stable selectors

## E2E Test Patterns

### Playwright (TypeScript) — Recommended
```typescript
import { test, expect } from '@playwright/test';

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

def test_user_can_login_with_valid_credentials(page: Page):
    page.goto("/login")
    page.fill("[data-testid='email-input']", "user@example.com")
    page.fill("[data-testid='password-input']", "password123")
    page.click("[data-testid='login-button']")

    expect(page).to_have_url("/dashboard")
    expect(page.locator("[data-testid='welcome-message']")) \
        .to_contain_text("Welcome back")
```

## Critical Flow Identification Guide

When identifying which flows to test (code-based mode), prioritize:

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

## Best Practices

- Use `data-testid` attributes for element selectors (avoid CSS classes, IDs, XPath)
- Set reasonable timeouts (Playwright auto-wait is good, but add explicit waits for slow operations)
- Run E2E tests against a staging/pre-production environment, not production
- Keep test data isolated — use unique test users and clean up created data
- Run E2E tests less frequently than unit/integration tests (nightly or per-release)
- Debug with traces and screenshots — Playwright's trace viewer is invaluable
- One E2E test should cover one complete user journey (not a single action)
