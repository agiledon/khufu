# Coverage Configuration

Shared module for configuring code coverage measurement tools and thresholds.

## Usage

The caller must provide:
- `language`: detected language
- `layer`: `ut`, `it`, `api`, or `e2e`
- `framework`: selected test framework
- `khufuConfig`: parsed khufu.yaml coverage section

## Workflow

### 1. Check khufu.yaml Override

If `khufu.yaml` has a `coverage.<layer>` section, use those settings:

```yaml
coverage:
  ut:
    tool: jest
    thresholds:
      line: 80
      branch: 70
      function: 80
    formats:
      - lcov
      - html
      - text
    excludes:
      - '**/*.d.ts'
      - '**/index.ts'
  it:
    tool: jest
    thresholds:
      line: 60
      branch: 50
```

### 2. Default Coverage Tools by Language

| Language | Coverage Tool | Run Command |
|----------|-------------|-------------|
| Java | JaCoCo | `mvn verify jacoco:report` or `gradle jacocoTestReport` |
| Python | pytest-cov | `pytest --cov=. --cov-report=html --cov-report=term` |
| TypeScript/JS (Jest) | Istanbul (built-in) | `jest --coverage` |
| TypeScript (Vitest) | v8/istanbul (built-in) | `vitest run --coverage` |
| Go | go test -cover | `go test -coverprofile=coverage.out ./...` |
| C# | coverlet | `dotnet test /p:CollectCoverage=true` |

### 3. Default Thresholds by Layer

| Layer | Line Coverage | Branch Coverage | Function/Method Coverage |
|-------|--------------|-----------------|--------------------------|
| UT | 80% | 70% | 80% |
| IT | 60% | 50% | — |
| API | N/A (use endpoint coverage) | N/A | N/A |
| E2E | N/A (use scenario coverage) | N/A | N/A |

### 4. Configure Build File

Apply coverage configuration based on language and build system:

**Java (Maven) — `pom.xml`:**
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
        </execution>
    </executions>
    <configuration>
        <rules>
            <rule>
                <element>BUNDLE</element>
                <limits>
                    <limit><counter>LINE</counter><value>COVEREDRATIO</value><minimum>0.80</minimum></limit>
                    <limit><counter>BRANCH</counter><value>COVEREDRATIO</value><minimum>0.70</minimum></limit>
                </limits>
            </rule>
        </rules>
    </configuration>
</plugin>
```

**Python — `pyproject.toml`:**
```toml
[tool.coverage.run]
source = ["."]
omit = ["*/tests/*", "*/test_*.py", "*/migrations/*"]

[tool.coverage.report]
fail_under = 80
exclude_lines = ["pragma: no cover", "if TYPE_CHECKING:", "raise NotImplementedError"]
```

**TypeScript (Jest) — `jest.config.ts`:**
```typescript
coverageThreshold: {
  global: {
    lines: 80,
    branches: 70,
    functions: 80,
  },
},
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/index.ts',
],
```

**TypeScript (Vitest) — `vitest.config.ts`:**
```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    lines: 80,
    branches: 70,
    functions: 80,
  },
  exclude: ['**/*.d.ts', '**/index.ts', '**/*.config.*'],
},
```

### 5. Configure Exclusions

Default exclusions (code that should not count toward coverage):
- DTOs/Entities with only getters/setters
- Configuration classes
- Generated code (`*.g.*`, `*.gen.*`, `@Generated`)
- Framework bootstrap (Spring Boot application class, Express app entry)
- Migration scripts

### 6. Layer-Specific Coverage Notes

**For API tests (layer: api):**
- Traditional code coverage tools don't apply well — configure **endpoint coverage** instead:
  - Generate an endpoint coverage matrix (method × path × status codes)
  - Recommend OpenAPI validators for schema/contract coverage
  - See `_shared/report-template.md` for API coverage reporting

**For E2E tests (layer: e2e):**
- Use **scenario coverage** instead of line coverage:
  - Track user journeys by business priority (P0/P1/P2)
  - Track browser and device coverage
  - See `_shared/report-template.md` for E2E coverage reporting

### 7. Return

After this module completes, the caller should have:
- `coverageTool`: configured coverage tool
- `coverageCommand`: how to run tests with coverage
- `coverageThresholds`: threshold values
- `coverageExclusions`: list of exclusion patterns
- Whether build file was modified (and what was added)
