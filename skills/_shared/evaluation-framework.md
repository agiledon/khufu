# Evaluation-Driven Development Framework

Shared module defining the EDD methodology for quality-driven test generation.

## What is EDD?

Evaluation-Driven Development (EDD) requires defining **quantifiable quality criteria BEFORE writing tests**. Tests are then designed to serve those criteria, and results are evaluated against them. This makes "test quality" measurable and verifiable rather than subjective.

## EDD Workflow

```
┌─────────────────────────────────────────────────────┐
│  1. Define    →  2. Generate  →  3. Execute         │
│  (评测标准)      (生成测试)       (执行测试)           │
│                                                     │
│      ↑                              ↓               │
│  5. Improve   ←  4. Evaluate                        │
│  (闭环改进)       (评测判定)                          │
└─────────────────────────────────────────────────────┘
```

### Step 1: Define Evaluation Criteria

Before writing any test code, define measurable quality gates:

1. **Select applicable dimensions** based on the test layer (see dimension table below)
2. **Set quantified thresholds** — every criterion must be MEASURABLE (number or boolean assertion)
3. **Define the evaluation method** — what tool/command collects the data
4. **Define failure action** — what to do when a criterion is not met

### Step 2: Generate Tests Serving Criteria

Every generated test must explicitly reference which evaluation criterion it serves. Use the annotation format:

```
// Evaluates: <Dimension> — <specific criterion>
```

Tests that serve NO criterion are redundant and should be flagged for removal.

### Step 3: Execute

Run the generated test suite and collect metrics:
- Coverage data (line, branch, function)
- Performance data (execution time per test)
- Pass/fail counts by category

### Step 4: Evaluate

Compare actual results against defined criteria. Populate the Evaluation Summary table.

For each unmet criterion:
- Calculate the gap (e.g., "branch coverage 72% vs target 75%")
- Identify the root cause (e.g., "null-check branch in createUser() not covered")
- Generate actionable recommendation

### Step 5: Improve

Loop back to Step 2, generating additional tests targeting the unmet criteria. Continue until all criteria are met OR explicitly deferred.

## Evaluation Dimensions by Layer

| Dimension | UT | IT | API | E2E | Example Metrics |
|-----------|----|----|-----|-----|-----------------|
| **Correctness** | ✅ | ✅ | ✅ | ✅ | Behavior correctness, boundary conditions, error paths |
| **Coverage** | ✅ | ✅ | — | — | Line/branch/method coverage %, mutation score |
| **Performance** | ✅ | ✅ | — | — | Per-test execution time, memory usage |
| **Robustness** | — | ✅ | ✅ | — | Concurrent access, timeout handling, resource exhaustion |
| **Contract** | — | — | ✅ | — | Schema validation, status code coverage, header compliance |
| **User Journey** | — | — | — | ✅ | Critical path completeness, observable outcomes |
| **Maintainability** | ✅ | ✅ | ✅ | ✅ | Naming conventions, test independence, fragile test ratio |

## Evaluation Criteria Definition Template

When populating the `## Evaluation Criteria` section of a spec file:

```markdown
### <Dimension Name>（维度中文名）

- [ ] <measurable criterion 1>
- [ ] <measurable criterion 2>

**Method:** <tool/command to collect data>
**On Failure:** <action — add tests | mark as known issue | defer to next iteration>
```

### Example

```markdown
### Coverage（覆盖目标）

- [ ] Line coverage ≥ 85%
- [ ] Branch coverage ≥ 75%
- [ ] All public methods have at least 1 happy path + 1 error path test

**Method:** `jest --coverage` reads from `coverage/lcov.info`
**On Failure:** Generate additional tests targeting uncovered branches/paths, re-evaluate.
```

## Evaluation Summary Template

At the bottom of every spec file, include an Evaluation Summary:

```markdown
## Evaluation Summary

| Criteria | Target | Actual | Status | Action |
|----------|--------|--------|--------|--------|
| Line coverage | ≥85% | 88% | ✅ | — |
| Branch coverage | ≥75% | 72% | ❌ | Add null-check test for createUser() |
| UT avg time | <100ms | 45ms | ✅ | — |
| Fragile ratio | ≤20% | 15% (3/20) | ✅ | — |
| Public method coverage | 100% | 100% (5/5) | ✅ | — |

**Evaluation Date:** 2026-06-25
**Evaluated By:** khufu-ut v0.2.0

**Open Issues:**
- [ ] Branch coverage gap: `createUser()` — null email path not tested (est. +1 test)
- [ ] API-USER-001 and E2E-USER-001 status: `planned` → needs implementation
```

## Status Meanings

| Status | Meaning |
|--------|---------|
| ✅ Passed | Criterion met |
| ❌ Failed | Criterion not met — action required |
| ⏸️ Deferred | Criterion not met but explicitly deferred (with justification) |
| — (N/A) | Not applicable to this layer/feature |

## Integration with khufu.yaml

```yaml
evaluation:
  enabled: true
  failOnUnmetCriteria: warning  # "warning" (report only) | "error" (fail CI)
  dimensions:                   # Enabled dimensions (omit to disable)
    - correctness
    - coverage
    - performance
    - maintainability
  thresholds:                   # Default thresholds (can be overridden per spec)
    ut:
      lineCoverage: 85
      branchCoverage: 75
      maxTestMs: 100
      maxFragileRatio: 20
    it:
      lineCoverage: 60
      branchCoverage: 50
      maxTestMsH2: 2000
      maxTestMsPostgres: 10000
```

## Spec File Format (Forward Reference)

Each spec file (`specs/<feature>/spec.v<N>.md`) follows this structure:

```
# Feature: <Name>
(metadata)

## Evaluation Criteria
(dimension groups with measurable criteria — filled BEFORE test generation)

## Unit Tests / Integration Tests / API Tests / E2E Tests
(test cases with Evaluates: field linking to criteria)

## Evaluation Summary
(results table — filled AFTER test execution)
```

See the spec generation workflow in each skill's SKILL.md for the detailed process.
