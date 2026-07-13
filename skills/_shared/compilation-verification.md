# Compilation Verification

Shared module for verifying that both target source code and generated test code can compile. This is a **mandatory quality gate** — tests that don't compile are useless regardless of their logic.

## Core Principle

> **Compilation is the zeroth test.** Before any test logic matters, the code must compile. Generated tests that fail to compile indicate either a problem with the test code (fixable by the skill), a problem with the target source (reported to user), or a missing dependency (reported with install instructions).

## Two-Phase Verification

```
Phase 0 (Pre-Generation):  Verify target source compiles
    ↓
Generate Tests (per layer skill workflow)
    ↓
Phase 1 (Post-Generation): Verify generated tests compile
    ↓
Fix & Retry (up to 3 attempts)
    ↓
Report (success with summary, or failure with diagnosis)
```

---

## Phase 0: Pre-Generation Source Verification

**Run BEFORE generating any tests.** If the target source doesn't compile, generated tests that reference it will also fail — wasting effort.

### Step 0.1: Determine Build Command

Based on the detected language and build system:

| Language | Build System | Compile Command | Test Compile Command |
|----------|-------------|-----------------|---------------------|
| Java | Maven | `mvn compile -q` | `mvn test-compile -q` |
| Java | Gradle | `./gradlew compileJava -q` | `./gradlew compileTestJava -q` |
| Python | — | `python -m py_compile <files>` or `python -c "import <module>"` | (same — Python is interpreted) |
| TypeScript | npm/tsc | `npx tsc --noEmit` | `npx tsc --noEmit` (covers tests too) |
| JavaScript | npm | `node -c <files>` | `node -c <files>` |
| Go | go modules | `go build ./...` | `go vet ./...` |
| C# | .NET SDK | `dotnet build` | `dotnet build` (tests are separate project) |
| C++ | xmake | `xmake build` | `xmake build --all` |
| C++ | CMake | `cmake --build build` | `cmake --build build` |
| Rust | Cargo | `cargo check` | `cargo test --no-run` |

### Step 0.2: Run Compilation

Run the compile command using **Bash**. Capture both stdout and stderr.

### Step 0.3: Handle Compilation Results

**If compilation SUCCEEDS:**
- Log: `✓ Source compilation passed. Proceeding with test generation.`
- Continue to the skill's test generation workflow.

**If compilation FAILS:**
- Do NOT proceed with test generation. Report to user with diagnosis.
- Categorize errors and give specific suggestions:

#### Common Error Categories & Suggestions

**1. Missing Dependencies (most common in brownfield projects)**

Symptoms: `package X does not exist`, `Cannot find module 'Y'`, `ModuleNotFoundError: No module named 'Z'`, `could not import W`

```
⚠ Source compilation failed: MISSING DEPENDENCIES

The following dependencies are missing:
  - Package "org.springframework.boot:spring-boot-starter-web" not found
  - Module "express" not installed

Suggested fix:
  1. For Java/Maven:  mvn dependency:resolve
  2. For Java/Gradle: ./gradlew dependencies
  3. For npm/Node:    npm install
  4. For Python:      pip install -r requirements.txt
  5. For Go:          go mod download
  6. For .NET:        dotnet restore

After installing dependencies, re-run this skill to generate tests.
```

**2. Build Configuration Issues**

Symptoms: `plugin not found`, `Could not resolve all files`, `Unable to load build file`

```
⚠ Source compilation failed: BUILD CONFIGURATION ISSUE

The build system reported configuration errors:
  <paste key error lines>

Suggestions:
  - Check that build files (pom.xml, build.gradle, etc.) are valid
  - Verify plugin versions and repositories are accessible
  - For Gradle: check gradle-wrapper.properties for correct distribution URL
  - For Maven: check ~/.m2/settings.xml for repository configuration
```

**3. Source Code Errors**

Symptoms: `cannot find symbol`, `Type 'X' is not assignable to type 'Y'`, `NameError`, `undefined: X`

```
⚠ Source compilation failed: SOURCE CODE ERRORS

The target source code has compilation errors:

  <file:line> - <error message>
  <file:line> - <error message>

These are NOT issues with your test setup. Fix these source errors first, then re-run this skill.

Common causes:
  - Incomplete refactoring (renamed class but callers not updated)
  - Missing implementation (method signature exists, body missing)
  - Type mismatches (wrong type imported or used)
```

**4. Missing Build Tools**

Symptoms: `mvn: command not found`, `tsc: command not found`, `dotnet: command not found`

```
⚠ Source compilation failed: BUILD TOOL NOT FOUND

The build tool "<tool>" is not available in the current environment.

To fix:
  - Java/Maven:  Install Maven (brew install maven, apt install maven)
  - Java/Gradle:  Use the Gradle wrapper (./gradlew) or install Gradle
  - TypeScript:   npm install -g typescript or use npx tsc
  - Go:           Install Go (brew install go, apt install golang)
  - .NET:         Install .NET SDK (https://dotnet.microsoft.com/download)

Alternatively, run this skill in a properly configured CI/dev environment.
```

### Step 0.4: Decision Gate

```
Source compiles?
├── YES → Continue to test generation
└── NO
    ├── Dependency issue with clear fix → Report fix, suggest user runs fix and re-runs skill
    ├── Configuration issue → Report issue, suggest manual fix
    ├── Source code error → List errors, tell user to fix first
    └── Build tool missing → Report missing tool, suggest install
```

**CRITICAL**: When source compilation fails, the skill MUST NOT attempt to generate tests. Report the diagnosis clearly and exit gracefully.

---

## Phase 1: Post-Generation Test Compilation

**Run AFTER generating tests.** This verifies that the generated test code itself compiles and integrates correctly with the target project.

### Step 1.1: Run Test Compilation

Run the test-specific compilation command for the language:

| Language | Test Compile Command |
|----------|---------------------|
| Java (Maven) | `mvn test-compile -q` |
| Java (Gradle) | `./gradlew compileTestJava -q` |
| TypeScript | `npx tsc --noEmit` |
| Python | `python -m py_compile <test-file>` per generated file |
| Go | `go vet <package>/...` |
| C# | `dotnet build <TestProject>.csproj` |
| C++ (xmake) | `xmake build --all` |
| C++ (CMake) | `cmake --build build` |

### Step 1.2: Analyze Test Compilation Errors

**If test compilation SUCCEEDS:**
- Log: `✓ Generated tests compile successfully.`
- Proceed to test execution verification (`_shared/test-execution-verification.md`).

**If test compilation FAILS:**

Categorize errors and attempt automatic fix (up to 3 retries):

#### Error Pattern 1: Missing Import in Test File

```
Error: cannot find symbol — class Mock
Fix: Add import static org.mockito.Mockito.*; to the test file

Error: Cannot find name 'describe'
Fix: Add import { describe, it, expect } from 'vitest'; to the test file

Error: NameError: name 'pytest' is not defined
Fix: Add import pytest to the test file
```

**Action**: Edit the generated test file to add the missing import. Recompile.

#### Error Pattern 2: Wrong Framework API Usage

```
Error: method when() not found (using older Mockito version)
Fix: Use Mockito 5.x API: when(…) instead of doReturn(…)

Error: Property 'toBeTruthy' does not exist
Fix: Check if using Jest matchers vs Vitest matchers
```

**Action**: If the API mismatch is simple, fix it. If complex, report to user.

#### Error Pattern 3: Missing Test Dependencies (build file)

```
Error: package org.junit.jupiter does not exist
Fix: Add JUnit 5 dependency to pom.xml / build.gradle

Error: Cannot find module 'vitest'
Fix: npm install --save-dev vitest
```

**Action**: 
1. Read the build file (pom.xml, build.gradle, package.json, etc.)
2. Check if the test dependency is declared
3. If NOT declared: add it to the build file with the correct version
4. If declared but different version: note the mismatch, suggest version update
5. If dependency resolution failed: suggest re-running the dependency install

#### Error Pattern 4: Package/Directory Structure Mismatch

```
Error: package com.example does not exist (test is in wrong directory)
Fix: Move test file from src/test/java/wrong/package/ to src/test/java/com/example/

Error: TS6054: File is not under 'rootDir'
Fix: Ensure test file is under the project root
```

**Action**: Move the generated test file to the correct directory based on package declaration or module structure.

### Step 1.3: Auto-Fix Loop

```
attempt = 0
while test compilation fails AND attempt < 3:
    classify errors
    if all errors match known fixable patterns:
        apply fixes
        attempt += 1
        recompile
    else:
        break (unfixable errors → report to user)
```

### Step 1.4: Compilation Result Report

**After successful fix:**
```
✓ Generated tests compile after <N> auto-fixes:
  - Added missing import: import { describe } from 'vitest'
  - Added missing dependency: vitest to devDependencies in package.json
```

**If unfixable errors remain:**
```
⚠ Generated tests have compilation errors that could not be auto-fixed:

  <file:line> - <error>
  <file:line> - <error>

Manual intervention needed:
  1. <specific suggestion for each error>
  2. <specific suggestion for each error>

After fixing these issues, run: <test-compile-command>
```

---

## Language-Specific Diagnostics

### Java (Maven)
- Missing dependency → suggest adding to `<dependencies>` in pom.xml with correct scope (`test`)
- Wrong JUnit version → check parent POM's BOM/dependency management
- `-Xlint:unchecked` warnings → note but don't treat as blocking

### Java (Gradle)
- Missing dependency → suggest `testImplementation 'group:artifact:version'`
- Plugin not found → check `plugins {}` block

### TypeScript/JavaScript
- Missing module → suggest `npm install --save-dev <package>`
- Type declarations missing → suggest `npm install --save-dev @types/<package>`
- Path alias not resolving → check `tsconfig.json` `paths` configuration
- `rootDir` issues → suggest adjusting `tsconfig.json`

### Python
- Missing import → suggest `pip install <package>`
- Import errors → check `PYTHONPATH` and project structure
- `conftest.py` missing → suggest creating one with shared fixtures

### Go
- Missing dependency → suggest `go get <package>`
- Package not found → check `go.mod` and module path
- Build tag missing → suggest adding `//go:build integration`

### C# (.NET)
- Missing package → suggest `dotnet add <TestProject> package <PackageName>`
- Project reference missing → suggest `dotnet add <TestProject> reference <SourceProject>`

### C++ (xmake)
- Missing dependency → suggest `add_requires("gtest")` in xmake.lua
- Link error → suggest `add_packages("gtest")` in the target definition
- CMake project detected but xmake expected → suggest `xmake project -k cmake` to generate CMake
- Coverage not enabled → suggest `add_rules("mode.coverage")` in xmake.lua

### C++ (CMake)
- Missing package → suggest `find_package(GTest REQUIRED)` in CMakeLists.txt
- Link error → suggest `target_link_libraries(<test_target> GTest::GTest GTest::GMock)`

---

## Phase 1 Checklist

Before proceeding to test execution verification, confirm:

- [ ] Target source code compiles (verified in Phase 0)
- [ ] Generated test code compiles (verified in Phase 1)
- [ ] All compilation issues are either fixed or documented with suggestions
- [ ] Build file modifications (if any) are reported to user

---

## Return

After this module completes:

- `sourceCompiles`: `true` | `false` (with reason)
- `testsCompile`: `true` | `false` (with reason)
- `compilationDiagnosis`: (if failed) categorized errors with fix suggestions
- `buildFileModifications`: (if any) what was changed and why
- `importsFixed`: (if any) missing imports that were auto-added
- `unresolvedIssues`: (if any) errors that need manual intervention
