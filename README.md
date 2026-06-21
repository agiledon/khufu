# Khufu

A test generation skill framework for AI IDEs, following the **test pyramid** methodology.

Khufu provides four skills — `/khufu-ut`, `/khufu-it`, `/khufu-api`, `/khufu-e2e` — that leverage AI agents to generate unit tests, integration tests, API tests, and end-to-end tests for your projects.

## Features

- **Test Pyramid**: Complete coverage across all four test layers
- **Two Generation Paths**:
  - **Spec-based**: Generate tests from specification documents (`/khufu-ut @docs/spec.md`)
  - **Code-based**: Generate tests by reading existing implementations
- **Language-Aware**: Auto-detects your project language and suggests appropriate test frameworks
- **TDD-Aligned**: Tests follow Test-Driven Development and Agile best practices
- **Claude Code Native**: Installs as a Claude Code plugin with slash commands

## Quick Start

```bash
# Install globally
npm install -g khufu

# Initialize in your project
cd your-project
khufu init

# Use the skills in Claude Code
/khufu-ut          # Generate unit tests
/khufu-it          # Generate integration tests
/khufu-api         # Generate API tests
/khufu-e2e         # Generate E2E tests
```

## Supported Languages (v0.1)

| Language | UT Frameworks | IT Frameworks | API Frameworks | E2E Frameworks |
|----------|--------------|---------------|----------------|----------------|
| Java | JUnit 5/4, TestNG | Spring Boot Test, Testcontainers | REST Assured, MockMvc | Playwright, Selenium |
| Python | pytest, unittest | pytest + testcontainers | pytest + httpx | Playwright |
| TypeScript/JS | Jest, Vitest, Mocha | Jest + Supertest | Supertest | Playwright, Cypress |
| Go | testing + testify | testing + dockertest | testing + httptest | Playwright |
| C# | xUnit, NUnit, MSTest | xUnit + Testcontainers | RestSharp | Playwright |

## Configuration

After `khufu init`, a `khufu.yaml` file is created in your project root:

```yaml
ide: claude
language: java
frameworks:
  ut: junit5
  it: spring-boot-test
  api: rest-assured
  e2e: playwright
directories:
  ut: src/test/java/
  it: src/test/java/
  api: src/test/java/
  e2e: e2e/
scope: project
```

Edit this file to customize framework choices and test directory locations.

## License

MIT
