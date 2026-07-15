# Spec Doc Scanner — Pre-Generation Dedup

Shared module for scanning the execution record spec docs (`docs/khufu/`) BEFORE test generation to build a skip list of already-covered code. This prevents regenerating tests for code that already has test coverage recorded in a previous generation run.

## Core Principle

**Never regenerate a test that already exists and is recorded in a spec doc.** The execution record specs tell us exactly which target classes and methods are already covered. Use them to avoid duplicate test generation.

## Relationship to spec-sync.md

- **spec-sync.md**: Scans `specs/` planning specs for `status: implemented` test cases
- **spec-doc-scanner.md** (this module): Scans `docs/khufu/` execution record specs for already-tested code
- **Order**: Run spec-doc-scanner FIRST, then spec-sync. Merge both skip lists before generation.

## Workflow

### Step 1: Check Configuration

Read `khufu.yaml` and check:

1. `spec.enabled` — if `false` or absent, skip (return empty skip list)
2. `spec.docsDirectory` — the base directory for spec docs. Default: `docs/khufu/`

If spec is disabled, return an empty skip list and fall through to `spec-sync.md`.

### Step 2: Discover All Spec Docs for the Current Layer

**Glob for ALL spec docs** in the current layer's subdirectory. Do NOT rely solely on the wizard file — spec docs may exist even if the wizard hasn't been updated.

```bash
# Glob pattern
<docsDirectory>/<layer>/*-<layer>-test-cases.md
```

Example for UT layer:
```
docs/khufu/ut/2026-07-13-ut-test-cases.md
docs/khufu/ut/2026-07-14-ut-test-cases.md
```

If **no spec docs found** (first ever run for this layer), return an empty skip list.

### Step 3: Parse ALL Spec Docs (Not Just Today's)

**For every spec doc found in Step 2** (all dates, not just today):

1. **Read the spec doc file**
2. **Extract the "Test Cases" section** — parse each `### <module-name>` subsection's table:
   - Columns: Test Class, Target Class, Target Method(s), Status
   - **Include ALL rows regardless of Status** — even ⚠️ entries represent existing tests that should not be regenerated
3. **Build covered-item set** for each row:
   ```
   {
     targetClass: "UserService",
     targetMethods: ["createUser", "deleteUser"],
     testClass: "UserServiceTest",
     status: "✅",
     module: "roncoo-pay-service",
     specDoc: "ut/2026-07-13-ut-test-cases.md"
   }
   ```

### Step 4: Build Comprehensive Skip List

Compile all covered items from ALL spec docs into a single skip list, deduplicating by `targetClass + targetMethod`:

```markdown
## Spec Doc Skip List

Source: docs/khufu/ execution record specs (all dates)

| Module | Target Class | Target Method(s) | Covered By | Status | Spec Doc |
|--------|-------------|------------------|-----------|--------|-----------|
| roncoo-pay-service | UserService | createUser, deleteUser | UserServiceTest | ✅ | ut/2026-07-13-ut-test-cases.md |
| roncoo-pay-service | OrderService | calculateTotal | OrderServiceTest | ✅ | ut/2026-07-14-ut-test-cases.md |
```

The dedup rule: if the same `targetClass + targetMethod` appears in multiple spec docs, keep ALL test entries (they test different behaviors of the same method). The skip applies at the **test method** level, not just the target method level.

### Step 5: Determine Coverage Completeness

After building the skip list, compare against the source code to determine if there is any uncovered code:

1. **Discover source files**: Use Glob to find all source files in the project
2. **Extract public methods**: For each source file, identify public methods (the testable surface)
3. **Cross-reference with skip list**: Check each public method against the skip list

Produce a **coverage gap analysis**:

```markdown
## Coverage Gap Analysis

| Source File | Total Methods | Already Covered | Not Covered | Action |
|-------------|--------------|-----------------|-------------|--------|
| UserService.cpp | 5 | 5 | 0 | SKIP |
| OrderService.cpp | 8 | 3 | 5 | GENERATE |
| PaymentService.cpp | 4 | 0 | 4 | GENERATE |
| ConfigLoader.cpp | 2 | 2 | 0 | SKIP |
```

### Step 6: Decide — Continue or Exit Early

**If ALL methods across ALL source files are already covered** (Not Covered = 0 for every file):

→ Signal **FULLY_COVERED**. The caller (SKILL.md) should skip all remaining steps and report:

```
✓ All code is already covered by existing tests.
  - <N> spec docs scanned across <M> dates
  - <X> source files, <Y> methods — all covered
  - No new tests needed.

  To regenerate tests, delete the relevant spec docs or test files first.
```

**If some methods are NOT covered**:

→ Continue to Step 7. Only generate tests for the uncovered methods.

### Step 7: Merge with spec-sync Skip List

After `spec-sync.md` runs, merge both skip lists:

1. Combine all entries from both sources
2. Deduplicate by `targetClass + targetMethod`
3. The merged skip list covers all previously generated tests (from both execution records and planning specs)

### Step 8: Report

Include in the generation report:

```markdown
### Pre-Generation Dedup

| Source | Spec Docs Scanned | Dates Covered | Already Tested Methods | New Methods to Cover |
|--------|-------------------|---------------|----------------------|---------------------|
| docs/khufu/ut/ (execution records) | 3 | 2026-07-13, 2026-07-14 | 12 | — |
| specs/ (planning specs) | 2 | — | 3 | — |
| **Merged Total** | — | — | **13** | **5** |

**Source files fully covered (skipped):** UserService.cpp, ConfigLoader.cpp
**Source files with gaps:** OrderService.cpp (5 methods), PaymentService.cpp (4 methods)
```

## Language-Agnostic Patterns for Spec Doc Parsing

When parsing spec doc tables, be aware of language-specific naming conventions:

| Language | Target Class Example | Target Method Example |
|----------|---------------------|----------------------|
| Java | `com.example.UserService` | `createUser` |
| Python | `user_service` | `create_user` |
| TypeScript | `UserService` | `createUser` |
| Go | `user/service` | `CreateUser` |
| C++ | `UserService` | `createUser` |
| C# | `UserService` | `CreateUser` |

When matching target classes across languages, normalize by:
- Removing package/namespace prefixes
- Converting snake_case ↔ camelCase ↔ PascalCase variants as needed
- Case-insensitive comparison as fallback
