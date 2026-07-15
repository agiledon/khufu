---
name: khufu-ut
description: >-
  This skill should be used when the user wants to generate unit tests, asks for "unit tests", mentions "单元测试", "khufu-ut", or wants to write tests at the base of the test pyramid. Supports spec-based generation (with @path to spec documents) and code-based generation (from existing implementations). Unit tests verify individual functions and methods in isolation with all dependencies mocked.
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

### Step 1.5: Verify Source Compilation (Pre-Generation)

**Read `_shared/compilation-verification.md` Phase 0** and follow its workflow:

1. **Determine the build command** for the detected language and build system.
2. **Run source compilation** using **Bash** to verify the target project compiles BEFORE generating tests.
3. **If compilation FAILS**:
   - Categorize the errors (missing dependencies, build config, source code errors, missing tools).
   - **Report the diagnosis to the user** with specific, actionable fix suggestions.
   - **DO NOT proceed** with test generation — generated tests would also fail to compile.
   - Exit gracefully after providing the diagnosis and fix suggestions.
4. **If compilation SUCCEEDS**: log confirmation and continue to Step 2.

**Key rule**: A project that doesn't compile cannot have meaningful tests generated for it. Always verify compilation first.

### Step 2: EDD — Define Evaluation Criteria

**Read `_shared/evaluation-framework.md`** and follow its EDD workflow:

1. **Define evaluation criteria BEFORE generating tests.** Based on the UT layer, select applicable dimensions:
   - **Correctness** (required): behavior correctness for all public methods
   - **Coverage** (required): line ≥ 80%, branch ≥ 70%, function ≥ 80%
   - **Performance** (required): each test < 100ms
   - **Maintainability** (required): naming conventions, test independence, fragile ratio ≤ 20%

2. If in **spec-based mode**: populate the `## Evaluation Criteria` section of the spec file with quantified criteria.
3. If in **code-based mode**: define criteria in-memory (they will be written to the retroactively-generated spec later).

### Step 3: Dedup Checks

#### 3.0 Spec Doc Scan (Pre-Generation Dedup — Execution Records)

**Read `_shared/spec-doc-scanner.md`** and follow its workflow to scan `docs/khufu/` execution record specs:

1. **Glob for ALL UT spec docs**: `docs/khufu/ut/*-ut-test-cases.md` (all dates, not just today)
2. **Parse every spec doc** — extract Test Class, Test Method, Target Class, Target Method, Status from ALL rows in every Test Cases table
3. **Build a comprehensive skip list** of all already-tested target classes and methods (across ALL dates)
4. **Cross-reference with source code** to produce a Coverage Gap Analysis — identify which source files/methods are NOT yet covered
5. Hold this skip list for merging with spec-sync results in Step 3.2

**If no spec docs exist** (first ever run): return empty skip list and proceed normally.

#### 3.1 Pyramid Dedup (Cross-Layer)

**Read `_shared/test-pyramid-strategy.md`.** As the base layer, UT has no lower layers to check against. However, note:
- UT OWNS business logic verification — IT/API/E2E should not duplicate these checks
- In the generated test comments, mark which risk dimensions the test covers (see Step 6 annotation format)

#### 3.2 Spec Sync — Incremental Check (Cross-Run)

**Read `_shared/spec-sync.md`.** Follow its workflow to build a skip list from planning specs and file fallback. Merge with the spec-doc-scanner skip list from Step 3.0.

#### 3.3 Early Exit Gate — Fully Covered

**After merging skip lists**, compare the merged coverage against ALL source files in the project:

- **If ALL source files are fully covered** (every public method has at least one test in the skip list):
  → **Exit immediately** with the message:
  ```
  ✓ All code is already covered by existing unit tests. No new tests needed.
    - <N> spec docs scanned across <M> dates
    - <X> source files, <Y> methods — all covered
    To regenerate tests, delete the relevant spec docs or test files first.
  ```
  Do NOT proceed to Step 4 or beyond.

- **If some files/methods are NOT covered**:
  → Continue to Step 4. Use the Coverage Gap Analysis to focus generation ONLY on uncovered methods. Skip source files that are already fully covered.

### Step 4: Module Discovery & Testability Assessment

**Purpose**: Discover ALL modules in the project, then assess source file testability at module granularity. This ensures no module is overlooked, regardless of its size.

#### 4.0 Module Discovery (Multi-Module Projects)

**BEFORE touching individual files**, enumerate the full module/packaging structure. This is the critical step that prevents the agent from focusing only on the largest or most prominent modules.

1. **Read the build/project descriptor** to extract the module list:

   | Build System | File to Read | What to Extract |
   |-------------|-------------|-----------------|
   | Maven | `pom.xml` | `<modules>` list |
   | Gradle | `settings.gradle` or `settings.gradle.kts` | `include` / `includeFlat` directives |
   | Go workspace | `go.work` | `use` directives |
   | npm/pnpm/yarn workspaces | `package.json` | `workspaces` array |
   | Nx | `nx.json` | project entries |
   | Turborepo | `turbo.json` + `package.json` workspaces |
   | xmake | `xmake.lua` | `target()` definitions and `includes()` for subdirs |
| CMake | `CMakeLists.txt` | `add_subdirectory()` calls |
| SBT (Scala) | `build.sbt` | sub-project definitions |

2. **For each module, record**:
   - Module name and source directory (e.g., `roncoo-pay-service` → `roncoo-pay-service/src/main/java/`)
   - Number of source files (via Glob count — do NOT read the files yet)
   - Whether test files already exist and how many
   - **Cross-reference with the skip list from Step 3.2**: Count how many source files in this module are already covered by existing tests (from spec or file fallback)

3. **Build a module inventory table** (include skip counts):

   ```markdown
   | Module | Source Files | Already Covered | Needs Tests | Priority |
   |--------|-------------|-----------------|-------------|----------|
   | roncoo-pay-service | 261 | 4 | 257 | HIGH |
   | roncoo-pay-web-boss | 31 | 0 | 31 | MEDIUM |
   | roncoo-pay-common-core | 24 | 6 | 18 | MEDIUM |
   | roncoo-pay-app-reconciliation | 14 | 0 | 14 | LOW |
   | ... | ... | ... | ... | ... |
   ```

   - **If "Needs Tests" = 0 for a module**, mark it as **SKIP — fully covered** and exclude it from generation.
   - Priority is based on "Needs Tests" count and business criticality.

4. **Single-module fallback**: If no multi-module build file is found, infer the module structure from top-level source directories (e.g., `src/main/java/`). Treat it as a single module and proceed.

#### 4.1 Scale Assessment — Parallel vs Sequential

Count the total **modules**. Choose strategy:

| Modules | Strategy |
|---------|----------|
| 1-2 | **Sequential per module** — single agent processes all files. Use sampling (4.2). |
| >= 3 | **Parallel by module** — if Agent tool available. Otherwise fall back to sequential. |

##### 4.1.1 Parallel Execution (Modules >= 3 AND Agent Tool Available)

**Read `_shared/parallel-execution.md`**. Then partition modules across sub-agents:

1. **Assign modules to sub-agents** using these heuristics:
   - **Skip fully-covered modules**: Modules with "Needs Tests" = 0 in the inventory are excluded. Note them in the skip list but don't assign them.
   - Modules with >50 "Needs Tests" source files → dedicated sub-agent (alone)
   - Modules with 20-50 "Needs Tests" source files → 1-2 modules per sub-agent
   - Modules with <20 "Needs Tests" source files → 2-4 modules per sub-agent (group by domain)

2. **Ensure comprehensive coverage**: Every module with "Needs Tests" > 0 MUST be assigned to exactly one sub-agent. Explicitly list which modules each sub-agent is responsible for. Also list modules that were skipped (already fully covered).

3. **Launch all sub-agents concurrently** in a single message. Each sub-agent receives a self-contained prompt with:

   ```
   You are assessing testability and generating unit tests for the following modules:

   **Modules assigned**: <module-names with source directories>

   **Skip list** (DO NOT generate tests for these — they already exist):
   <per-module list of source files that already have tests, from Step 3.2>

   **Context**:
   - Language: <language> | Framework: <framework> | Mocking: <mocking-lib>
   - Test output directory: <test-dir>
   - Evaluation criteria: <summary from Step 2>
   - The testability grading rubric is: [Grade A/B/C definitions from 4.2-4.4 below]
   - Annotation format: [exact format from Step 6]
   - Coverage thresholds: line ≥ 80%, branch ≥ 70% (from khufu.yaml or defaults)

   **Your task** (for EACH assigned module, in order):
   a. Glob for all .java files in the module's source directory
   b. **Filter out files in the skip list** — do NOT read or generate tests for them
   c. **Sample 2-3 remaining files** to classify the module's overall testability grade (A/B/C)
   d. FOR Grade A and Grade B modules: read every non-skipped source file, generate unit tests
      following Step 5 guidelines (AAA pattern, happy path, edge cases, error paths)
   e. FOR Grade B classes: default to tagging `@Tag("fragile")` / `pytest.mark.fragile`.
      Do NOT ask the user interactively — proceed with the fragile tagging approach.
   f. FOR Grade C classes/files: record them in a per-module untestable report snippet
   g. Write all test files to the configured test output directory
   h. Report a summary: module name, files processed, files skipped (separate into
      "already covered" and "Grade C untestable"), tests generated (count),
      fragile test count, untestable file list

   **CRITICAL**: You MUST report back for every module you were assigned, even if
   you generated zero tests for that module. Say "Module X: 0 tests generated because
   [all files already covered / all files were Grade C / only config classes / etc.]".
   ```

4. **Collect and cross-check results**: After all sub-agents complete:
   - Compare reported modules against the inventory table from 4.0
   - **If any module is missing from the results**, that module was dropped — process it sequentially now
   - Merge per-module reports into a unified summary
   - Proceed to **Step 6** (sub-agents already performed Steps 5.1-5.2 for their modules)

5. **Handle sub-agent failures**: If a sub-agent completely fails (no result returned), process all of its assigned modules sequentially.

##### 4.1.2 Sequential Fallback (Modules < 3 OR Agent Tool Unavailable)

Proceed to 4.2 for file-level discovery with sampling.

#### 4.2 File-Level Discovery with Sampling (Sequential Path)

When processing sequentially, use **sampling** to keep the assessment manageable. Do NOT attempt to read every source file — this is the primary cause of module omission.

1. **Glob for source files** in the target source directory, excluding `target/`, `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`, `__pycache__/`.

2. **Group files by package/namespace** (for Java: the package directory; for others: the immediate parent directory).

3. **For each package group, sample 2-3 representative files** — pick files with different roles:
   - A service/business-logic class (heaviest logic)
   - A simple utility or helper class
   - A controller/handler or data-access class

4. **Read the sampled files and classify the GROUP** (not individual files):

   **Grade A — Directly Testable:**
   - Dominant pattern: dependency injection (constructor/setter), depends on interfaces, pure methods
   - → Generate standard unit tests with conventional mocking (Mockito/Jest/pytest-mock)

   **Grade B — Needs PowerMock / Advanced Mocking:**
   - Dominant pattern: calls static methods, `new` inside method body, final classes
   - → Default to fragile-tagged tests (see 4.3). Do NOT ask the user per-class in sequential mode — batch the decision.

   **Grade C — Requires Refactoring:**
   - Dominant pattern: no interfaces, global state, framework-internal tight coupling, methods with multiple responsibilities
   - → Record to `untestable-report.md`, do NOT generate tests

5. **Extrapolate**: If 2/3 sampled files are Grade A, treat the package as Grade A. If mixed (1 A + 1 B + 1 C), read 2 more files to break the tie. Erring on the lower grade is safer.

6. **Log the sampling**: In the report, note: "Package X: sampled 3 of 15 files (A: 2, B: 1). Extrapolated as Grade A with moderate confidence."

#### 4.3 Handling Grade B (PowerMock Option)

**In parallel mode**: Sub-agents default to fragile-tagged tests without prompting the user (interactive prompts don't work across sub-agents).

**In sequential mode**: Use a single **AskUserQuestion** for ALL Grade B classes at once:

**Question**: "Found <N> classes with tight coupling (static calls, `new` in methods): `<list-of-classes>`. How should I handle them?"
**Options**:
1. **"Generate with fragile tags"** — Mark them `@Tag("fragile")` / `pytest.mark.fragile`. Excluded from CI by default. Run on weekly schedule.
2. **"Skip for now, I'll refactor first"** — Record to `untestable-report.md` with refactoring recommendations.

If the user chooses option 1, generate tests with:
- Java: `MockedStatic` (Mockito), `@PrepareForTest` (PowerMock), `@Tag("fragile")`
- Python: `unittest.mock.patch.object` on class/static methods, `pytest.mark.fragile`
- TypeScript: `jest.spyOn` on static methods with `// @tag: fragile` comment
- Go: manual interface extraction + `//go:build fragile` build tag
- C++: GMock `MOCK_METHOD` for interface mocking, `// @tag: fragile` comment for tightly coupled code
- C#: Moq with `[Trait("Category", "Fragile")]`

#### 4.4 Handling Grade C (Untestable)

Generate `untestable-report.md`:

```markdown
# Untestable Code Report

Generated by khufu-ut v0.3.0 on <date>

Module coverage: <N> of <M> modules assessed

| Module | File | Class/Method | Problem | Recommendation |
|--------|------|-------------|---------|----------------|
| roncoo-pay-web-boss | ShiroConfig.java | — | Pure framework config, no business logic | Skip; config classes not unit-testable |
| roncoo-pay-service | OrderService.java | calculateTotal() | Direct `new PaymentGateway()` | Extract PaymentGateway interface, use DI |
```

### Step 5: Generate Unit Tests

#### 5.0 Parallel Execution Gate

**Check Step 4 outcome**: If Step 4.1.1 already launched parallel sub-agents (multi-module project, >= 3 modules, Agent available), those sub-agents already generated the tests. **Skip to Step 6**.

**Otherwise** (sequential path from Step 4.1.2): Evaluate whether to use parallel execution for the generation phase itself:

1. **Count remaining test targets** (files/spec scenarios classified as Grade A or B in Step 4.2).

2. **If target count >= 3 AND Agent tool available**: Follow `_shared/parallel-execution.md` to partition the remaining work by package/module and launch parallel sub-agents. Skip Steps 5.1-5.2.

3. **If target count < 3 OR Agent unavailable**: Proceed to Steps 5.1-5.2 for sequential generation.

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

### Step 10: Verify Test Compilation & Execution

**These are mandatory quality gates** before reporting. Tests that don't compile or can't run are not useful.

#### 10-A: Verify Test Compilation

**Read `_shared/compilation-verification.md` Phase 1** and follow its workflow:

1. **Run the test compilation command** for the language and framework.
2. **If test compilation FAILS**:
   - Categorize errors (missing imports, wrong API usage, missing test deps, directory mismatch).
   - **Auto-fix** fixable errors (missing imports, minor API corrections) — up to 3 retries.
   - **Report unfixable errors** with specific diagnosis and fix suggestions.
3. **If test compilation SUCCEEDS**: log confirmation and proceed to test execution.

#### 10-B: Verify Test Execution

**Read `_shared/test-execution-verification.md`** and follow its workflow:

1. **Check runtime prerequisites**: test runner available, framework config exists, test file naming conventions match.
2. **Run a dry-run smoke test** with a single simple test to verify the framework is correctly configured.
3. **If the dry-run fails with a RUNTIME error** (not assertion failure):
   - Diagnose: framework config? missing runtime deps? naming convention mismatch?
   - Fix configuration issues automatically where possible.
   - Report unfixable issues with actionable suggestions.
4. **Run all generated tests** and capture results.
5. **Categorize results**:
   - ✅ **Passed** — test assertions passed
   - ❌ **Failed (assertion)** — test ran but assertion failed (acceptable: the test is working, pointing to a bug or wrong expectation)
   - 💥 **Runtime Error** — test could not execute (NOT acceptable: needs fixing)
6. **Report the execution summary**, clearly distinguishing assertion failures (test logic) from runtime errors (config/infra).

### Step 11: Generate Spec Documentation (SDD)

**Read `_shared/spec-doc-generator.md`** and follow its workflow to produce the execution record spec document.

**MANDATORY — Before any file operations**, ensure the base directory and current layer's subdirectory exist:

```bash
mkdir -p docs/khufu/ut
```

> Only create the `ut/` subdirectory — do NOT create subdirectories for other test types (it/, api/, e2e/). Other types will create their own when they run.

1. **Collect data** from Steps 9 (test execution) and 10 (coverage):
   - Module inventory: all modules and their test files generated
   - Test execution results: pass/fail/skip per module
   - Coverage data: overall line/branch/function coverage + per-module
   - Framework info: test framework + version, coverage tool + version
   - Test case details grouped by module: Test Class, Target Class, Target Method(s), Status

2. **Determine the spec doc path**:
   - Read `khufu.yaml` → `spec.docsDirectory` (default: `docs/khufu/`)
   - Path: `docs/khufu/ut/<YYYY-MM-DD>-ut-test-cases.md`

3. **Build the spec doc** following the template (Step 4 in `_shared/spec-doc-generator.md`):
   - Metadata block (Layer, Version, Generated by, Date, Source)
   - **Summary** table: Modules processed, Modules with tests, Total test files, Newly generated, Pre-existing
   - **Module Summary** table: per-module status (✅ Compiles / ⚠️ errors) with notes
   - **Test Cases** grouped by module (`### <module-name>` subsections), each with Test Class / Target Class / Target Method(s) / Status table
   - **Coverage Statistics**: Target vs Status
   - **Known Issues**: numbered list with actionable fix suggestions

4. **Check for existing spec doc** (same date + same layer):
   - **If exists**: Read → increment `**Version**` in metadata → **APPEND** new test cases within each module's subsection → recalculate Summary and Module Summary → update Coverage and Known Issues
   - **If not exists**: Create with `**Version**: 1`

5. **Write the spec doc** using **Write**.

6. **Update the wizard file** `docs/khufu/test-cases.md`:
   - If exists: Read → increment `**Version**` → update/insert row for today's UT generation
   - If not exists: Create with `**Version**: 1`

### Step 12: Report Summary

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

### C++ / Google Test
```cpp
#include <gtest/gtest.h>
#include <gmock/gmock.h>

using ::testing::Return;

class MockUserRepository : public UserRepository {
public:
    MOCK_METHOD(User, findById, (int id), (override));
};

// Spec: specs/UserRegistration/spec.v1.md
// Spec ID: UT-USER-001
// Evaluates: Correctness — 正常输入返回 User
TEST(UserServiceTest, ShouldReturnUserWhenValidIdGiven) {
    // Arrange
    MockUserRepository mockRepo;
    User expectedUser{1, "test@example.com"};
    EXPECT_CALL(mockRepo, findById(1))
        .WillOnce(Return(expectedUser));

    UserService service(&mockRepo);

    // Act
    User result = service.getUser(1);

    // Assert
    EXPECT_EQ(result.getId(), 1);
    EXPECT_EQ(result.getEmail(), "test@example.com");
}
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
