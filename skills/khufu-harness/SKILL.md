---
name: khufu-harness
description: >-
  This skill establishes targeted constraint assets (Harness Engineering) for a target system following SDD (Spec-Driven Development) principles. Use when the user wants to "establish constraint assets", "create harness", "khufu-harness", "build AGENTS.md / Constitutions.md", "set up project constraints", or wants to update/revise existing constraint assets. On first run it explores the target project (specs, PRDs, codebase, config) and generates AGENTS.md, Constitutions.md, the docs/harness trio (context-package, tool-schema, eval-set), the docs/knowledge base (arch, design-system, quality, code-standard, business-rule), and docs/prd. After creation it supports updating assets either by explicit user content (intelligently classified into the correct location) or by diffing current specs/code against the existing assets.
version: 0.1.1
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
  - Task
  - Agent
---

# khufu-harness: Constraint Asset Builder & Maintainer

Establish and maintain the **constraint assets** (驾驭工程 / Harness Engineering) of a target
system so that AI agents (and humans) operate within a stable, navigable set of guardrails. The
output follows **SDD (Spec-Driven Development)** and **Harness Engineering** best practices.

All assets are written into the **current working directory (the target project root)** using
**relative paths**. They are plain Markdown unless a non-Markdown format is strictly required
(e.g., a machine-readable schema) — prefer Markdown everywhere.

## When to use

- `/khufu-harness` with no prior assets → **Build** the full constraint-asset set.
- `/khufu-harness` after assets already exist, with explicit content → **Update Mode 1** (targeted write).
- `/khufu-harness` after assets already exist, with no content → **Update Mode 2** (diff-driven revision).

## Entry Logic (run first, every invocation)

1. Use **Glob** from the project root for: `AGENTS.md`, `CLAUDE.md`, `Constitutions.md`,
   `docs/harness/**`, `docs/knowledge/**`, `docs/prd/**`.
2. If **none** of these exist (or `docs/` is empty) → go to **Build Workflow** below.
3. If assets **already exist** → go to **Update Workflow** below.

---

# Step 0 — Determine documentation language & wizard file (THE FIRST STEP, ALWAYS)

The **very first action** on every invocation — whether or not constraint assets already exist — is
to confirm the documentation language with the user via **AskUserQuestion**. Do **NOT** skip this
question even when `AGENTS.md` / `Constitutions.md` already exist.

1. **Detect the recommended language BEFORE asking** (silent, no user interaction yet):
   - If constraint assets already exist, read `AGENTS.md` / `Constitutions.md` (and a sample of
     `docs/**`) and detect their language (e.g., Chinese headings ⇒ 中文; English ⇒ English).
   - If no assets exist, the recommended language is **English**.
   - Result = `RECOMMENDED_LANG`.
2. **Ask the user** with `AskUserQuestion`:
   - **Question**: "约束资产文档使用哪种语言书写？ / Which language should the constraint assets be written in?"
   - **Pre-select / recommend** the option matching `RECOMMENDED_LANG`.
   - **Options** (user may also supply their own language):
     - **English** (recommended when detected or unknown)
     - **中文 (Chinese)**
     - **日本語 (Japanese)**
   - **Default**: if the user makes **no selection** or gives no answer, use `RECOMMENDED_LANG`
     (which is **English** when nothing was detected).
3. Record the final choice as `DOC_LANG`. **Every** asset generated or updated afterward
   (`AGENTS.md`, `CLAUDE.md`, `Constitutions.md`, `docs/harness/*`, `docs/knowledge/*`,
   `docs/prd/*`) MUST be written in `DOC_LANG`. The agent's own reasoning may be in any language,
   but the produced Markdown assets must be in `DOC_LANG`.

> Detection only sets the **recommended** option — the question is **always** asked. The produced
> Markdown assets must be in `DOC_LANG`.

### Wizard file (navigation map) name

The **wizard file** is the top-level navigation map an agent reads first. Its name depends on the
target agentic tool. Determine it alongside `DOC_LANG`; every step below uses `WIZARD_FILE`.

1. **Detect the tool silently:**
   - `.claude/` or `CLAUDE.md` present → **Claude Code** (reads `CLAUDE.md`).
   - `.opencode/` present, or `.khufu/khufu.yaml` `ide` lists `opencode` → **OpenCode** (reads `AGENTS.md`).
   - `.cursor/` → Cursor; `.codex/` → Codex; etc.
2. **Ask the user** with `AskUserQuestion` which tool consumes the assets, pre-selecting the
   detected tool.
3. Result:
   - **Claude Code** → generate **both** `AGENTS.md` (canonical map) **and** a thin `CLAUDE.md`
     pointer that links to `AGENTS.md`.
   - **Any other tool** → generate only `AGENTS.md`.

---

# Build Workflow (initial creation)

> **First action:** complete **Step 0 — Determine documentation language & wizard file** (above) and
> use `DOC_LANG` + `WIZARD_FILE` for every asset you generate.

## Step 1 — Explore target system state

Gather current context quickly (do NOT read the whole codebase — sample):

- **Specs / PRD**: `specs/**`, `docs/prd/**`, `*.md` at root describing requirements.
- **Existing constraints**: `AGENTS.md`, `CLAUDE.md`, `Constitutions.md`, `README.md`, `ARCHITECTURE.md`.
- **Config & stack**: `package.json` / `pom.xml` / `go.mod` / `Cargo.toml` / `requirements.txt` /
  `pyproject.toml` / `Gemfile`, `.khufu/khufu.yaml`, `tsconfig.json`, `Dockerfile`, CI files.
- **Codebase shape**: top-level source directories (`src/`, `app/`, `frontend/`, `backend/`,
  `services/`), entry points, test directories.
- **Tooling presence**: see Tooling Detection below.

Summarize findings: language(s), detected frameworks, existing docs, and what is **missing**.

## Step 2 — Establish context & tech stack

- If the stack is **clearly determinable** from Step 1 (e.g., `package.json` shows React + NestJS +
  Postgres), record it directly — do not prompt.
- If **ambiguous or undetermined**, use **AskUserQuestion** with mainstream recommendations, one
  question per concern; let the user pick or supply their own:

  | Concern | Example recommended options |
  |---------|------------------------------|
  | Frontend | React, Vue, Angular, Svelte, None/Backend-only |
  | Backend | Node/NestJS, Spring Boot, Django, Go, .NET, None/Frontend-only |
  | Database | Postgres, MySQL, MongoDB, SQLite, None |
  | Cache | Redis, Memcached, None |
  | Deployment | Docker, K8s, Serverless, PM2/Systemd, None |
  | Package manager | npm, pnpm, yarn, maven, pip, cargo, go mod |

  Record the final stack in `Constitutions.md` (Step 6).

## Step 3 — Establish architecture layering

- If the codebase already shows a clear layering, derive it and record it.
- Otherwise use **AskUserQuestion** with recommended models and let the user confirm or choose:
  - **Backend**: Layered (controller/service/repository/domain), Hexagonal / Ports & Adapters,
    Clean Architecture, Modular Monolith, Microservices.
  - **Frontend**: Feature-based modules, Component/Container, Atomic Design, Route-based.
- Record the chosen layering as the **architecture layers** in `Constitutions.md` (Step 6).

## Step 4 — Detect tooling

Detect the three external capabilities the constitution will reference. Use **Bash** + **Glob** as
appropriate, then record availability in `Constitutions.md` and **offer** (via AskUserQuestion) to
install anything missing — only install after explicit user confirmation.

| Tool | Detect via | Install (user-confirmed) |
|------|-----------|---------------------------|
| **OpenSpec CLI** | `command -v openspec` / `npx openspec --version`; presence of `openspec/` dir or `openspec.json` | `npm install -g @fission-ai/openspec` |
| **OpenMole** (BDR refactoring) | `npm ls openmole` / `command -v openmole` / `npx openmole --version` | `npm install -g openmole` (see https://www.npmjs.com/package/openmole) |
| **Khufu** (khufu-ut/it/api/e2e) | presence of khufu skills/commands (`khufu-ut` …) or `npx khufu --version` | `npm install -g khufu-kit` (see https://www.npmjs.com/package/khufu-kit) |

If a tool is unavailable, the constitution still references it by name and notes the install
command; the process gates degrade gracefully (e.g., "run openspec verify if installed").

## Step 5 — Generate the constraint assets

Use **Write** to create each file below (templates follow in **Asset Templates**). Create
directories as needed. The generated `AGENTS.md` must link to every other asset (it is the
navigation map).

### Directory layout (created in target project root)

```
AGENTS.md
CLAUDE.md                      # thin pointer → AGENTS.md (only when target tool is Claude Code)
Constitutions.md
docs/
  harness/
    context-package/
      security.md
      architecture.md
      resource.md
      business.md
    tool-schema/
      tool-schema.md
    eval-set/
      eval-set.md
  knowledge/
    arch/
      adr/README.md
      adr/0001-<topic>.md        # one ADR per significant decision
      frontend/<topic>.md        # only if a frontend exists
      backend/<topic>.md         # only if a backend exists
    design-system/
      design-system.md
    quality/
      test-strategy.md
    code-standard/
      <lang>/standard.md         # one per language in the chosen stack
    business-rule/
      invariants.md
  prd/
    README.md                   # PRD navigation index
    mvp/mvp-v1.md               # extend to mvp-v2.md … as needed
```

### Principles while generating

- **Context-aware**: fill templates from Step 1 exploration; never emit empty placeholders like
  `<TODO>` in the shipped assets. If a section genuinely does not apply, write "N/A — not applicable
  to this project" and explain why.
- **Markdown-first**: every file is Markdown.
- **Link everything**: `AGENTS.md` and `README.md` (PRD) are indexes with relative links.
- **Single source of truth (DRY)**: `Constitutions.md` owns the tech stack and architecture layers.
  No other asset re-states them — the harness trio and knowledge base only add constraints and
  details, linking back to the constitution.
- **Stability (cache-friendly)**: keep `AGENTS.md` and `Constitutions.md` small and stable; route
  volatile, evolving content (ADRs, PRD, eval-set, tool-schema, detailed arch notes) into `docs/`.
- **Knowledge base is progressive**: seed it with what is known now; the Update workflow grows it.

## Step 6 — Embed the SDD Development Process in Constitutions.md

`Constitutions.md` is the **highest principle** of the project. It MUST contain, at minimum:

1. **Context** — what the project is, its goals, key stakeholders.
2. **Tech stack** — the resolved stack from Step 2.
3. **Architecture layers** — the resolved layering from Step 3.
4. **Tooling status** — detected tools from Step 4 (installed / not-installed + install cmd).
5. **SDD Development Process & Gates** — the strict gated flow defined in
   **SDD Reference** below. Copy it verbatim into the constitution.

> Items 2 (**Tech stack**) and 3 (**Architecture layers**) are the **single source of truth** — no
> other asset may restate them; the harness trio and knowledge base link here instead. Keep this
> file small and stable: rewrite it only when the stack, layering, tooling, or process changes.

## Step 7 — Verify & report

- If **OpenSpec** is installed: run `openspec validate` (or `openspec list`) to confirm the project
  is spec-ready; report any issue.
- Otherwise: print the created asset tree (relative paths) and a one-line purpose for each file.
- Tell the user how to invoke again to **update** assets (`/khufu-harness` with content, or without
  content for diff-driven revision).

---

# Update Workflow (assets already exist)

> **First action:** complete **Step 0 — Determine documentation language & wizard file** (above).
> Even though assets already exist, you MUST still ask the user via AskUserQuestion — use the
> detected existing language as the recommended/pre-selected option, and write all revisions in the
> confirmed `DOC_LANG`. Reuse the existing `WIZARD_FILE` unless the target tool changed.

Read the existing asset tree first so you know the valid target locations (use the **Asset Taxonomy**
table). Then branch on the user's prompt.

## Mode 1 — Explicit content (targeted write)

Triggered when the prompt contains asset **content** the user wants added/changed.

- **Category specified** (e.g., "update the security constraints in context-package",
  "add this to eval-set", "append an ADR", "revise the frontend arch note"):
  write the provided content to the **exact file** indicated by the taxonomy. Preserve the file's
  existing structure and style; use **Edit** for in-place changes or **Write** for new files.
- **Category NOT specified**: the Agent must **intelligently classify** the content against the
  Asset Taxonomy (semantics: is it a security rule? an architecture decision? a UI spec? a code
  convention? a business invariant? a PRD item?). Write to the inferred file. If the classification
  is genuinely ambiguous between two locations, confirm the chosen location with **AskUserQuestion**
  before writing.

Mode 1 with an explicitly named category writes directly (no extra confirm). Mode 1 with an inferred
category confirms placement only when ambiguous.

## Mode 2 — No content (diff-driven revision)

Triggered when the prompt gives **no asset content** (e.g., `/khufu-harness`, "sync the constraints",
"keep the assets in step with the code").

1. **Re-explore** current target state: latest specs/PRD, source code, config, and any new
   requirements since the assets were created.
2. **Diff** current state against the **existing** constraint assets. Produce a **delta list**, e.g.:
   - New capabilities/features not yet in `docs/prd`.
   - Architecture drift (code structure vs `docs/knowledge/arch`).
   - New or changed security/resource constraints vs `docs/harness/context-package`.
   - Code vs documented business invariants mismatches (`docs/knowledge/business-rule`).
   - Missing ADRs for recent significant decisions.
   - Stale `tool-schema` (tools added/removed) or `eval-set` gaps.
   - `AGENTS.md` / `README.md` navigation that no longer matches the tree.
3. **Present the delta list** to the user, grouped by file.
4. **Require explicit confirmation for EVERY proposed revision** (use **AskUserQuestion** /
   per-item confirm). Do **not** write anything the user has not confirmed.
5. Apply only confirmed revisions via **Edit**/**Write**; then refresh `AGENTS.md` / `docs/prd/README.md`
   indexes if navigation changed. Prefer updating `docs/**`; rewrite `AGENTS.md` / `Constitutions.md`
   only when their core content (navigation, stack, layering, tooling, SDD process) changed, to
   preserve cache hits.

Mode 2 never overwrites silently — confirm-per-change is mandatory.

---

# Asset Taxonomy (navigation + classification map)

| Category / intent | File path |
|-------------------|-----------|
| Project navigation map (canonical) | `AGENTS.md` |
| Claude Code navigation pointer | `CLAUDE.md` (thin pointer → `AGENTS.md`) |
| Highest principle / constitution / SDD process | `Constitutions.md` |
| Security constraints | `docs/harness/context-package/security.md` |
| Architecture constraints | `docs/harness/context-package/architecture.md` |
| Resource constraints (DB/cache/compute) | `docs/harness/context-package/resource.md` |
| Business constraints | `docs/harness/context-package/business.md` |
| AI-callable tool schema / permissions | `docs/harness/tool-schema/tool-schema.md` |
| Evaluation set | `docs/harness/eval-set/eval-set.md` |
| Architecture Decision Records (index) | `docs/knowledge/arch/adr/README.md` |
| Single ADR | `docs/knowledge/arch/adr/NNNN-<topic>.md` |
| Frontend architecture notes | `docs/knowledge/arch/frontend/<topic>.md` |
| Backend architecture notes | `docs/knowledge/arch/backend/<topic>.md` |
| UI design system | `docs/knowledge/design-system/design-system.md` |
| Quality / test-pyramid strategy | `docs/knowledge/quality/test-strategy.md` |
| Code standard (per language) | `docs/knowledge/code-standard/<lang>/standard.md` |
| Business invariants | `docs/knowledge/business-rule/invariants.md` |
| PRD navigation index | `docs/prd/README.md` |
| Per-MVP spec | `docs/prd/mvp/mvp-v<N>.md` |

Use this table both to **write** `AGENTS.md` links and to **classify** Mode-1 content.

---

# SDD Reference (copy into Constitutions.md)

> The development process follows **SDD (Spec-Driven Development)** and its **SDD Development
> Process**. Each step must be **fully completed and confirmed by the user** before the next step
> begins, unless auto mode is enabled. The process is driven by the tools detected in this
> constitution (OpenSpec, Khufu, OpenMole). Where a tool is not installed, the corresponding manual
> action is performed instead.

**Gate rule:** proceed to the next step ONLY after the current step is done AND the user confirms.
Human approval may be attached to **any** step. At step **a**, ask the user whether to run in
**auto mode**.

### Standard mode (gated a → f)

- **a. Propose** — Use the OpenSpec **propose** skill to create a change with planning artifacts
  (proposal, specs, design, tasks). The propose step accepts these inputs:
  1. The **PRD document** expressing the requirements.
  2. The **UI design specification + UI prototype** (only when the change involves UI).
  → **Human review** (non-auto) → b.
- **b. Apply** — Use the OpenSpec **apply** skill to implement the proposed change.
  → **Human review** (non-auto) → c.
- **c. Test** — Use the **Khufu** skills to generate and run tests (`khufu-ut` → `khufu-it` →
  `khufu-api` → `khufu-e2e`, as applicable). **Optional** — the user may skip.
  Confirm or skip → d.
- **d. Refactor** — Use the **OpenMole** skills to refactor the code (BDR / Big Deal Refactoring).
  **Optional** — the user may skip. Confirm or skip → e.
- **e. Verify** — Use the OpenSpec **verify** skill. **Mandatory.** The user confirms the result
  → f. In **auto mode**, if verification reports issues, automatically fix them and re-verify.
- **f. Archive** — Use the OpenSpec **archive** skill to archive the completed change and merge spec
  updates. **Mandatory.**

### Auto mode (a → b → e → f)

When the user selects **auto mode** at step **a**, the process runs automatically without per-step
human review, in the shortened sequence:

`a (propose)` → `b (apply)` → `e (verify, auto-fix issues)` → `f (archive)`.

Steps **c** (test) and **d** (refactor) are **skipped** in auto mode.

---

# Asset Templates

Fill from exploration; remove bracketed guidance after filling. Write all template content in
`DOC_LANG` (the language chosen in Step 0 — English by default).

## AGENTS.md
```markdown
# AGENTS.md — <project-name> Constraint Asset Map

> Navigation map for all project constraint assets. Start here. This is the **canonical** map;
> `CLAUDE.md` (if present) is only a thin pointer to it.

## Quick start
- Constitution (highest principle, SDD process): [Constitutions.md](./Constitutions.md)
- Harness constraint trio: [context-package](./docs/harness/context-package/) ·
  [tool-schema](./docs/harness/tool-schema/tool-schema.md) ·
  [eval-set](./docs/harness/eval-set/eval-set.md)
- Knowledge base: [arch](./docs/knowledge/arch/) · [design-system](./docs/knowledge/design-system/design-system.md) ·
  [quality](./docs/knowledge/quality/test-strategy.md) ·
  [code-standard](./docs/knowledge/code-standard/) ·
  [business-rule](./docs/knowledge/business-rule/invariants.md)
- Requirements: [PRD index](./docs/prd/README.md)

## How to update these assets
Run `/khufu-harness` with explicit content (classified automatically) or with no content for a
diff-driven revision (requires confirmation per change).
```

## CLAUDE.md (only when target tool is Claude Code)
```markdown
# CLAUDE.md — <project-name>

> Claude Code reads this file. The canonical constraint-asset map lives in [AGENTS.md](./AGENTS.md)
> — follow it. Keep this file as a thin pointer; do not duplicate the map here.
```

## Constitutions.md
```markdown
# Constitutions.md — <project-name>

The highest principle of this project. All agents and contributors MUST honor it.

> Single source of truth for the tech stack and architecture layers. Other assets link here rather
> than restating these. Keep this file small and stable — change it only when the stack, layering,
> tooling, or process genuinely changes.

## 1. Context
<What the project is, goals, stakeholders, domain.>

## 2. Tech Stack
| Layer | Choice |
|-------|--------|
| Frontend | <framework> |
| Backend | <framework/language> |
| Database | <db> |
| Cache | <cache or None> |
| Deployment | <deploy> |
| Package manager | <pm> |

## 3. Architecture Layers
<Resolved layering: e.g., controller/service/repository/domain; frontend feature modules.>

## 4. Tooling Status
| Tool | Status | Install |
|------|--------|---------|
| OpenSpec CLI | installed / not installed | `npm install -g @fission-ai/openspec` |
| OpenMole (BDR) | installed / not installed | `npm install -g openmole` |
| Khufu (khufu-kit) | installed / not installed | `npm install -g khufu-kit` |

## 5. SDD Development Process & Gates
<Copy the full "SDD Reference" block from the khufu-harness skill here.>
```

## docs/harness/context-package/security.md
```markdown
# Security Constraints — <project-name>
- Authentication: <mechanism>
- Authorization: <roles/scopes>
- Data protection: <encryption at rest/in transit>
- Secrets management: <vault/env/notes>
- Compliance: <GDPR/PCI/None>
- Threat assumptions: <trusted boundary>
```

## docs/harness/context-package/architecture.md
```markdown
# Architecture Constraints — <project-name>

> Layer list and tech stack live in [Constitutions.md](../../../Constitutions.md) §3 — do not
> restate them here. This file only adds constraints the constitution does not specify.

- Dependency direction: <e.g., domain has no outward deps>
- Forbidden patterns: <singletons in domain, cyclic deps, …>
- Integration boundaries: <external systems>
```

## docs/harness/context-package/resource.md
```markdown
# Resource Constraints — <project-name>

> Tech choice (which DB/cache) lives in [Constitutions.md](../../../Constitutions.md) §2 — do not
> restate it. This file only adds operational limits and SLAs.

- Database limits: <connection pool size, max connections>
- Cache limits: <TTL, eviction policy>
- Compute/quota: <CPU/mem, rate limits>
- External dependencies & SLAs: <third-party APIs>
```

## docs/harness/context-package/business.md
```markdown
# Business Constraints — <project-name>
- Domain rules that bound the solution: <list>
- Regulatory / contractual limits: <list>
- Non-goals: <what the system explicitly will not do>
```

## docs/harness/tool-schema/tool-schema.md
```markdown
# Tool Schema — AI Agent Callable Tools
Define the tools an AI agent may invoke, their parameters, and permission tiers.

| Tool | Purpose | Key params | Permission tier |
|------|---------|-----------|-----------------|
| <tool-name> | <what it does> | <param: type> | read / write / privileged |

### Permission tiers
- **read**: read-only inspection (Glob, Read, Grep).
- **write**: local file edits (Write, Edit) within project scope.
- **privileged**: external/destructive (Bash with network, deploy, force-push) — requires confirmation.
```

## docs/harness/eval-set/eval-set.md
```markdown
# Evaluation Set — <project-name>
Scenarios used to evaluate whether the system (and its agents) meet the constraints.

| ID | Scenario | Expected | Linked asset |
|----|----------|----------|--------------|
| EVAL-001 | <scenario> | <expected behavior> | <constraint file> |
```
(Extend with concrete scenarios derived from business-rule/invariants and security constraints.)

## docs/knowledge/arch/adr/README.md
```markdown
# ADR Index — <project-name>
| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](./0001-<topic>.md) | <title> | Accepted | <YYYY-MM-DD> |
```
Single ADR template `docs/knowledge/arch/adr/0001-<topic>.md`:
```markdown
# ADR 0001: <title>
- Status: Accepted | Date: <YYYY-MM-DD>
## Context
## Decision
## Consequences
```

## docs/knowledge/design-system/design-system.md
```markdown
# Design System — <project-name>
- Visual language: <tokens: color/spacing/typography>
- Components: <library or in-house>
- Accessibility: <WCAG level>
- Theming: <dark/light, i18n>
```

## docs/knowledge/quality/test-strategy.md
```markdown
# Quality & Test Strategy — <project-name>
Test pyramid (Khufu): UT (base) → IT → API → E2E (tip).
- UT: framework <…>, coverage ≥ 80% line / 70% branch.
- IT: real components + DB; H2 or Testcontainers.
- API: black-box at boundary; contract validation.
- E2E: only critical user journeys.
- EDD: define evaluation criteria before generating tests.
```

## docs/knowledge/code-standard/<lang>/standard.md
```markdown
# Code Standard — <language>
- Style: <linter/formatter, e.g., ESLint+Prettier / gofmt / rustfmt>
- Naming: <conventions>
- Structure: <module/package layout>
- Error handling: <policy>
- Comments: <when required>
```

## docs/knowledge/business-rule/invariants.md
```markdown
# Business Invariants — <project-name>
Universal, always-true rules the system must never violate:
1. <invariant>
2. <invariant>
```

## docs/prd/README.md
```markdown
# PRD Index — <project-name>
| MVP | Scope | Status | Doc |
|-----|-------|--------|-----|
| MVP v1 | <one-line scope> | <draft/active/done> | [mvp-v1](./mvp/mvp-v1.md) |
```

## docs/prd/mvp/mvp-v1.md
```markdown
# MVP v1 — <project-name>
## Goal
## In-scope features
## Out-of-scope
## Acceptance criteria
## Open questions
```

---

# Best Practices

- **Explore before generating**; never assume — derive from the target system.
- **Markdown-first**; only deviate when a format is strictly required.
- **Never overwrite silently** in Update mode; confirm per change in Mode 2.
- **DRY**: `Constitutions.md` is the single source of truth for tech stack and architecture layers;
  every other asset references it rather than duplicating.
- **Keep `AGENTS.md` the single canonical map**; `CLAUDE.md` (Claude Code) is only a pointer to it.
- **Stability**: keep `AGENTS.md` and `Constitutions.md` small and stable for cache hits; grow
  `docs/` instead.
- **Progressive enrichment**: seed what is known; the Update workflow grows the assets over time.
- Re-run `/khufu-harness` whenever the system or its requirements evolve.
