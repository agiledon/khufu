---
name: khufu-ut
description: >-
  This skill should be used when the user wants to generate unit tests, asks for "unit tests", mentions "单元测试", "khufu-ut", or wants to write tests at the base of the test pyramid. Supports spec-based generation (with @path to spec documents) and code-based generation (from existing implementations). Unit tests verify individual functions and methods in isolation with all dependencies mocked.
version: 0.2.0
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

# khufu-ut: Unit Test Generator

Generate unit tests — the **base layer** of the test pyramid. Unit tests verify single functions or methods in isolation. They are the fastest, most numerous, and most granular tests in your suite.

## Core Principles

- **Isolation**: Each test verifies ONE unit (function/method/class) with ALL external dependencies mocked
- **Speed**: Unit tests should run in < 100ms each
- **Coverage**: Focus on public API surface, edge cases, boundary conditions, and error paths
- **EDD**: Define evaluation criteria first, then generate tests to serve those criteria (Read `_shared/evaluation-framework.md`)
- **AAA Pattern**: Arrange (setup) → Act (execute) → Assert (verify)

## Workflow

### Step 1: Environment Setup (Shared)

Read the following shared modules to configure the test generation environment:

1. **Read `_shared/mode-selection.md`** — determines spec-based vs code-based generation mode. Follow its workflow exactly.
2. **Read `_shared/language-detection.md`** — detects language, build system, and reads `khufu.yaml` configuration. Follow its workflow exactly.
3. **Read `_shared/framework-selector.md`** with `layer: ut` — selects the unit test framework and mocking library.
4. **Read `_shared/directory-resolver.md`** with `layer: ut` — determines the output directory for test files.

### Step 2: EDD — Define Evaluation Criteria

**Read `_shared/evaluation-framework.md`** and follow its EDD workflow:

1. **Define evaluation criteria BEFORE generating tests.** Based on the UT layer, select applicable dimensions:
   - **Correctness** (required): behavior correctness for all public methods
   - **Coverage** (required): line ≥ 80%, branch ≥ 70%, function ≥ 80%
   - **Performance** (required): each test < 100ms
   - **Maintainability** (required): naming conventions, test independence, fragile ratio ≤ 20%

2. If in **spec-based mode**: populate the `## Evaluation Criteria` section of the spec file with quantified criteria.
3. If in **code-based mode**: define criteria in-memory (they will be written to the retroactively-generated spec later).

### Step 3: Pyramid Dedup Check

**Read `_shared/test-pyramid-strategy.md`.** As the base layer, UT has no lower layers to check against. However, note:
- UT OWNS business logic verification — IT/API/E2E should not duplicate these checks
- In the generated test comments, mark which risk dimensions the test covers (see Step 6 annotation format)

### Step 4: Testability Assessment (New in v0.2.0)

Before generating tests, assess each source file's testability. This determines HOW tests are generated.

#### 4.1 Discover and Classify Source Files

For **code-based mode**, use **Glob** to find source files (excluding `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`, `target/`, `__pycache__/`).

For each source file, read it and classify its testability:

**Grade A — Directly Testable:**
- Has dependency injection (constructor/setter)
- Depends on interfaces, not concrete classes
- Methods are pure or have mockable side effects
- → Generate standard unit tests with conventional mocking (Mockito/Jest/pytest-mock)

**Grade B — Needs PowerMock / Advanced Mocking:**
- Calls static methods
- Instantiates objects with `new` inside method body
- Uses final classes or static utilities
- → Offer user two options (see 4.2)

**Grade C — Requires Refactoring:**
- No interfaces, global state, deep nested dependencies
- Methods doing too many things (no single responsibility)
- Tight coupling to framework internals
- → Record to `untestable-report.md`, do NOT generate tests

#### 4.2 Handling Grade B (PowerMock Option)

For Grade B classes, use **AskUserQuestion**:

**Question**: "Class `<ClassName>` has tight coupling (e.g., static calls, `new` in methods). How should I handle it?"
**Options**:
1. **"Refactor first (Recommended)"** — Extract interfaces, introduce DI. Then re-run khufu-ut for standard tests.
2. **"Use PowerMock/Mockito-inline"** — Generate tests with advanced mocking. Tests will be marked `@Tag("fragile")` and excluded from CI by default.

If user chooses option 2, generate tests with:
- Java: `MockedStatic` (Mockito), `@PrepareForTest` (PowerMock), `@Tag("fragile")`
- Python: `unittest.mock.patch.object` on class/static methods, `pytest.mark.fragile`
- TypeScript: `jest.spyOn` on static methods with `// @tag: fragile` comment
- Go: manual interface extraction + `//go:build fragile` build tag
- C#: Moq with `[Trait("Category", "Fragile")]`

#### 4.3 Handling Grade C (Untestable)

Generate `untestable-report.md`:

```markdown
# Untestable Code Report

Generated by khufu-ut v0.2.0 on <date>

| File | Class/Method | Problem | Recommendation |
|------|-------------|---------|----------------|
| OrderService.java | calculateTotal() | Direct `new PaymentGateway()` | Extract PaymentGateway interface, use DI |
| ReportGenerator.java | generate() | Static call chain: `Db.connect().query()` | Introduce Repository interface |
```

### Step 5: Generate Unit Tests

#### 5.0 Parallel Execution (Large Systems)

For large or complex systems, writing tests sequentially is time-consuming. Before generating tests, evaluate whether parallel sub-agent execution is appropriate.

**Read `_shared/parallel-execution.md`** and follow its workflow:

1. **Count target files/scenarios**: If the total number of test files to generate is **>= 3**, parallel execution is warranted.

2. **Detect sub-agent support**: Check if the host agent (Claude Code, OpenCode, etc.) supports the `Agent` tool for spawning sub-agents.

3. **If sub-agent supported AND target count >= 3**:
   - **Partition work** following `_shared/parallel-execution.md` Phase 2:
     - **Code-based**: Group source files by module/package (e.g., `src/users/`, `src/orders/`, `src/products/`). Within large modules (>5 files), split further by file.
     - **Spec-based**: Group scenarios by feature/domain (e.g., User Registration, Authentication, Profile).
   - **Ensure independence**: Verify partitions don't share mutable dependencies. If `UserService` and `OrderService` both depend on `PaymentGateway`, merge their partitions.
   - **Launch parallel sub-agents** in a single message (all concurrent), each receiving a self-contained prompt with:
     - Assigned source files or spec scenarios
     - Language, framework, and mocking library (from Steps 1.3, 1.4)
     - Test directory (from Step 1.5)
     - Evaluation criteria (from Step 2)
     - Testability grades for assigned files (from Step 4)
     - Annotation format (from Step 6 below)
     - Instructions to read source, generate tests per Steps 5.1-5.2 guidelines, and write test files
   - **Collect results**: After all sub-agents complete, merge their summaries (files created, test counts, issues).
   - **Handle failures**: If any sub-agent fails, generate remaining tests for that partition sequentially.
   - **Skip Steps 5.1-5.2** (sub-agents already performed generation). Proceed to Step 6.

4. **If sub-agent NOT supported**: Fall through to Steps 5.1-5.2 for sequential generation.

5. **If target count < 3**: Skip parallel execution (overhead > benefit). Fall through to Steps 5.1-5.2.

#### 5.1 SPEC-BASED Generation:

1. Read the spec document(s) at the given path.
2. Parse test scenarios — look for:
   - Markdown sections: `### <test-id>: <test-name>`, `**Scenario:**`, `**Given**`/`**When**`/`**Then**`
   - Gherkin: `Feature:`, `Scenario:`, `Given`, `When`, `Then`
   - YAML/JSON: structured test case definitions
3. For each scenario with `status: planned`, generate a test method that:
   - Has a descriptive name following `should<ExpectedBehavior>_when<Condition>` pattern
   - Follows AAA (Arrange-Act-Assert) structure
   - Tests exactly one behavior
   - Includes spec reference comment: `// Spec: <spec-id> | Evaluates: <dimension>`
4. Also generate tests for edge cases and error conditions implied by the spec.
5. If the spec has Evaluation Criteria, ensure each test maps to at least one criterion.

#### 5.2 CODE-BASED Generation:

1. **Prioritize untested files**: Use **Glob** to find existing test files. Cross-reference to identify source files without corresponding tests. Prioritize these first.
2. **Read each source file**: Use **Read** to understand:
   - Public functions/methods (the unit's public API)
   - Method signatures (parameters, return types, exceptions)
   - Internal branching logic (if/else, switch, loops, early returns)
   - Dependencies (constructor injection, imports, function parameters)
3. **Skip trivial code**: Do not generate tests for:
   - Simple getters/setters without logic
   - DTOs/POJOs with only fields, no behavior
   - Generated code (look for `@Generated`, `auto-generated` comments, or `.g.` / `.gen.` file patterns)
4. For each public method, generate tests covering:
   - **Happy path**: Normal input → expected output
   - **Null/undefined** parameters (if language supports it)
   - **Empty collections**: empty list, empty string, empty map
   - **Boundary values**: zero, negative numbers, max/min values, off-by-one
   - **Error paths**: exceptions thrown, error return codes
   - **State transitions**: for stateful objects, test all valid and invalid transitions
5. For each test, ensure it:
   - Has a clear, descriptive name following `should<Expected>_when<Condition>`
   - Arranges test data and mocks
   - Acts by calling the method under test
   - Asserts the expected result(s)
   - Is independent of other tests (no shared mutable state)
   - Includes spec + evaluation annotation (see Step 6 below)
6. **Mock external dependencies**: Use the framework selected in Step 1.

### Step 6: Annotate Tests with Spec and Evaluation References

Every generated test must carry these annotations:

```typescript
/**
 * Spec: specs/<feature>/spec.v<N>.md  (or "[code-based]" if retroactively generated)
 * Spec ID: UT-<ENTITY>-<NNN>
 * Evaluates: <Dimension> — <specific criterion>
 * Tags: [fragile]  (if applicable)
 */
```

For Java:
```java
@Tag("ut")
@Tag("fragile")  // if applicable
@DisplayName("UT-USER-001: shouldCreateUser_whenValidInputGiven")
// Spec: specs/UserRegistration/spec.v1.md
// Evaluates: Correctness — 正常输入返回 User
@Test
void shouldCreateUser_whenValidInputGiven() { ... }
```

### Step 7: Configure Code Coverage

**Read `_shared/coverage-config.md`** with `layer: ut`. Follow its workflow to:
1. Check `khufu.yaml` coverage.ut settings
2. Configure the coverage tool for the selected language/framework
3. Set thresholds (default: 80% line, 70% branch)
4. Configure exclusions
5. Generate coverage run command

### Step 8: Generate Spec File

**If spec system is enabled** (`spec.enabled: true` in khufu.yaml):

- **Spec-based mode**: Update the spec file — mark generated tests as `status: implemented`, populate test file paths.
- **Code-based mode**: Generate `specs/<feature>/spec.v1.md` from the generated tests (retroactive specification with `Source: code-based` and `[inferred]` evaluation criteria).

See the spec template in `_shared/evaluation-framework.md` for the format.

### Step 9: Write Tests to Files

1. Use **Write** to create each test file in the correct directory.
2. Include necessary imports for the test framework and mocking library.
3. Group related tests in a describe/test class structure appropriate for the language.
4. Add file-level header comment with spec references.
5. Write tests using the selected framework's syntax and conventions.

### Step 10: Report Summary

**Read `_shared/report-template.md`** and generate a report using the UT-specific sections:
- Summary table
- Testability Assessment table (Grade A/B/C breakdown)
- Fragile test count and CI exclusion note
- Coverage configuration
- Evaluation Results (if EDD enabled)
- Spec Coverage (if spec system enabled)
- Files created list
- Next steps

## Language-Specific Templates

### Java / JUnit 5
```java
package com.example;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock private UserRepository repository;
    private UserService service;

    @Test
    @Tag("ut")
    @DisplayName("UT-USER-001: shouldReturnUser_whenValidIdGiven")
    // Spec: specs/UserRegistration/spec.v1.md
    // Evaluates: Correctness — 正常输入返回 User
    void shouldReturnUser_whenValidIdGiven() {
        // Arrange
        // Act
        // Assert
    }
}
```

### Python / pytest
```python
import pytest
from unittest.mock import Mock

class TestUserService:
    # Spec: specs/UserRegistration/spec.v1.md
    # Spec ID: UT-USER-001
    # Evaluates: Correctness — 正常输入返回 User
    def test_should_return_user_when_valid_id_given(self):
        # Arrange
        # Act
        # Assert
        pass
```

### TypeScript / Jest
```typescript
import { describe, it, expect, jest } from '@jest/globals';

describe('UserService', () => {
  /**
   * Spec: specs/UserRegistration/spec.v1.md
   * Spec ID: UT-USER-001
   * Evaluates: Correctness — 正常输入返回 User
   */
  it('should return user when valid id given', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Best Practices

- One assertion per test conceptually (one logical behavior verified)
- Tests must be independent — no ordering dependencies
- Use descriptive test names that read like sentences
- Never test private methods directly (test through public API)
- Keep tests DRY but not at the expense of readability
- Use setup/teardown for shared fixtures, not between-test state
- Every test must serve at least one evaluation criterion (EDD principle)
- Run `khufu-ut` frequently — after every significant code change
