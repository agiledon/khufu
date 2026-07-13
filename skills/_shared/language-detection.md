# Language & Framework Detection

Shared workflow for detecting the project's programming language, build system, and configured test frameworks.

## Workflow

### 1. Read khufu.yaml

First, check if `khufu.yaml` exists in the project root. If it exists, read it to extract:

```yaml
language: typescript       # Primary language
frameworks:                # Test frameworks by layer
  ut: jest
  it: jest
  api: supertest
  e2e: playwright
directories:               # Custom test directories by layer
  ut: __tests__/
  it: __tests__/integration/
  api: __tests__/api/
  e2e: e2e/
```

If `khufu.yaml` provides `language` and the relevant `frameworks.<layer>`, skip detection and use configured values directly.

### 2. Auto-Detect Language (if not in khufu.yaml)

Scan project root files to identify the language:

| Indicator Files | Language |
|----------------|----------|
| `pom.xml` | Java (Maven) |
| `build.gradle` or `build.gradle.kts` | Java/Kotlin (Gradle) |
| `package.json` + `tsconfig.json` | TypeScript |
| `package.json` (no tsconfig) | JavaScript |
| `pyproject.toml` or `setup.py` or `setup.cfg` | Python |
| `go.mod` | Go |
| `xmake.lua` | C++ (xmake) |
| `CMakeLists.txt` | C++ (CMake) |
| `Cargo.toml` | Rust |
| `*.csproj` or `*.sln` | C# |

### 3. Confirm with User

Use **AskUserQuestion** to confirm:

**Question**: "Detected language: `<language>`. Is this correct?"
**Options**:
1. "Yes, use `<language>`" (Recommended)
2. "No, let me choose" → present full language list

### 4. Detect Build System (for relevant languages)

| Language | Build Systems |
|----------|--------------|
| Java | Maven (`pom.xml`), Gradle (`build.gradle`) |
| Python | pip (`setup.py`), Poetry (`pyproject.toml`), uv (`pyproject.toml`) |
| TypeScript/JS | npm, yarn, pnpm (check lock files) |
| Go | Go modules (`go.mod`) |
| C++ | xmake (`xmake.lua`), CMake (`CMakeLists.txt`) |
| C# | .NET SDK (`*.csproj`, `*.sln`) |

### 5. Return

After this module completes, the caller should have:
- `language`: detected/confirmed language
- `buildSystem`: detected build system
- `framework`: configured test framework for the current layer (from khufu.yaml or to be selected next)
- `customDirectories`: any custom test directories from khufu.yaml
- `khufuConfig`: full parsed khufu.yaml content (or empty if absent)
