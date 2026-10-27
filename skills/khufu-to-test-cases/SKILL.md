---
name: khufu-to-test-cases
description: >-
  This skill should be used when the user wants test cases from a PRD, mentions "测试用例", "test cases", "test-cases", "khufu-to-test-cases", or wants one test-case document per PRD. It reads only the given PRD and writes docs/test-cases/test-cases-<prd>.md. Invoking the skill with no path still requires a question-tool confirmation before any scan. On OpenCode that tool is question, not AskUserQuestion. Scanned PRDs are a cursor multi-select and are not generated until the user selects them. If none exist, it tells the user to invoke khufu-to-prd.
version: 0.1.4
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - question
  - AskUserQuestion
---

# khufu-to-test-cases: One PRD, One Test-Case Document

Read one PRD and write one test-case document. Do not interview the user about how a case should be written. Do not read the implementation. The PRD is the only source. Asking which PRD to use is required, and it is not an interview about the cases.

The target project is the current working directory.

## Step 1 — Confirm whether the user provides a PRD

Start here. Do not scan or write before this step finishes. `/khufu-to-test-cases` with no path and no other words is not permission to scan or to write. An empty `$ARGUMENTS` is the same case.

An explicit PRD is a file path or `@path` the user wrote. Several paths are allowed. Each file is one source and produces one test-case document. Do not merge them.

`prd-catalog.md` and `docs/prd/README.md` are indexes, not PRDs. Never offer them and never read them as input.

**The invocation already contains one or more PRD paths.** Skip the question below. Read each file and go to Step 3. If a path is missing, ask once for another path, or whether no PRD exists. Stop. Do not scan on that turn. Confirmation that none exists goes to Step 2.

**The invocation does not contain a PRD path.** Ask the user to confirm whether they will provide one. This question is the whole of this turn.

OpenCode does not have `AskUserQuestion`. Its picker is the **`question`** tool. The user moves the cursor up and down inside that tool. A markdown list is not that picker. If `question` is in the tool list, the first tool call must be `question`. Do not call Glob, Grep, Read, Bash, or Write on that turn.

`AskUserQuestion` is only for Claude Code, and only when that exact tool is in the tool list. On OpenCode, `AskUserQuestion` is not a tool. Failing to find it is not a reason to scan. Do not recover by searching the project.

If neither `question` nor `AskUserQuestion` is available, stop and say so. Write nothing.

Call the host question tool once. One question. Single select. No option is pre-selected. End the turn. A recommended option is not the user's answer.

OpenCode call:

```json
{
  "questions": [
    {
      "question": "是否指定 PRD 文档或 PRD 路径？可以指定一份或多份。指定几份，就生成几份测试用例。",
      "header": "PRD 来源",
      "multiple": false,
      "custom": true,
      "options": [
        {
          "label": "指定路径",
          "description": "接下来给出一个或多个 PRD 文件路径"
        },
        {
          "label": "扫描已有",
          "description": "不提供路径或目录。扫描后用上下键多选，扫描结果不会直接生成"
        },
        {
          "label": "还没有 PRD",
          "description": "改走 /khufu-to-prd。现在不扫描，也不写文件"
        }
      ]
    }
  ]
}
```

Match the live `question` schema if it wraps the fields differently. Keep this header, this question, these three options, `multiple: false`, and `custom: true`.

Then wait for the tool result:

- **指定路径**, and the answer already contains one or more paths → Step 3 for each path.
- **指定路径**, with no path yet → call `question` again and ask for the paths. Stop. Do not scan while waiting.
- **扫描已有** → this is the only permission to scan. Go to Step 1b. Do not scan in the same turn as this question.
- **还没有 PRD** → Step 2. Do not scan.
- Tool error, dismiss, or no result → stop. Write nothing. Do not scan to recover.

### Step 1b — Scan only after the user chooses not to provide a path

Scan only after Step 1 returns **扫描已有**. Use **Glob** from the project root:

- `docs/prd/**/*.md`
- `**/prd.md`
- `**/prd-mvp*.md`

Drop indexes (`prd-catalog.md`, `README.md`), anything under `docs/test-cases/`, and paths that do not exist. Keep the remaining files in path order.

**No PRD found.** Go to Step 2. Write nothing.

**One or more PRDs.** Do not generate. Call **`question`** (OpenCode) or **AskUserQuestion** (Claude Code) and end the turn. A scan hit is not approval to write.

OpenCode call, with one option per scanned file and `multiple: true`:

```json
{
  "questions": [
    {
      "question": "选择作为测试用例来源的 PRD。用上下键移动光标，选择一个或多个。只为选中的文档生成测试用例。",
      "header": "选择 PRD",
      "multiple": true,
      "custom": false,
      "options": [
        {
          "label": "prd-mvp1.md",
          "description": "docs/prd/prd-mvp1.md"
        }
      ]
    }
  ]
}
```

Replace the example option with the real files. `label` is the filename. `description` is the full path. Do not add a "全部生成" option. Do not pre-select any option.

If one question cannot hold every file, split them across questions in the same `question` call. Every question has `multiple: true`. Do not drop a file, and do not write a file the user had no way to select.

When the tool returns:

- One or more selected paths → Step 3 for those paths only.
- No option selected → write nothing.
- No tool result → write nothing. Do not scan again. Do not generate the scanned files.

Printing the paths in a markdown list and then writing the test cases is a failure. Choosing the files yourself is a failure. Writing one test-case document per scanned PRD because the user did not object is a failure.

## Output path

Write under `docs/test-cases/`, not beside the PRD.

- One PRD file produces one test-case file.
- Name it `docs/test-cases/test-cases-<prd stem>.md`.
  `docs/prd/prd-mvp1.md` → `docs/test-cases/test-cases-prd-mvp1.md`.
  `prd.md` → `docs/test-cases/test-cases-prd.md`.
- If `docs/test-cases/` does not exist, create it, including `docs/` when that is missing. Do not ask first.
- If that test-case file already exists, replace it.
- Do not modify the PRD. Do not write a second copy next to the PRD.
- `prd-catalog.md` is an index, not a PRD. Never use it as input.

The generation rules below say the output is `test-cases.md` in the PRD's directory. That sentence is replaced by this output path. The expansion rules and the ten fields stay as written.

## Step 2 — No PRD: point at khufu-to-prd

When no PRD exists, do not invent one and do not write test cases. Do not start the khufu-to-prd interview. Tell the user to invoke that skill, then stop:

```
当前没有可用的 PRD。请改用 /khufu-to-prd。

/khufu-to-prd 会追问需求，确认后写入 docs/prd/prd-mvp1.md、prd-mvp2.md，并用 docs/prd/prd-catalog.md 做目录。
PRD 写好之后，再生成测试用例。一个 PRD 对应一份测试用例文档：

/khufu-to-test-cases @docs/prd/prd-mvp1.md
/khufu-to-test-cases @docs/prd/prd-mvp1.md @docs/prd/prd-mvp2.md
```

## Step 3 — Read the PRD and write

Reach this step only with paths the user wrote, or paths returned by the `question` / AskUserQuestion tool. A scan result is not enough. The sentence below, "读完后直接写文件", applies only after that selection exists.

Do this once per selected PRD. Read that whole PRD, then write its test-case file. No further questions about the cases. Several selected PRDs produce several files. Do not merge them. Do not write a file for a PRD the user did not select.

Create `docs/test-cases/` if it is missing, then write `docs/test-cases/test-cases-<prd stem>.md`.

## 生成规则

输入只有已经选定的 `prd.md`。来源选定之后，读完直接写文件。来源还没选定时，不要执行本节。

### 展开

1. 每个用例的基本流写一条。
2. 每条备选流、异常流或失败语义各写一条。
3. 需要单独断言的 BR-xx 再各写一条。
4. 编号写成 `TC-<需求号>-<序号>`，序号在该需求内从 01 递增。关联字段原样保留 UC-xx、步骤号和 BR-xx。

完成标准：prd.md 里每一条基本流、备选流和需独立断言的 BR，在测试用例文档里都有一条用例，编号可对回原文。

一条 BR 需要单独断言，仅当没有任何一条流的期望结果已经逐项覆盖它。已被某条流逐项覆盖的 BR 不再另写一条。PRD 里没有 BR-xx 时，跳过第 3 条，不要编造 BR 编号。

khufu-to-prd 写成的 Cockburn 用例按下面这张表展开，不改第 1–4 条的计数：

| prd.md 中的说法 | khufu-to-prd 里对应 | 写几条 |
|-----------------|---------------------|--------|
| 基本流 | 主成功场景 / Main Success Scenario | 一条 |
| 备选流、异常流或失败语义 | 每一条扩展 / Extension | 各一条 |
| 后置条件 | 成功保证；该失败路径的结束状态；这条路径要守住的最小保证 | 写入期望结果，不另计一条 |
| 前置条件 | 前置条件 | 写入前置 |
| BR-xx | PRD 中写明的 BR-xx | 仅需单独断言时各一条 |

需求号使用 PRD 里的原编号。khufu-to-prd 的用例用 UC 编号，例如 `UC-1-01`。同一需求内的序号从 `01` 起，顺序固定：基本流，然后按 PRD 中的书写顺序写每条备选流、异常流、失败语义，最后按书写顺序写需单独断言的 BR。

`UC-1-01` 的主成功场景与扩展 `2a`、`4a` 编号为 `TC-UC-1-01-01`、`TC-UC-1-01-02`、`TC-UC-1-01-03`。

### 每条用例的字段

按此顺序写，缺一不可：

- 编号
- 关联
- 标题：可观察结果
- 优先级
- 前置：来自该用例的前置条件
- 测试数据：来自数据域和结果表，写具体值
- 步骤：可重做的操作顺序
- 期望结果：HTTP状态、响应字段、是否抛异常、是否落库。后置条件里的每一项都要落到期望里
- 测试层：单元、API或界面
- 评审状态：待评审

完成标准：每条用例十个字段都有内容，期望结果能逐项对上 prd.md 的后置条件或对应 BR。

填写时遵守：

- **关联**照抄 PRD 中的 UC-xx、步骤号、BR-xx。基本流写 `UC-1-01 主成功场景`。扩展写 `UC-1-01 扩展 4a`。业务规则写 `BR-03`。不要改编号。
- **标题**写可观察的结果，不写操作过程。
- **优先级**只写 `高` 或 `中`。基本流，以及破坏成功保证的异常流、失败语义，写 `高`。其余备选流和单独断言的 BR 写 `中`。
- **前置**只使用该用例在 PRD 中的前置条件。PRD 没有写的，写 `无`，不要留空。
- **测试数据**写具体值。PRD 有数据域或结果表时，从中取值。没有表时，用场景里已经出现的数量、金额、标识补成具体值，不读取代码，不另造行为。
- **步骤**是可以重做的操作顺序。一步一件事。不写「验证系统正确」。
- **期望结果**逐项写下后置条件或该 BR。PRD 涉及的 HTTP 状态、响应字段、是否抛异常、是否落库，每一项都要出现。没有涉及的项不要编造。
- **测试层**只写一个：界面操作写 `界面`；可观察结果是 HTTP 状态或响应体写 `API`；没有界面也没有 HTTP、只断言领域规则、异常或计算时写 `单元`。
- **评审状态**固定为 `待评审`。

## 文件形状

```markdown
# 测试用例 — prd-mvp1.md

来源：docs/prd/prd-mvp1.md

## TC-UC-1-01-01

- **编号**：TC-UC-1-01-01
- **关联**：UC-1-01 主成功场景
- **标题**：支付被收下，仓库收到待发货订单，顾客拿到订单号
- **优先级**：高
- **前置**：顾客已识别。商品目录中该商品有标价。
- **测试数据**：顾客 C-1001；商品 SKU-7；数量 2；单价 10.00；收货地址「上海市徐汇区某路 1 号」
- **步骤**：
  1. 顾客提交 SKU-7，数量 2。
  2. 系统报出总价 20.00 和可售数量。
  3. 顾客确认报价和收货地址。
  4. 系统收取支付并记录订单。
- **期望结果**：
  - 支付被收取。
  - 仓库存在一张待发货订单。
  - 顾客得到订单号。
  - 不抛异常。
  - 订单被落库。
- **测试层**：API
- **评审状态**：待评审

## TC-UC-1-01-02

- **编号**：TC-UC-1-01-02
- **关联**：UC-1-01 扩展 4a
- **标题**：支付被拒绝，不产生订单，不收款
- **优先级**：高
- **前置**：顾客已识别。商品目录中该商品有标价。报价已确认。
- **测试数据**：顾客 C-1001；商品 SKU-7；数量 2；支付结果 declined
- **步骤**：
  1. 顾客提交 SKU-7，数量 2，并确认报价与地址。
  2. 支付返回 declined。
- **期望结果**：
  - 系统告知支付被拒绝。
  - 不记录订单。
  - 不收款。
  - 不抛出未处理异常。
  - 不落库。
- **测试层**：API
- **评审状态**：待评审
```

## Step 4 — Check, then report

Before finishing, check the file:

- Each main flow, each alternate or failure flow, and each BR that needs its own assertion has one case.
- Each case has all ten fields, in the order above, and none are empty.
- Expected results itemize the postconditions or the BR.
- Each `TC-...` id and its 关联 point back to text in the PRD.

Then tell the user the output path, the case count, and the list of `编号 → 关联`. Stop. Do not generate test code.
