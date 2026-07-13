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

1. `spec.enabled` — if `false` or absent, skip (nothing to scan)
2. `spec.docsDirectory` — the base directory for spec docs. Default: `docs/khufu/`

If spec is disabled, return an empty skip list and fall through to `spec-sync.md`.

### Step 2: Read the Wizard File

Read `<docsDirectory>/test-cases.md` (e.g., `docs/khufu/test-cases.md`).

If the wizard file does **not exist** (first ever run), there are no previous spec docs to scan. Return an empty skip list.

If the wizard file exists, parse it:

1. **Extract the "Recent Generations" table**:
   - Columns: Date, Type, File, Tests, Passed, Failed
   - Each row links to a spec doc file via the `File` column

2. **Filter by current layer**: Only read spec docs matching the current test layer (`ut`, `it`, `api`, `e2e`).

3. **Extract the "Coverage Overview" table** (optional, for informational context)

### Step 3: Parse Referenced Spec Docs

For each spec doc file referenced in the wizard (filtered to current layer):

1. **Read the spec doc file** (e.g., `docs/khufu/ut/2026-07-13-ut-test-cases.md`)
2. **Extract the "Test Cases" table**:
   - Columns: #, Test Class, Test Method, Target Class, Target Method, Status
   - Filter to rows where `Status` is `✅` (passed)
3. **Build covered-item set**:
   ```
   {
     targetClass: "UserService",
     targetMethod: "createUser",
     testClass: "UserServiceTest",
     testMethod: "ShouldCreateUserWhenValidInputGiven",
     specDoc: "ut/2026-07-13-ut-test-cases.md"
   }
   ```

### Step 4: Build Skip List

Compile all covered items into a skip list:

```markdown
## Spec Doc Skip List

Source: docs/khufu/ execution record specs

| Target Class | Target Method | Covered By | Spec Doc |
|-------------|--------------|-----------|-----------|
| UserService | createUser | UserServiceTest.ShouldCreateUser... | ut/2026-07-13-ut-test-cases.md |
| OrderService | calculateTotal | OrderServiceTest.ShouldCalc... | ut/2026-07-12-ut-test-cases.md |
```

**For code-based mode**: The skip list maps to source files and methods. When reading a source file for generation, skip any method that appears in the skip list.

**For spec-based mode**: Compare new spec scenarios against the skip list. If the same target class + method combination appears, skip that scenario.

### Step 5: Merge with spec-sync Skip List

After `spec-sync.md` runs (Phase 2 of spec-sync), merge the two skip lists:

1. Combine all entries from both sources
2. Deduplicate by `targetClass + targetMethod` (keep the entry with the most recent spec doc)
3. Report the merged skip list to the generation step

```markdown
## Merged Skip List

Source: docs/khufu/ (spec docs) + specs/ (planning specs)

| Target Class | Target Method | Covered By | Source |
|-------------|--------------|-----------|--------|
| UserService | createUser | UserServiceTest | docs/khufu/ut/2026-07-13-... |
| OrderService | calculateTotal | OrderServiceTest | specs/order/spec.v1.md |
```

### Step 6: Report

Include the skip list in the generation report under a "Pre-Generation Dedup" section:

```markdown
### Pre-Generation Dedup

| Source | Entries Scanned | Already Covered | New to Generate |
|--------|----------------|-----------------|-----------------|
| docs/khufu/ (execution records) | 15 | 8 | 7 |
| specs/ (planning specs) | 12 | 3 | 9 |
| **Merged Total** | — | **10** | **12** |
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

## Wizard File Format (for reference)

The wizard file at `docs/khufu/test-cases.md` follows this format:

```markdown
---
version: 3
created: 2026-07-10
updated: 2026-07-13T14:30:00+08:00
---

# Khufu Test Cases Index

## Recent Generations

| Date | Type | File | Tests | Passed | Failed |
|------|------|------|-------|--------|--------|
| 2026-07-13 | UT | [2026-07-13-ut-test-cases.md](ut/2026-07-13-ut-test-cases.md) | 25 | 23 | 2 |
| 2026-07-13 | API | [2026-07-13-api-test-cases.md](api/2026-07-13-api-test-cases.md) | 15 | 12 | 3 |

## Coverage Overview

| Type | Date | Line % | Branch % | Report |
|------|------|--------|----------|--------|
| UT | 2026-07-13 | 78% | 65% | [report](ut/coverage/) |
```
