---
name: khufu-to-test-cases
description: >-
  This skill should be used when the user wants test cases from a PRD, mentions "测试用例", "test cases", "test-cases", "khufu-to-test-cases", or wants one test-case document per PRD. It reads only the given PRD and writes docs/test-cases/test-cases-<prd>.md. A script classifies the user's own words. With no explicit path it asks in the reply before any scan, then asks again before generating. If none exist, it tells the user to invoke khufu-to-prd.
version: 0.1.5
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
---

# khufu-to-test-cases: One PRD, One Test-Case Document

Read one PRD and write one test-case document. Do not interview the user about how a case should be written. Do not read the implementation. The PRD is the only source. Asking which PRD to use is required, and it is not an interview about the cases.

The target project is the current working directory.

<!-- KHUFU_TO_TEST_CASES_SKILL_BODY -->

## Step 1 — Confirm whether the user provides a PRD

Start here. The first action is the script below. Do not Glob, Grep, Read, or Write before it prints a decision. Do not decide yourself that the invocation contains a path.

The script's input is **only** the user's words after `/khufu-to-test-cases`. That is `$ARGUMENTS` when the host expanded it, otherwise the text the user typed. If there were no such words, pass an empty string. Never pass this file, a directory listing, or a path you found on disk. A path written in this skill is not a path the user gave.

```bash
python3 "<this skill directory>/scripts/resolve_prd_args.py" --phase confirm -- "$ARGUMENTS"
```

`<this skill directory>` is the folder that contains this `SKILL.md`. If the script is missing, or you cannot isolate the user's words, pass an empty string. Do not guess a path. Obey only the JSON it prints:

| `decision` | What you do |
|------------|-------------|
| `use` | Step 3, and only for `paths` in that JSON. Several paths produce several test-case documents. Do not add files the script did not print. |
| `scan` | Step 1b. The user declined to give a path. |
| `no_prd` | Step 2. Do not scan. |
| `ask` | Ask in the reply, then stop. This covers an empty invocation, "指定路径" without a file, a bare filename, a directory, or an index. |
| `reason` is `refused_skill_body`, or the script did not run | Ask in the reply, then stop. Do not retry with a path taken from this file or from disk. |

`prd-catalog.md` and `README.md` are indexes. The script will not put them in `paths`.

A missing file in `paths` is not a reason to scan. Ask for another path, or whether no PRD exists, and stop.

### Ask in the reply

Write this in the reply. Do not call a question tool. The recommended answer is not the user's answer. This turn ends here. Do not scan. Do not write.

```
❓ **Q1** - **是否指定 PRD 路径**: 这次调用没有带 PRD 文件路径。请确认是否要指定。可以给出一个或多个带目录分隔符的 .md 路径。指定几份，就生成几份测试用例。

1. 指定路径 — 在回答里给出这些路径
2. 扫描已有 — 不提供路径。下一轮才扫描，扫到之后还要你选择
3. 还没有 PRD — 改走 /khufu-to-prd

直接回复 1、2、3，或回复选项原文。

➡️ 1。指定路径，并在回答里写出路径。
```

### Step 1b — Scan only after `decision` is `scan`

Use **Glob** from the project root:

- `docs/prd/**/*.md`
- `**/prd.md`
- `**/prd-mvp*.md`

Drop indexes (`prd-catalog.md`, `README.md`), anything under `docs/test-cases/`, and paths that do not exist. Keep the remaining files in path order.

**No PRD found.** Go to Step 2. Write nothing.

**One or more PRDs.** Do not generate. Number them in the reply and stop. A scan hit is not approval to write. The recommended answer is not a selection.

```
❓ **Q1** - **选择 PRD 来源**: 已扫描到下面这些 PRD。回复编号可以选择一个或多个。只为选中的文档生成测试用例。未选中的不生成。

1. <path>
2. <path>

➡️ 回复要使用的编号。
```

Use the real paths. On a later turn, run the script with `--phase select` on that reply only:

```bash
python3 "<this skill directory>/scripts/resolve_prd_args.py" --phase select -- "$ARGUMENTS"
```

- `select` uses only those 1-based `indexes` from the list you showed. Drop indexes that are not in the list.
- `select_all` uses that whole list, because the user said so.
- `use` uses only `paths` from that JSON.
- Any other decision ignores the scan. Do not generate the scanned files.
- Do not run `--phase select` before this list exists. Without the flag, a reply of `2` means "扫描已有", not "the second file".

Choosing the files yourself is a failure. Writing one test-case document per scanned PRD because the user did not object is a failure.

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

Reach this step only when the script printed `"decision": "use"`, or when a later reply's script result selects numbers from a list Step 1b already showed. A scan result is not enough. The sentence below, "读完后直接写文件", applies only after that selection exists.

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
