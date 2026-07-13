# Spec Sync — Incremental Test Generation

Shared module for preventing duplicate test generation on repeated skill executions. When a user runs `khufu-ut` (or any test layer skill) multiple times, previously generated tests should NOT be regenerated. This module checks existing spec files (both planning specs in `specs/` and execution record specs in `docs/khufu/`) and existing test files to build a "skip list" before generation begins.

## Core Principle

**Never overwrite a test that already exists and is tracked in a spec.** If the user wants to regenerate a test, they should delete the existing test file first.

## Dual-Source Dedup

khufu maintains two complementary spec systems:

| System | Location | Purpose | Format |
|--------|----------|---------|--------|
| **Planning Specs** | `specs/` | Feature-centric — what tests SHOULD exist | `specs/<feature>/spec.v<N>.md` |
| **Execution Record Specs** | `docs/khufu/` | Date-centric — what tests WERE generated | `docs/khufu/<layer>/<YYYY-MM-DD>-<layer>-test-cases.md` |

Both systems are scanned for dedup. See `_shared/spec-doc-scanner.md` for the execution record scanning workflow.

## Workflow

### Phase 0: Scan Execution Record Specs (NEW)

**Read `_shared/spec-doc-scanner.md`** and follow its workflow to scan `docs/khufu/` for already-covered code. This runs BEFORE the existing spec-based and file-based checks.

If spec-doc-scanner returns a skip list, hold it for merging in Phase 4.

### Phase 1: Check if Spec System is Enabled

Read `khufu.yaml` and check `spec.enabled`. If `false` or absent, **skip the spec-based check** and proceed to Phase 3 (file-based fallback check).

### Phase 2: Spec-Based Incremental Check

When `spec.enabled: true`:

#### 2.1 Discover Existing Spec Files

Use **Glob** to find spec files in the configured spec directory (default: `specs/`):

```
specs/**/spec.v*.md
```

If no spec files exist (first run), there is nothing to skip. Return an empty skip list and proceed to generation.

#### 2.2 Parse Implemented Test Cases

For each spec file found, read it and extract:

1. **Test case IDs** with `status: implemented`:
   - Look for patterns like `UT-USER-001`, `IT-ORDER-003`, `API-AUTH-002`, `E2E-CHECKOUT-001`
   - Look for `status: implemented` markers next to these IDs
   - Look for test file paths in the test case description

2. **Test file paths** already mapped:
   - In the test case description: `Test File: path/to/TestClass.java`
   - Or in a summary table: `| UT-USER-001 | UserServiceTest.java | implemented |`

3. **Build a resolved skip set**:

   ```markdown
   | Spec ID | Test File Path | Source File / Scenario |
   |---------|---------------|----------------------|
   | UT-USER-001 | UserServiceTest.java | UserService.java |
   | UT-USER-002 | UserValidatorTest.java | UserValidator.java |
   | IT-ORDER-001 | OrderRepositoryIT.java | OrderRepository + Order entity |
   ```

#### 2.3 Determine Skip List for Current Layer

Filter the skip set by the current test layer prefix:

| Layer | Spec ID Prefix |
|-------|---------------|
| UT | `UT-` |
| IT | `IT-` |
| API | `API-` |
| E2E | `E2E-` |

#### 2.4 Map to Generation Targets

**For code-based mode**:
- Extract the **source file** each implemented test case covers (from the spec's description or by inferring from test file name: `FooTest.java` → `Foo.java`)
- These source files are **already covered** → add to skip list

**For spec-based mode**:
- Extract the **scenario ID** (e.g., `UT-USER-001`)
- These scenarios are **already implemented** → add to skip list

#### 2.5 Output: Skip List

Produce a structured skip list to feed into the generation step:

```markdown
## Incremental Skip List

Reason: Already implemented (from specs/)

| Skip Target | Type | Covered By | Spec File |
|-------------|------|-----------|-----------|
| UserService.java | source-file | UserServiceTest.java | specs/user/spec.v1.md |
| UserValidator.java | source-file | UserValidatorTest.java | specs/user/spec.v1.md |
| UT-USER-001 | scenario | UserServiceTest.java | specs/user/spec.v1.md |
```

### Phase 3: File-Based Fallback Check

When `spec.enabled: false` OR no spec files exist yet, use a simpler file-based check:

1. **Glob for existing test files** in the configured test directory (e.g., `src/test/java/**/*Test*.java`).

2. **Infer covered source files** from test file names:
   - `Base64Test.java` → covers `Base64.java`
   - `test_user_service.py` → covers `user_service.py`
   - `user.service.test.ts` → covers `user.service.ts`

3. **Build a skip list from existing test files only**. This is less precise than the spec-based check (can't distinguish between "test exists but is empty/stale" vs "test is fully implemented and spec-tracked"), but it prevents the most egregious duplication.

4. **Warn the user** if existing test files are found without corresponding spec entries. Recommend enabling the spec system for better tracking.

### Phase 4: Merge and Feed Skip List Forward

#### 4.1 Merge Skip Lists

Combine the skip lists from all sources:
1. **Execution record specs** (Phase 0 — from `_shared/spec-doc-scanner.md`)
2. **Planning specs** (Phase 2 — from spec files with `status: implemented`)
3. **File-based fallback** (Phase 3 — from existing test files)

Merge rules:
- Combine all entries
- Deduplicate by `targetClass + targetMethod` (keep the entry with the most recent source)
- Priority order: execution record specs > planning specs > file-based fallback

Produce a unified skip list:

```markdown
## Merged Skip List

| Target Class | Target Method | Covered By | Source |
|-------------|--------------|-----------|--------|
| UserService | createUser | UserServiceTest.ShouldCreate... | docs/khufu/ut/ |
| OrderService | calculateTotal | OrderServiceTest.ShouldCalc... | specs/order/spec.v1.md |
| ProductRepo | findById | ProductRepoTest.shouldFind... | file-fallback |
```

#### 4.2 Feed Skip List Forward

The merged skip list is consumed by the generation step:

- **In parallel mode** (Step 4.1.1 / 5.0 / etc.): Each sub-agent receives the skip list for its assigned modules. The sub-agent must skip any source file or scenario in the list.
- **In sequential mode**: The generation step (5.1 / 5.2) filters out skipped targets before reading source files.

### Phase 5: Update Spec Files After Generation

After new tests are generated and written, update the spec files:

1. **If spec system is enabled**: Append new test cases to the relevant spec file(s) with `status: implemented`, test file path, and generation date.
2. **If spec system is disabled**: Skip — the file-based fallback check will catch duplicates on the next run.

## Language-Agnostic Test File Name Patterns

For the file-based fallback (Phase 3), use these mappings to infer source file → test file relationships:

| Language | Source File Pattern | Test File Pattern | Example |
|----------|-------------------|-------------------|---------|
| Java | `Foo.java` | `FooTest.java` or `FooTests.java` | `UserService.java` → `UserServiceTest.java` |
| Python | `foo.py` | `test_foo.py` | `user_service.py` → `test_user_service.py` |
| TypeScript | `foo.ts` | `foo.test.ts` or `foo.spec.ts` | `user.service.ts` → `user.service.test.ts` |
| Go | `foo.go` | `foo_test.go` | `user_service.go` → `user_service_test.go` |
| C# | `Foo.cs` | `FooTests.cs` | `UserService.cs` → `UserServiceTests.cs` |
| Rust | `foo.rs` | (same file, `#[cfg(test)]` module) | N/A — tests are inline |

## Spec File Format for Traceability

To enable accurate incrementality, each test case in a spec file MUST include these fields:

```markdown
### UT-USER-001: shouldCreateUser_whenValidInputGiven

- **Status:** implemented
- **Test File:** src/test/java/com/example/UserServiceTest.java
- **Source File:** src/main/java/com/example/UserService.java
- **Method:** UserService.createUser()
- **Generated:** 2026-06-25
- **Evaluates:** Correctness — 正常输入返回 User 对象
```

Without the `Test File` and `Source File` fields, the spec sync module cannot build an accurate skip list and will fall back to the file-based check.
