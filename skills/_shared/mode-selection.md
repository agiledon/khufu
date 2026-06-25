# Mode Selection

Shared workflow for determining whether to use **spec-based** or **code-based** test generation.

## Workflow

### 1. Check for Arguments

**If `$ARGUMENTS` contains a file or directory path** (user provided `@path/to/specs`):
- The user wants **SPEC-BASED** generation.
- Read the spec file(s) at the provided path.
- Set mode to `spec-based`.

**If `$ARGUMENTS` is empty**:
- Use the **AskUserQuestion** tool to prompt the user:

  **Question**: "Choose test generation mode:"
  **Options**:
  1. **"Spec-based: I'll provide spec documents"** — User provides requirements, user stories, API specs, or workflow documentation. Tests are generated from explicit specifications.
  2. **"Code-based: Read existing code to generate tests"** — Analyzes existing implementation to generate tests. Reverse-engineers specifications from code.

### 2. Mode-Specific Preparation

**Spec-based mode:**
- Prompt the user to provide the spec file or folder path.
- Read the specified files.
- Parse structured content based on file type:
  - `.md` files: Look for `## Scenario:`, `**Given**`/`**When**`/`**Then**` blocks, checklists
  - `.yaml`/`.yml` files: Parse structured test case definitions
  - `.feature` files: Parse Gherkin `Feature:`, `Scenario:`, `Given`, `When`, `Then`
  - Plain text: Look for numbered requirements, expected behaviors

**Code-based mode:**
- Proceed to language detection (`_shared/language-detection.md`).
- Then discover source files using **Glob** according to the selected language's conventions.

### 3. Return

After this module completes, the caller should have:
- `generationMode`: `"spec-based"` or `"code-based"`
- `specFiles` (if spec-based): list of spec file paths read
- `specContent` (if spec-based): parsed content from spec files
