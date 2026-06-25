# Parallel Execution

Shared module for determining whether the host agent supports sub-agent (multi-agent) mode, and if so, orchestrating parallel test generation across multiple sub-agents.

## When to Use Parallel Execution

**Trigger Condition**: The total number of test files to generate is **>= 3**. If fewer than 3, parallel execution adds more coordination overhead than benefit — generate tests sequentially instead.

**Notable**: Parallel execution is especially valuable for:
- **Large codebases** with many modules/services
- **Spec suites** with many independent scenarios
- **Brownfield projects** where tests are being added to an existing codebase

## Workflow

### Phase 1: Detect Sub-Agent Support

Check if the current host agent environment supports launching sub-agents:

1. **Check available tools**: Look for the `Agent` tool in the available tool list. If present, the host supports sub-agent mode.

2. **Alternative detection**: If the `Agent` tool is not explicitly visible, check for any equivalent mechanism (e.g., `Task` tool with sub-agent spawning capability).

3. **Decision**:
   - **Sub-agent supported** → Proceed to Phase 2 (Parallel Execution).
   - **Sub-agent NOT supported** → Fall back to sequential generation. Skip Phases 2-4 and return control to the caller's standard generation step. The caller should generate tests one file at a time, in dependency order.

### Phase 2: Partition Work

Based on the generation mode and test layer, partition the work into independent, parallelizable units. Each partition will be assigned to one sub-agent.

#### Partition Granularity Decision

Use the following heuristics to choose the partitioning strategy:

| Condition | Strategy |
|-----------|----------|
| Total target files ≤ 5 | **Per-file**: each sub-agent handles 1-2 files |
| Total target files 6-20 | **Per-file group**: each sub-agent handles 2-5 files |
| Total target files > 20 | **Per-module**: group files by module/package/domain |
| Total spec scenarios ≤ 8 | **Per-scenario group**: each sub-agent handles 2-4 scenarios |
| Total spec scenarios > 8 | **Per-domain/feature**: group scenarios by feature area |

#### Code-Based Partitioning

For code-based generation, identify independent work units:

1. **Discover source files to test** (using the caller's discovery logic from their Step 4 or equivalent).

2. **Group files by module/package** (preferred) or by directory:
   - Java: `com.example.users.*`, `com.example.orders.*`, `com.example.products.*`
   - TypeScript: `src/users/`, `src/orders/`, `src/products/`
   - Python: `app/users/`, `app/orders/`, `app/products/`
   - Go: `internal/users/`, `internal/orders/`, `internal/products/`
   - C#: `Features/Users/`, `Features/Orders/`, `Features/Products/`

3. **Within each module**, further split by file if the module is large (>5 source files).

4. **Ensure independence**: Verify that no two partitions share mutable dependencies. If `UserService` and `OrderService` are in different partitions but both depend on `PaymentGateway`, partition them together.

5. **Output**: A list of partition descriptors:
   ```
   Partition 1: src/users/ — UserService.ts, UserRepository.ts, UserValidator.ts (3 files, ~8 test methods)
   Partition 2: src/orders/ — OrderService.ts, OrderProcessor.ts (2 files, ~6 test methods)
   Partition 3: src/products/ — ProductService.ts, ProductCatalog.ts (2 files, ~5 test methods)
   ```

#### Spec-Based Partitioning

For spec-based generation, partition by scenario or feature:

1. **Parse the spec file(s)** (using the caller's spec parsing logic).

2. **Group scenarios by feature/domain**:
   - Extract feature/domain tags from scenario headers
   - Or group by the first N characters of the scenario identifier

3. **Ensure independence**: Scenarios in different partitions should not share mutable test data requirements.

4. **Output**: A list of partition descriptors:
   ```
   Partition 1: User Registration (scenarios UT-USER-001 through UT-USER-008)
   Partition 2: User Authentication (scenarios UT-AUTH-001 through UT-AUTH-006)
   Partition 3: User Profile (scenarios UT-PROF-001 through UT-PROF-005)
   ```

### Phase 3: Launch Parallel Sub-Agents

For each partition, launch a sub-agent with a self-contained prompt. **All sub-agents are launched in a single message** (concurrent tool calls) so they run in parallel.

#### Sub-Agent Prompt Template

Each sub-agent receives a prompt that includes:

```
You are generating <layer> tests for partition "<partition-name>".

**Test Layer**: <ut|it|api|e2e>
**Language**: <detected-language>
**Framework**: <selected-framework>
**Mocking Library**: <selected-mocking-library>
**Output Directory**: <test-directory>
**Generation Mode**: <spec-based|code-based>

**Files to cover**:
<list of source files with paths, OR list of spec scenarios with IDs>

**Context from preparation steps** (carry forward from the parent):
- Evaluation criteria: <summary of EDD criteria>
- Testability grades (UT only): <grade breakdown for these files>
- Database strategy (IT only): <H2 or Testcontainers>
- Pyramid dedup results: <scenarios to skip and why>
- Test data strategy: <key points from test-data-factories.md>

**Instructions**:
1. Read each assigned source file (code-based) or spec scenario (spec-based).
2. For each file/scenario, generate tests following the <layer> skill's Step <N> guidelines:
   - AAA pattern (Arrange-Act-Assert)
   - Coverage targets: happy path, null/empty, boundary values, error paths
   - Mock all external dependencies (UT only; IT/API/E2E use real components per their layer rules)
   - Annotate each test with Spec ID, Evaluation dimension, and Tags (per Step 6 annotation format)
3. Write the generated test files using the Write tool to the correct output directory.
4. Return a summary of:
   - Files created (with paths)
   - Test count per file
   - Any issues or skipped items
   - Fragile test count (if applicable)

**DO NOT**:
- Modify source code (only write test files)
- Generate tests for files outside your partition
- Run tests (they will be run after all partitions complete)
- Communicate with other sub-agents (each partition is fully independent)
```

#### Configuration to Pass to Each Sub-Agent

Pack the following context from the parent's preparation steps into each sub-agent prompt:

1. **Language & Framework**: From `_shared/language-detection.md` and `_shared/framework-selector.md` — the exact framework name, version, and mocking library.

2. **Test Directory**: From `_shared/directory-resolver.md` — the output path.

3. **Evaluation Criteria**: From `_shared/evaluation-framework.md` — the applicable dimensions and thresholds for this layer.

4. **Layer-Specific Context**:
   - **UT**: Testability grades for the assigned files (Grade A/B/C), PowerMock/refactoring decisions from Step 4.
   - **IT**: Database strategy (H2/Testcontainers), test data factory paths, pyramid dedup results.
   - **API**: Endpoint coverage targets, auth configuration, base URL pattern.
   - **E2E**: Page Object pattern, `data-testid` conventions, browser configuration.

5. **Coverage Configuration**: From `_shared/coverage-config.md` — thresholds and exclusions.

6. **Annotation Format**: The exact annotation/comment format from the layer skill's Step 6/annotation step.

7. **Pyramid Dedup Results**: Scenarios explicitly skipped and the rationale (so sub-agents don't duplicate them).

#### Example: Launching 3 Parallel Sub-Agents for UT

```text
Tool Call 1: Agent(
  description: "Generate UT for users module",
  prompt: "<sub-agent prompt for partition 1: src/users/>"
)

Tool Call 2: Agent(
  description: "Generate UT for orders module",
  prompt: "<sub-agent prompt for partition 2: src/orders/>"
)

Tool Call 3: Agent(
  description: "Generate UT for products module",
  prompt: "<sub-agent prompt for partition 3: src/products/>"
)
```

All three are sent in the **same message** so they execute concurrently.

### Phase 4: Collect and Merge Results

After all sub-agents complete:

1. **Collect each sub-agent's summary**:
   - Files created
   - Test counts
   - Issues/skipped items
   - Fragile test counts

2. **Merge the results**:
   - Compile a unified file list
   - Sum test counts
   - Aggregate issues

3. **Handle failures**:
   - If a sub-agent failed to complete, note which partition was affected
   - Generate the remaining tests for that partition sequentially (fallback)
   - Record the failure in the report

4. **Return to the caller** with the merged results. The caller then proceeds to subsequent steps (coverage config, spec file generation, report).

## Important Notes

- **Sub-agents are independent**: Each sub-agent reads its own source files and writes its own test files. There is no shared mutable state.
- **No cross-partition coordination needed**: Partitions are designed to be fully independent.
- **The parent (this agent) coordinates**: After all sub-agents finish, the parent handles merging, reporting, and subsequent steps.
- **Time estimation**: Parallel execution reduces wall-clock time roughly by a factor of N (where N is the number of partitions), since each sub-agent works independently.
- **Token usage**: Total token consumption is similar to sequential generation; the benefit is reduced wall-clock time, not reduced token cost.
