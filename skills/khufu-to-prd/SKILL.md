---
name: khufu-to-prd
description: >-
  This skill should be used when the user wants a PRD from a requirement description, asks to split a requirement into MVPs, mentions "PRD", "产品需求", "用例规约", "use case", "Cockburn", "khufu-to-prd", or wants the agent to keep asking until the requirement is clear. It grills the requirement as a design tree, then writes one Cockburn fully dressed use-case PRD per MVP to docs/prd/prd-mvp1.md, prd-mvp2.md, … and indexes them in docs/prd/prd-catalog.md.
version: 0.1.0
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

# khufu-to-prd: MVP PRDs as Cockburn Use Cases

Turn one requirement description into a set of MVP PRDs. Each feature is a **fully dressed use case** in the form Alistair Cockburn recommends in *Writing Effective Use Cases*. The interview that produces those decisions follows the **grilling** design-tree loop: ask every question that can be asked now, recommend an answer, then wait.

Write only into the **target project** (the current working directory), under `docs/prd/`.

## When to use

- The user gives a requirement and wants a PRD, an MVP cut, or 用例规约.
- The user invokes `/khufu-to-prd`.

Do not use this skill to write tests, harness assets, or implementation plans.

## Gates

Do **not** create directories or write files until all three are true:

1. The grilling frontier is empty.
2. The user has confirmed the shared understanding, including the MVP cut.
3. `docs/prd/` already exists, or the user has explicitly agreed to create it.

A grilling round ends the turn. Do not write, and do not start the next round, in the same turn as an unanswered question.

## Step 1 — Take the requirement

Use the requirement in the user's message. If there is none, ask for it and stop. Do not invent a product.

Before asking questions, look up facts yourself: existing `docs/prd/**`, README, and any constraint docs that bound scope. Unsettled facts are not questions for the user.

## Step 2 — Grill

Map the requirement as a **design tree**. Every decision branches into the decisions that hang off it.

Work in **rounds**. The **frontier** is every decision whose prerequisites are already settled — questions you can ask now without guessing at answers you have not heard. Ask the **whole frontier in one round**. A question that depends on another question still open in this round belongs to a later round.

Each question:

```
❓ **Q1** - **<question title>**: <question body, including choices when they exist>

➡️ <your recommended answer>
```

Number every question. The recommendation is a concrete decision, not "it depends". The user may accept all recommendations in one reply.

When the user answers, record the decisions, recompute the frontier, and ask the next round. Settled decisions unblock the questions that depended on them.

These branches must be visited before the frontier is empty. Ask only the ones still open, and only when their parents are settled:

1. **Primary actor and goal** — whose goal this is, and what job they are getting done.
2. **Scope** — what is inside the system under design, and what is outside it.
3. **Stakeholders and interests** — who can hurt or be hurt, including interests that conflict.
4. **User-goal use cases** — the names and goals of the success scenarios. One primary actor and one goal per use case.
5. **Extensions that change the slice** — alternate and failure paths that are in scope, and paths that are deferred.
6. **Constraints** — rules that bound an MVP (compliance, money, latency, existing system).
7. **MVP cut** — which use cases and extensions land in MVP 1, which wait, and why that order ships a usable outcome.
8. **Documentation language** — ask only when the requirement is mixed-language, or existing `prd-mvp*.md` files use a different language. Otherwise write in the language of the requirement.

The frontier is empty only when every branch has a decision or an explicit deferral the user accepted. Then present a short shared understanding:

- primary actor and goal
- system scope
- use case list (name + one-line goal)
- MVP cut: for each MVP, its goal, the use cases it owns, and what it leaves out

Ask the user to confirm or correct it. Wait. Do not write on the confirmation turn's unanswered question. On confirmation, go to Step 3.

## Step 3 — Prepare `docs/prd/`

Glob `docs/prd`.

**Directory missing.** Ask, in the user's language, and wait:

```
❓ **Q1** - **Create docs/prd**: docs/prd does not exist. Create it and write this PRD set there? Creating it also creates docs/ if that is missing.

➡️ Yes. Create docs/prd and write the PRDs there.
```

Create the directory only after an explicit yes. On no, stop. Write nothing.

**Directory present.** Glob `docs/prd/prd-mvp*.md` and `docs/prd/prd-catalog.md`.

- None yet: write `prd-mvp1.md` onward and a new catalog.
- Some exist: ask whether to **continue** after the highest existing number, **replace** the existing `prd-mvp*.md` set and catalog, or **stop**. Recommend continue when the user is adding scope, replace when they rejected the old cut. Wait. Never overwrite a `prd-mvp*.md` the user did not agree to replace.
- Leave every other file in `docs/prd/` untouched, including `README.md` and `mvp/mvp-v1.md` from khufu-harness.

Filenames are fixed: `prd-mvp1.md`, `prd-mvp2.md`, … (no zero padding, no extra hyphen) and `prd-catalog.md`.

## Step 4 — Write the PRDs

One file per MVP. A use case belongs to exactly one MVP: the earliest MVP whose main success scenario is in scope. An extension that is deferred is **out of scope** on the earlier MVP, not a fake extension step.

MVP slicing:

- MVP 1 is the smallest slice on which the primary actor reaches the success guarantee end to end.
- Later MVPs add use cases or extensions. They do not restate earlier scenarios.
- An MVP with no use case is not an MVP. Merge it or drop it.

### `docs/prd/prd-mvp<N>.md`

```markdown
# MVP <N> — <verb-phrase goal>

- Status: draft
- Primary actor: <actor>
- Goal: <one sentence>
- Depends on: none | MVP <k>

## In scope

- UC-<N>-01 <use case name>
- UC-<N>-02 <use case name>

## Out of scope

- <deferred use case or extension> — owned by MVP <k> | not scheduled

## Use Cases

<one fully dressed use case per in-scope feature>

## MVP Open Issues

- <issues that cross use cases; omit the section if there are none>
```

### Fully dressed use case

Use this template for every feature. Do not replace it with a user story, a job story, or a feature paragraph. Translate the field labels when the document language is Chinese (see the label map). Keep the use case id in ASCII (`UC-1-01`).

```markdown
### UC-<N>-<nn> <Verb phrase from the primary actor's goal>

- **Scope**: <system under design>
- **Level**: User goal | Summary | Subfunction
- **Primary Actor**: <one actor>
- **Stakeholders and Interests**:
  - <stakeholder> — <what they need protected>
- **Preconditions**: <what must already be true>
- **Minimal Guarantees**: <what is still true on every exit, including failure>
- **Success Guarantees**: <postconditions the stakeholders care about>
- **Trigger**: <the event that starts the use case>

**Main Success Scenario**

1. <Actor> <does one action>.
2. <System> <does one action>.
3. <Actor> <does one action>.

**Extensions**

- **2a.** <condition at step 2>:
  - 2a1. <one action>.
  - 2a2. <one action, or "Use case ends.">

**Technology and Data Variations**

- <step> <variation>. Omit the section if there are none.

**Frequency**

- <how often this happens, or "unspecified">

**Open Issues**

- <unresolved point>. Omit the section if there are none.
```

Cockburn rules:

- **Level** defaults to **User goal**. Use **Summary** only for a use case that contains other user-goal use cases. Use **Subfunction** only when the user agreed to extract a step that is complex on its own. Prefer a step over a subfunction.
- The name is an active verb phrase for the primary actor's goal ("Place order"), not a module name ("Order management").
- Each scenario step is one action, active voice, present tense, and shows who holds the ball. Describe intent, not widgets: "Customer submits the order", not "Customer clicks the blue button".
- A user-goal scenario is usually 3–9 steps. If it is longer, the slice is more than one use case, or steps are UI motions.
- **Extensions** use Cockburn numbering: the step number, then a letter (`2a`, `2b`), then nested actions (`2a1`). Put the condition on the letter line. An extension either rejoins a step or ends the use case.
- Cover the alternate successes and the failures that this MVP includes. Move deferred branches to **Out of scope**.
- **Success guarantees** are postconditions, not a retelling of the steps. **Minimal guarantees** hold on the failure exits too.
- One feature, one use case. Do not bury a second goal inside extensions.

Chinese field labels, in this order: 范围, 级别, 主执行者, 干系人及其利益, 前置条件, 最小保证, 成功保证, 触发, 主成功场景, 扩展, 技术与数据变体, 发生频率, 开放问题. Levels: 用户目标, 概要, 子功能.

### `docs/prd/prd-catalog.md`

The catalog is the index of the PRD set. Rewrite it so it matches the `prd-mvp*.md` files that exist after this run.

```markdown
# PRD Catalog

Read in order: MVP 1, then MVP 2, and so on. A later MVP assumes the earlier MVPs are already true.

| MVP | PRD | Goal | Use cases | Status |
|-----|-----|------|-----------|--------|
| 1 | [prd-mvp1.md](./prd-mvp1.md) | <goal> | UC-1-01 <name>; UC-1-02 <name> | draft |
| 2 | [prd-mvp2.md](./prd-mvp2.md) | <goal> | UC-2-01 <name> | draft |
```

If `docs/prd/` contains other PRD markdown this skill does not own, add a section that only links to them. Do not edit those files.

```markdown
## Other documents

| Document | Note |
|----------|------|
| [README.md](./README.md) | Already in docs/prd. Not written by khufu-to-prd. |
```

## Step 5 — Report

After the files are written, list each path and the use case ids inside it. Stop. Do not start design, tasks, or tests.

## Example shape

```markdown
### UC-1-01 Place order

- **Scope**: Phone sales system
- **Level**: User goal
- **Primary Actor**: Customer
- **Stakeholders and Interests**:
  - Customer — receives the goods paid for, or keeps the money
  - Company — is paid and commits only stock it can ship
- **Preconditions**: The customer is identified. The catalog shows a price for the item.
- **Minimal Guarantees**: Unpaid stock is not reserved. A declined payment takes no money.
- **Success Guarantees**: Payment is captured. The warehouse has an order to ship. The customer has an order reference.
- **Trigger**: The customer asks to buy an item.

**Main Success Scenario**

1. Customer submits the item and the quantity.
2. System quotes the price and the available quantity.
3. Customer confirms the quote and the delivery address.
4. System captures payment and records the order.
5. System gives the customer the order reference.

**Extensions**

- **2a.** The requested quantity is not available:
  - 2a1. System offers the available quantity.
  - 2a2. Customer accepts the offered quantity, or the use case ends.
- **4a.** The payment is declined:
  - 4a1. System reports the decline and records no order.
  - 4a2. Use case ends.
```

## Mistakes

- Writing a PRD while a frontier question is still open.
- Creating `docs/prd/` before the user agrees.
- Filing features as "As a … I want …" stories.
- A main success scenario made of clicks.
- `mvp-v1.md`, `prd-mvp-1.md`, or `prd-mvp01.md`.
- Replacing an existing `prd-mvp*.md` the user did not agree to replace.
