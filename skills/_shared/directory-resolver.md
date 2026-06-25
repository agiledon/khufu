# Test Directory Resolver

Shared module for determining the correct output directory for test files.

## Usage

The caller must provide:
- `language`: detected language
- `layer`: `ut`, `it`, `api`, or `e2e`
- `khufuConfig`: parsed khufu.yaml (may be empty)

## Workflow

### 1. Check khufu.yaml Override

If `khufu.yaml` has `directories.<layer>` configured, use that directory. This takes precedence over all defaults.

Example:
```yaml
directories:
  ut: __tests__/
  it: __tests__/integration/
  api: __tests__/api/
  e2e: e2e/
```

### 2. Default Directory by Language and Layer

If no override in khufu.yaml, use these defaults:

| Language | UT | IT | API | E2E |
|----------|----|----|-----|-----|
| Java (Maven) | `src/test/java/<package>/` | `src/test/java/<package>/` (with `@Tag("integration")`) | `src/test/java/<package>/api/` | `src/test/java/e2e/` |
| Java (Gradle) | `src/test/java/<package>/` | `src/integrationTest/java/` | `src/test/java/<package>/api/` | `src/test/java/e2e/` |
| Python | `tests/` or co-located `test_<module>.py` | `tests/integration/` | `tests/api/` | `tests/e2e/` |
| TypeScript/JS | `__tests__/` or co-located `<file>.test.ts` | `__tests__/integration/` | `__tests__/api/` | `e2e/` or `tests/e2e/` |
| Go | Same package `<source>_test.go` | `integration/` directory with `//go:build integration` tag | `api/` directory | `e2e/` directory |
| C# | `<Project>.Tests/` | `<Project>.IntegrationTests/` | `<Project>.ApiTests/` | `<Project>.E2ETests/` |

### 3. Package/Module Path Resolution

For languages with package structures (Java, C#), derive the test package path from the source file's package declaration.

For TypeScript/JavaScript, maintain the same relative path structure under the test directory.

### 4. Ensure Directory Exists

Use **Bash** to create the target directory if it doesn't exist:
```bash
mkdir -p <test-directory>
```

### 5. Return

After this module completes, the caller should have:
- `testDirectory`: absolute or project-relative path where test files should be written
- `packagePath` (Java/C#): derived package path for test classes
