# Feature: UserRegistration

- **Version:** 1
- **Created:** 2026-06-25
- **Source:** spec-based
- **Criticality:** High

---

## Evaluation Criteria

> **评测原则：** 以下标准在编写任何测试前确定。每个测试用例必须能对号入座至少一条评测标准。不服务于任何评测标准的测试是冗余的，应被移除。

### Correctness（正确性）

- [ ] 正常输入下，createUser() 返回含 ID 的 User 对象
- [ ] 重复邮箱时抛出 DuplicateEmailException，含明确错误消息
- [ ] 空用户名/NULL 输入时抛出 ValidationException

### Robustness（鲁棒性）

- [ ] 并发创建同一邮箱 → 仅一个成功，其他返回 409 Conflict
- [ ] Repository 层异常 → Service 不吞异常，向上传播

### Performance（性能预算）

- [ ] UT 层级：每个测试 < 100ms
- [ ] IT 层级：持久化相关测试 < 2s（H2）/ < 10s（PostgreSQL）

### Coverage（覆盖目标）

- [ ] 行覆盖率 ≥ 85%，分支覆盖率 ≥ 75%
- [ ] 所有 public 方法至少 1 个 happy path + 1 个 error path

### Maintainability（可维护性）

- [ ] 测试命名遵循 `should<Expected>_when<Condition>` 规范
- [ ] 无测试间共享可变状态（测试独立）
- [ ] Fragile 测试已标记，数量 ≤ 总测试数的 20%

---

## Unit Tests

### UT-USER-001: shouldCreateUser_whenValidInputGiven

- **Category:** happy-path
- **Status:** implemented
- **Test File:** `__tests__/UserService.test.ts`
- **Evaluates:** Correctness — 正常输入返回 User

**Scenario:**
> **Given** 有效的用户名和邮箱
> **When** 调用 `UserService.createUser()`
> **Then** 返回 User 对象，含生成的 ID，并调用 `UserRepository.save()` 一次

---

### UT-USER-002: shouldThrowException_whenDuplicateEmail

- **Category:** error-path
- **Status:** implemented
- **Test File:** `__tests__/UserService.test.ts`
- **Tags:** `fragile`
- **Evaluates:** Correctness — 重复邮箱异常

**Scenario:**
> **Given** 邮箱 `test@example.com` 已存在于数据库
> **When** 调用 `UserService.createUser()` 使用相同邮箱
> **Then** 抛出 `DuplicateEmailException`，消息包含 "email already exists"

---

### UT-USER-003: shouldThrowValidationException_whenNameIsEmpty

- **Category:** error-path
- **Status:** planned
- **Test File:** `__tests__/UserService.test.ts`（待创建）
- **Evaluates:** Correctness — 空用户名校验

**Scenario:**
> **Given** 用户名为空字符串
> **When** 调用 `UserService.createUser()`
> **Then** 抛出 `ValidationException`

---

## Integration Tests

### IT-USER-001: shouldPersistUserToDatabase

- **Category:** persistence
- **Status:** implemented
- **Test File:** `__tests__/integration/UserServiceIT.test.ts`
- **Evaluates:** Robustness — 数据实际持久化

**Scenario:**
> **Given** H2 测试数据库已初始化
> **When** 通过 UserService 创建用户
> **Then** 直接在数据库中查询到该用户记录，字段值完全匹配

---

### IT-USER-002: shouldRollbackOnDuplicateEmail

- **Category:** transaction
- **Status:** planned
- **Test File:** `__tests__/integration/UserServiceIT.test.ts`（待创建）
- **Evaluates:** Robustness — 事务回滚

**Scenario:**
> **Given** 数据库已存在邮箱 `test@example.com`
> **When** 通过 UserService 创建相同邮箱的用户
> **Then** 数据库中仍只有一条记录（事务回滚成功）

---

## API Tests

### API-USER-001: shouldReturn201_whenValidUserPosted

- **Category:** happy-path
- **Status:** planned
- **Test File:** `__tests__/api/user.api.test.ts`（待创建）
- **Evaluates:** Correctness — HTTP 契约正确

**Scenario:**
> **Given** 有效的 JSON 请求体 `{"name": "Alice", "email": "alice@example.com"}`
> **When** `POST /api/users`
> **Then** 返回 `201 Created`，响应体含 `id`、`name`、`email`，`Content-Type: application/json`

---

### API-USER-002: shouldReturn422_whenEmailMissing

- **Category:** error-path
- **Status:** planned
- **Test File:** `__tests__/api/user.api.test.ts`（待创建）
- **Evaluates:** Contract — 错误格式一致性

**Scenario:**
> **Given** JSON 请求体缺少 `email` 字段
> **When** `POST /api/users`
> **Then** 返回 `422 Unprocessable Entity`，响应体含 `error` 对象和 `message` 字段

---

## E2E Tests

### E2E-USER-001: userCanRegisterAndLogin

- **Category:** critical-flow
- **Status:** planned
- **Test File:** `e2e/register.spec.ts`（待创建）
- **Evaluates:** Correctness — 关键用户旅程完整

**Scenario:**
> **Given** 用户在注册页 `/register`
> **When** 填写姓名、邮箱、密码，点击 "Sign Up"
> **Then** 跳转至 `/welcome`，页面显示 "Welcome, Alice"，且收到欢迎邮件

---

## Evaluation Summary

| Criteria | Target | Actual | Status |
|----------|--------|--------|--------|
| UT 覆盖率 (line) | ≥85% | 88% | ✅ |
| UT 覆盖率 (branch) | ≥75% | 72% | ❌ |
| Fragile 测试占比 | ≤20% | 15% (3/20) | ✅ |
| UT 平均耗时 | <100ms | 45ms | ✅ |
| IT 平均耗时 (H2) | <2s | 1.2s | ✅ |
| Public 方法覆盖 | 100% | 100% (5/5) | ✅ |

**Evaluation Date:** 2026-06-25
**Evaluated By:** khufu-ut v0.2.1

**Open Issues:**
- [ ] 分支覆盖率差 3%，需补充 `createUser()` 中 null-check 分支的测试（对应 UT-USER-003）
- [ ] API-USER-001、API-USER-002、E2E-USER-001 尚未实现，规约状态为 `planned`
