# Khufu

**English** | [简体中文](./README.zh-CN.md)

A test generation skill framework for AI IDEs, following the **test pyramid** methodology with **Evaluation-Driven Development (EDD)** and **Specification-Driven Development (SDD)**.

Khufu provides six skills — `/khufu-ut`, `/khufu-it`, `/khufu-api`, `/khufu-e2e`, `/khufu-harness`, and `/khufu-to-prd` — that leverage AI agents to generate unit tests, integration tests, API tests, end-to-end tests, project constraint assets (Harness Engineering), and MVP PRDs for your projects.

## Features

- **Test Pyramid**: Complete coverage across all four test layers with built-in deduplication — higher layers only test what lower layers structurally cannot
- **Evaluation-Driven Development (EDD)**: Define quantifiable quality criteria (coverage, performance, correctness) BEFORE generating tests. Every test serves a measurable evaluation standard. Built-in `Evaluate → Verify → Improve` feedback loop
- **Specification-Driven Development (SDD)**: Test cases are explicit, versioned Markdown spec files (`specs/<feature>/spec.v<N>.md`). Supports forward generation (Spec → Tests) and reverse generation (Tests → Spec). Each test links back to its spec entry
- **Two Generation Paths**:
  - **Spec-based**: Generate tests from specification documents (`/khufu-ut @docs/spec.md`)
  - **Code-based**: Generate tests by reading existing implementations (auto-generates retroactive specs)
- **Language-Aware**: Auto-detects your project language and suggests appropriate test frameworks
- **Testability Assessment** (UT): Grades source files A/B/C — directly testable, needs PowerMock (marked `fragile`), or requires refactoring (recorded to `untestable-report.md`)
- **H2 Database Support** (IT): Lightweight in-memory database option for Java integration tests — zero Docker dependency, <5s startup for fast CI feedback
- **Shared Test Data Factories**: Define test data once, reuse across IT, API, and E2E layers
- **TDD-Aligned**: Tests follow Test-Driven Development and Agile best practices
- **Requirement to PRD**: `/khufu-to-prd` grills a requirement description, splits it into MVPs, and writes Cockburn fully dressed use cases under `docs/prd/` (`prd-mvp1.md`, `prd-mvp2.md`, … and `prd-catalog.md`)
- **Multi-IDE Support**: Installs into Claude Code, Cursor, OpenCode, Codex, Qoder, and Trae — each tool gets its skills placed using that tool's own skill/command directory convention

## Quick Start

```bash
# Install globally
npm install -g khufu-kit

# Initialize in your project
cd your-project
khufu init

# Check for a newer version on npm and update if available
khufu update

# Use the skills in your IDE (e.g. Claude Code)
/khufu-ut          # Generate unit tests
/khufu-it          # Generate integration tests
/khufu-api         # Generate API tests
/khufu-e2e         # Generate E2E tests
/khufu-harness     # Build / update project constraint assets
/khufu-to-prd      # Grill a requirement into MVP PRDs
```

## Supported Agentic Coding Tools

Khufu installs its skills into each tool using that tool's own skill/command directory convention, so the same `khufu init` works everywhere:

| Tool | Skill/Command directory (project) | Global directory |
|------|-----------------------------------|------------------|
| Claude Code | `.claude/skills/` | `~/.claude/skills` |
| Cursor | `.cursor/commands/` | `~/.cursor/commands` |
| OpenCode | `.opencode/commands/` | `~/.opencode/commands` |
| Codex (OpenAI) | `.codex/skills/` | `~/.codex/skills` |
| Qoder | `.qoder/skills/` | `~/.qoder/skills` |
| Trae | `.trae/skills/` | `~/.trae/skills` |

Install for one or more tools:

```bash
khufu init --ide claude,qoder,trae
```

Each selected tool receives all six skills (`khufu-ut`, `khufu-it`, `khufu-api`, `khufu-e2e`, `khufu-harness`, `khufu-to-prd`) in its own directory.

## Updating

`khufu update` compares your installed version against the latest published `khufu-kit` on npm:

- If a newer version is available, it updates (prompting for confirmation when interactive).
- Otherwise it reports that you are already up to date.

```bash
khufu update       # interactive — prompts before updating
khufu update -y    # update automatically without prompting
```

## Supported Languages (v0.2)

| Language | UT Frameworks | IT Frameworks | API Frameworks | E2E Frameworks |
|----------|--------------|---------------|----------------|----------------|
| Java | JUnit 5/4, TestNG | Spring Boot Test, Testcontainers, **H2** | REST Assured, MockMvc | Playwright, Selenium |
| Python | pytest, unittest | pytest + testcontainers | pytest + httpx | Playwright |
| TypeScript/JS | Jest, Vitest, Mocha | Jest + Supertest | Supertest | Playwright, Cypress |
| Go | testing + testify | testing + dockertest | testing + httptest | Playwright |
| C# | xUnit, NUnit, MSTest | xUnit + Testcontainers | RestSharp | Playwright |

## Test Pyramid Strategy

Khufu enforces a **non-overlapping test pyramid**. Each layer owns a distinct risk dimension:

| Layer | Owns | Does NOT Own |
|-------|------|-------------|
| **UT** | Business logic, algorithms, validation, state transitions | DB queries, HTTP routing, UI |
| **IT** | Component wiring, transaction boundaries, ORM mappings, DB constraints | Business logic details, HTTP status codes |
| **API** | Status codes, response schemas, headers, auth/authz, content negotiation | Component internals, DB state |
| **E2E** | Critical user journeys, multi-page workflows, browser interactions | Edge-case validation, exhaustive error paths |

When generating tests at a layer, khufu scans lower-layer tests and skips scenarios that add no new risk — keeping your suite lean and fast.

## Spec System (SDD)

Khufu treats test specifications as first-class artifacts. Each feature gets a versioned Markdown spec:

```
specs/
├── UserRegistration/
│   ├── spec.v1.md        # Versioned specification
│   ├── spec.v2.md
│   └── CHANGELOG.md      # Spec change history
```

Each spec file contains:

```markdown
# Feature: UserRegistration
- Version: 1 | Created: 2026-06-25 | Source: spec-based | Criticality: High

## Evaluation Criteria          ← EDD: defined BEFORE tests
### Correctness（正确性）
- [ ] Normal input returns User with ID
- [ ] Duplicate email throws DuplicateEmailException

## Unit Tests
### UT-USER-001: shouldCreateUser_whenValidInputGiven
- Category: happy-path | Status: implemented
- Test File: `__tests__/UserService.test.ts`
- Evaluates: Correctness — normal input returns User
**Scenario:** Given ... When ... Then ...

## Evaluation Summary           ← EDD: filled AFTER test execution
| Criteria | Target | Actual | Status |
|----------|--------|--------|--------|
| Line coverage | ≥85% | 88% | ✅ |
| Branch coverage | ≥75% | 72% | ❌ |
```

Spec lifecycle: `planned → implemented → evaluated → passed` (failed criteria trigger re-evaluation).

## Fragile Test Handling

For tightly-coupled code that resists standard mocking, khufu-ut offers:

- **PowerMock / Mockito-inline** support for Java (static methods, constructors, final classes)
- All such tests are tagged `@Tag("fragile")` and **excluded from CI by default**
- Fragile tests are tracked as technical debt — target ≤20% of test suite
- Untestable code (Grade C) is recorded to `untestable-report.md` with refactoring recommendations

## Configuration

After `khufu init`, a `khufu.yaml` file is created in your project root:

```yaml
ide: [claude, qoder, trae]
language: typescript
frameworks:
  ut: jest
  it: jest
  api: supertest
  e2e: playwright
directories:
  ut: __tests__/
  it: __tests__/integration/
  api: __tests__/api/
  e2e: e2e/
coverage:
  ut:
    tool: jest
    thresholds: { line: 80, branch: 70, function: 80 }
    formats: [lcov, html, text]
    excludes: ['**/*.d.ts', '**/index.ts', '**/*.config.*']
  it:
    tool: jest
    thresholds: { line: 60, branch: 50 }
    formats: [lcov, html]

# Fragile test management (v0.2)
categories:
  fragile:
    excludeFromCI: true
    runOnSchedule: weekly

# Spec system (v0.2)
spec:
  enabled: true
  directory: specs/
  format: markdown
  versioning: file-based
  autoGenerateFromTests: true

# Evaluation-Driven Development (v0.2)
evaluation:
  enabled: true
  failOnUnmetCriteria: warning
  dimensions: [correctness, coverage, performance, maintainability]
  thresholds:
    ut: { lineCoverage: 80, branchCoverage: 70, maxTestMs: 100, maxFragileRatio: 20 }
    it: { lineCoverage: 60, branchCoverage: 50, maxTestMsH2: 2000, maxTestMsPostgres: 10000 }

# Shared test data (v0.2)
dataFactories:
  directory: tests/factories/
  reuseAcrossLayers: true

scope: project
```

## Architecture

```
skills/
├── _shared/                       # Shared modules (v0.2)
│   ├── mode-selection.md          # Spec-based vs code-based mode
│   ├── language-detection.md      # Language & framework detection
│   ├── framework-selector.md      # Framework routing by language × layer
│   ├── directory-resolver.md      # Test directory resolution
│   ├── coverage-config.md         # Coverage tool configuration
│   ├── report-template.md         # Unified report generation
│   ├── test-data-factories.md     # Shared data factory patterns
│   ├── test-pyramid-strategy.md   # Layer deduplication rules
│   └── evaluation-framework.md    # EDD methodology
├── khufu-ut/SKILL.md              # Unit test generator
├── khufu-it/SKILL.md              # Integration test generator
├── khufu-api/SKILL.md             # API test generator
├── khufu-e2e/SKILL.md             # E2E test generator
├── khufu-harness/SKILL.md         # Constraint asset builder
└── khufu-to-prd/SKILL.md          # MVP PRDs as Cockburn use cases
```

Skills reference `_shared/` modules via Read-tool delegation — shared logic is defined once and consumed by all four skills.

## Development

### Working on khufu itself

A single command symlinks the skills into place so Claude Code loads them directly from your working tree:

```bash
git clone https://github.com/agiledon/khufu.git
cd khufu
npm install
npm run build
npm run setup    # creates symlinks for local development
```

What `setup` does:

- Symlinks `skills/_shared/` → `_shared/` at the project root (so `Read _shared/...` references in skill files resolve correctly)
- Symlinks each `skills/khufu-*/` → `.claude/skills/khufu-*/` (Claude Code loads skills from `.claude/skills/`)
- Replaces any stale copies from a prior `khufu init`

After setup, edit any file under `skills/` and changes are live immediately — no rebuild, no copy step.

```bash
npm test         # run khufu's own tests
npm run dev      # watch mode (tsc --watch)
```

### Installing from local source into another project

Use `npm link` to register the local khufu CLI globally, then initialize it in your target project:

```bash
# Step 1: Build khufu-kit from source
cd /path/to/khufu-kit
npm install
npm run build
npm link                    # registers 'khufu' command globally

# Step 2: Install into your project
cd /path/to/your-project
khufu init                  # creates khufu.yaml, installs skills into the selected IDE(s)' skills/commands directory
```

To pick up changes after editing khufu-kit's source:

```bash
cd /path/to/khufu-kit
npm run build               # recompile TypeScript
# The 'khufu' command now uses the updated build automatically (npm link)
```

To undo the global link when done:

```bash
cd /path/to/khufu-kit
npm unlink -g khufu-kit
```

Alternatively, use `npm install` with a local path (no global link):

```bash
cd /path/to/your-project
npm install /path/to/khufu-kit
npx khufu init
```

## License

MIT
