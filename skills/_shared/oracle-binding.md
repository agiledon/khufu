# Oracle Binding

Bind a test to the real entry point, and lock the assertion to the test case. Do this before generating any API or E2E test that has a test case in scope.

The test case decides whether the behavior is right. The code decides where the test calls. Do not invent a second contract from the test-case prose, and do not copy the implementation's current result into the assertion.

## Inputs

A run may have one side or both:

- **Test cases**: `docs/test-cases/test-cases-*.md`, or a path the user passed. Use a case only when its 测试层 matches this skill: `API` for khufu-api, `界面` for khufu-e2e.
- **Code**: the routes, handlers, and OpenAPI document generated from the code (API), or the pages, components, and accessible roles (E2E).

If only one side exists, do not pretend the other exists.

## Binding

One test case binds to one entry. Do not guess.

| Layer | Binding key | Entry comes from |
|-------|-------------|------------------|
| API | test-case id + HTTP method + path | A route, controller, or code-generated OpenAPI operation that exists in the tree |
| E2E | test-case id + page or journey + observable result | A real page and a selector or accessibility role that exists in the UI code |

A case is **unbound** when no entry matches, or when two or more entries match equally well. Leave it unbound. Do not pick one.

What code may supply: method, path, the request fields that entry actually accepts, the page, and a selector or role that is already in the source.

What code may not supply: the expected status, response fields, whether an exception is thrown, whether a row is persisted, or the observable UI result. Those come only from that case's 期望结果 and 测试数据.

Handler return values, recorded sample responses, and the current page copy confirm that the entry exists. They are not oracles. Never rewrite an assertion so that it matches what the code does today.

## What to generate

- **Bound case**: generate the test. Call the bound entry. Assert the test case's expected result, even when that will fail against the current implementation. A failing assertion is the check working.
- **Unbound case**: do not generate a test for it. Append it to the mismatch report.
- **Code with no test case**: generating a test is optional. If you generate one, tag it `implementation-derived`. It does not show that a user expectation passed. List these apart from bound cases in the report.

## Mismatch report

Write `docs/khufu/api/oracle-mismatch.md` or `docs/khufu/e2e/oracle-mismatch.md`, matching the skill. Create the directory if needed. Do not modify the PRD, the test-case file, or product code.

One row per unbound case, and a separate section for `implementation-derived` tests if any were written:

```markdown
# Oracle mismatch — <api|e2e>

| 用例编号 | 代码位置 | 缺少 | 用例期望 |
|----------|----------|------|----------|
| TC-UC-1-01-01 | none | 路径 | 支付被收取。仓库存在一张待发货订单。 |

## implementation-derived

| 入口 | 说明 |
|------|------|
| POST /api/health | 无对应用例。断言来自实现，不能当作需求已通过。 |
```

缺少 is one of `路径`, `字段`, `界面元素`, or `多个候选`. 用例期望 is the case's 期望结果, copied, not paraphrased into the implementation's result. 代码位置 is the file and symbol you compared, or `none` when nothing matched.

After the report, continue generating tests only for bound cases. Tell the user how many cases were bound, how many were left in the report, and that they choose whether to change the code or the test case.
