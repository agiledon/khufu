---
name: khufu-ut
description: >-
  This skill should be used when the user wants to generate unit tests, asks for "unit tests", mentions "单元测试", "khufu-ut", or wants to write tests at the base of the test pyramid. Supports spec-based generation (with @path to spec documents) and code-based generation (from existing implementations). Unit tests verify individual functions and methods in isolation with all dependencies mocked.
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

# khufu-ut: Unit Test Generator

Generate unit tests — the **base layer** of the test pyramid. Unit tests verify single functions or methods in isolation. They are the fastest, most numerous, and most granular tests in your suite.

## Core Principles

- **Isolation**: Each test verifies ONE unit (function/method/class) with ALL external dependencies mocked
- **Speed**: Unit tests should run in < 100ms each
- **Coverage**: Focus on public API surface, edge cases, boundary conditions, and error paths
- **TDD**: Follow Red (write failing test) → Green (minimal implementation) → Refactor cycle
- **AAA Pattern**: Arrange (setup) → Act (execute) → Assert (verify)

## Workflow

### Step 1: Determine Generation Mode

**If `$ARGUMENTS` contains a file or directory path** (user provided `@path/to/specs`):
- The user wants **SPEC-BASED** generation
- Read the spec file(s) at the provided path
- Parse: features, scenarios, acceptance criteria, edge cases, error conditions
- Extract test cases from the spec structure

**If `$ARGUMENTS` is empty**:
- Use the **AskUserQuestion** tool to prompt the user:
  - **Question**: "Choose test generation mode:"
  - **Options**:
    1. "Spec-based: I'll provide spec documents" — then ask the user to provide the spec file or folder path
    2. "Code-based: Read existing code to generate tests"

### Step 2: Detect or Confirm Language

1. First, check for `khufu.yaml` in the project root. If it exists, read it to get the configured language.
2. If no config file exists, detect the language by scanning project files:
   - `pom.xml` or `build.gradle` → Java
   - `package.json` + `tsconfig.json` → TypeScript
   - `package.json` (no tsconfig) → JavaScript
   - `pyproject.toml` or `setup.py` → Python
   - `go.mod` → Go
   - `Cargo.toml` → Rust
   - `*.csproj` or `*.sln` → C#
3. Confirm the detected language with the user using **AskUserQuestion**.
4. If not detected, ask the user to select the language.

### Step 3: Select Test Framework

Based on the language, present the top frameworks using **AskUserQuestion**. Include brief explanations so the user can make an informed choice:

**For Java**:
- **JUnit 5** (Recommended): Modern framework with parameterized tests, dynamic tests, extension model. Use for all new projects.
- **JUnit 4**: Legacy but widely used. Supported by many tools but lacks modern features.
- **TestNG**: Advanced test configuration with grouping, parallel execution, data providers.

**For Python**:
- **pytest** (Recommended): Modern, idiomatic Python testing with fixtures, parameterization, rich plugins.
- **unittest**: Standard library. No dependencies but less expressive.

**For TypeScript/JavaScript**:
- **Jest** (Recommended): Popular with snapshot testing, built-in mocking, code coverage. Use ts-jest for TypeScript.
- **Vitest** (Recommended): Fast, Vite-native, Jest-compatible API, native TypeScript.
- **Mocha + Chai**: Flexible and highly customizable. More configuration needed.

**For Go**:
- **testing + testify** (Recommended): Standard library with testify for assertions and mocking.
- **testing (stdlib)**: No external dependencies, pure standard library.

**For C#**:
- **xUnit** (Recommended): Modern .NET framework with excellent extensibility.
- **NUnit**: Mature with rich assertion model.
- **MSTest**: Microsoft official, good VS integration.

**For Rust**:
- **cargo test** (Built-in): The standard Rust test framework. Always use this.

### Step 4: Determine Test Directory

Place tests according to language conventions:

| Language | Unit Test Location |
|----------|-------------------|
| Java (Maven) | `src/test/java/<package>/<SourceClass>Test.java` |
| Java (Gradle) | `src/test/java/<package>/<SourceClass>Test.java` |
| Python | Co-located `test_<module>.py` or in `tests/test_<module>.py` |
| TypeScript/JS (Jest) | `__tests__/<SourceModule>.test.ts` or co-located `<SourceModule>.test.ts` |
| Go | Same package, `<source>_test.go` |
| C# | `<Project>.Tests/<SourceClass>Tests.cs` |
| Rust | Same file in `#[cfg(test)]` module, or `tests/<name>.rs` |

Check `khufu.yaml` for custom directory overrides.

### Step 5: Generate Unit Tests

#### SPEC-BASED Generation:

1. Read the spec document(s) at the given path.
2. Parse test scenarios — look for:
   - Markdown sections: `## Scenario:`, `**Given**`, `**When**`, `**Then**`
   - Gherkin: `Feature:`, `Scenario:`, `Given`, `When`, `Then`
   - YAML/JSON: structured test case definitions
   - Plain text: numbered requirements, expected behaviors
3. For each scenario/requirement, generate a test method that:
   - Has a descriptive test name following `should<ExpectedBehavior>_when<Condition>` pattern
   - Follows AAA (Arrange-Act-Assert) or Given-When-Then structure
   - Tests exactly one behavior
   - Includes a comment or annotation linking back to the spec section
4. Also generate tests for edge cases and error conditions implied by the spec.
5. If the spec includes validation rules, generate a test for each rule.

#### CODE-BASED Generation:

1. **Discover source files**: Use **Glob** to find source files excluding `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`, `target/`, `__pycache__/`.
2. **Prioritize untested files**: Use **Glob** to find existing test files. Cross-reference to identify source files without corresponding tests. Prioritize these first.
3. **Read each source file**: Use **Read** to understand:
   - Public functions/methods (the unit's public API)
   - Method signatures (parameters, return types, exceptions)
   - Internal branching logic (if/else, switch, loops, early returns)
   - Dependencies (constructor injection, imports, function parameters)
4. **Skip trivial code**: Do not generate tests for:
   - Simple getters/setters without logic
   - DTOs/POJOs with only fields, no behavior
   - Generated code (look for `@Generated`, `auto-generated` comments, or `.g.` / `.gen.` file patterns)
5. For each public method, generate tests covering:
   - **Happy path**: Normal input → expected output
   - **Null/undefined** parameters (if language supports it)
   - **Empty collections**: empty list, empty string, empty map
   - **Boundary values**: zero, negative numbers, max/min values, off-by-one
   - **Error paths**: exceptions thrown, error return codes
   - **State transitions**: for stateful objects, test all valid and invalid transitions
6. For each test method, ensure it:
   - Has a clear, descriptive name
   - Arranges test data and mocks
   - Acts by calling the method under test
   - Asserts the expected result(s)
   - Is independent of other tests (no shared mutable state)
7. **Mock external dependencies**: Use the appropriate mocking framework:
   - Java: Mockito (`org.mockito:mockito-core`)
   - Python: `unittest.mock` (stdlib) or `pytest-mock`
   - TypeScript/JS: Jest built-in mocks or Vitest `vi.fn()`
   - Go: testify mocks or manual interface mocks
   - C#: Moq or NSubstitute

### Step 6: Configure Code Coverage

After generating tests, configure the coverage tool for the selected language/test framework. This ensures users can measure how much of their code is exercised by tests.

1. **Check `khufu.yaml`**: Read the `coverage` section for the configured coverage tool and thresholds.

2. **Suggest coverage tool** if not already configured:

| Language | Coverage Tool | How to Run |
|----------|-------------|------------|
| Java | JaCoCo | `mvn verify jacoco:report` or `gradle jacocoTestReport` |
| Python | pytest-cov | `pytest --cov=. --cov-report=html --cov-report=term` |
| TypeScript/JS (Jest) | Istanbul (built-in) | `jest --coverage` |
| TypeScript (Vitest) | v8/istanbul (built-in) | `vitest run --coverage` |
| Go | go test -cover | `go test -coverprofile=coverage.out ./...` |
| C# | coverlet | `dotnet test /p:CollectCoverage=true` |

3. **Configure the build file** to include coverage:

   - **Java (Maven)**: Add the JaCoCo plugin to `pom.xml` with threshold rules (minimum 80% line, 70% branch for UT)
   - **Java (Gradle)**: Add `jacoco` plugin to `build.gradle` with threshold limits
   - **Python**: Add `[tool.coverage]` section to `pyproject.toml` or `.coveragerc` with omit rules and `fail_under` threshold
   - **TypeScript/JS (Jest)**: Add `coverageThreshold` and `collectCoverageFrom` to `jest.config.ts` or `package.json`
   - **TypeScript (Vitest)**: Add `coverage` section to `vitest.config.ts` with provider, thresholds, and exclusions
   - **Go**: Add a `Makefile` target or shell script for `go test -coverprofile`
   - **C#**: Add `coverlet.collector` package reference and `<CollectCoverage>` property to `.csproj`

4. **Set sensible default thresholds**:
   - Unit tests: 80% line coverage, 70% branch coverage
   - Write threshold rules so the build fails if coverage drops below these values

5. **Configure exclusions** (code that should not count toward coverage):
   - DTOs, entities with only getters/setters
   - Configuration classes
   - Generated code
   - Framework boilerplate (e.g., Spring Boot application class, Express app bootstrap)

6. **Generate a coverage run script** or document the command in test output.

### Step 7: Write Tests to Files

1. Use **Write** to create each test file in the correct directory.
2. Include necessary imports for the test framework and mocking library.
3. Group related tests in a describe/test class structure appropriate for the language.
4. Add a file-level comment indicating this was generated by khufu-ut.
5. IMPORTANT: Write tests using the selected framework's syntax and conventions.

### Step 8: Report Summary

After generating tests, report:
- Number of test files created
- Number of test methods generated
- Coverage breakdown (happy path, edge cases, error paths)
- Coverage tool configured and how to run it
- Coverage thresholds set and what they enforce
- Any source files that were skipped and why
- Suggested next command: run the tests with coverage and verify they compile

## Language-Specific Templates

### Java / JUnit 5
```java
package com.example;

import org.junit.jupiter.api.Test;
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
- Run `khufu-ut` frequently — after every significant code change
