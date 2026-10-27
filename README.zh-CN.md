# Khufu

[English](./README.md) | **简体中文**

面向 AI IDE 的测试生成技能框架，遵循**测试金字塔**方法，并采用**评估驱动开发（EDD）**与**规约驱动开发（SDD）**。

Khufu 提供七项技能——`/khufu-ut`、`/khufu-it`、`/khufu-api`、`/khufu-e2e`、`/khufu-harness`、`/khufu-to-prd` 与 `/khufu-to-test-cases`。它们借助 AI 智能体，为项目生成单元测试、集成测试、API 测试、端到端测试、项目约束资产（Harness Engineering）、按 MVP 划分的 PRD，以及可回溯到 PRD 的测试用例。

## 特性

- **测试金字塔**：覆盖全部四层测试，并内置去重——上层只测下层在结构上测不到的内容
- **评估驱动开发（EDD）**：生成测试之前，先定义可量化的质量标准（覆盖率、性能、正确性）。每条测试都服务于一项可度量的评估标准。内置 `评估 → 验证 → 改进` 反馈闭环
- **规约驱动开发（SDD）**：测试用例是显式、带版本的 Markdown 规约文件（`specs/<feature>/spec.v<N>.md`）。支持正向生成（规约 → 测试）与反向生成（测试 → 规约）。每条测试都链回对应的规约条目
- **两条生成路径**：
  - **基于规约**：从规约文档生成测试（`/khufu-ut @docs/spec.md`）
  - **基于代码**：阅读现有实现生成测试（并自动补写回溯规约）
- **语言感知**：自动识别项目语言，并推荐合适的测试框架
- **可测试性评估**（UT）：将源文件评为 A/B/C——可直接测试、需要 PowerMock（标记为 `fragile`），或需要重构（记入 `untestable-report.md`）
- **H2 数据库支持**（IT）：为 Java 集成测试提供轻量内存数据库选项——无需 Docker，启动时间小于 5 秒，便于在 CI 中快速得到反馈
- **共享测试数据工厂**：测试数据定义一次，在 IT、API、E2E 各层复用
- **对齐 TDD**：测试遵循测试驱动开发与敏捷实践
- **需求到 PRD**：`/khufu-to-prd` 追问需求描述，将其拆成多个 MVP，并按 Cockburn 完全正式用例写入 `docs/prd/`（`prd-mvp1.md`、`prd-mvp2.md`……以及 `prd-catalog.md`）
- **PRD 到测试用例**：`/khufu-to-test-cases` 读取一份 PRD，在 `docs/test-cases/` 写下对应的一份用例文档（`test-cases-prd-mvp1.md`……）。基本流、备选流，以及需要单独断言的业务规则，各写一条
- **多 IDE 支持**：可安装到 Claude Code、Cursor、OpenCode、Codex、Qoder 与 Trae——每个工具都按自身的技能/命令目录约定放置技能

## 快速开始

```bash
# 全局安装
npm install -g khufu-kit

# 在项目中初始化
cd your-project
khufu init

# 对照 npm 上的最新版本，有更新则升级
khufu update

# 在 IDE 中使用技能（以 Claude Code 为例）
/khufu-ut          # 生成单元测试
/khufu-it          # 生成集成测试
/khufu-api         # 生成 API 测试
/khufu-e2e         # 生成端到端测试
/khufu-harness     # 建立 / 更新项目约束资产
/khufu-to-prd      # 追问需求并生成按 MVP 划分的 PRD
/khufu-to-test-cases @docs/prd/prd-mvp1.md   # 把该 PRD 生成测试用例
```

## 支持的智能体编程工具

Khufu 按各工具自己的技能/命令目录约定安装技能，因此同一条 `khufu init` 在所有工具中都能使用：

| 工具 | 技能/命令目录（项目内） | 全局目录 |
|------|------------------------|----------|
| Claude Code | `.claude/skills/` | `~/.claude/skills` |
| Cursor | `.cursor/commands/` | `~/.cursor/commands` |
| OpenCode | `.opencode/commands/` | `~/.opencode/commands` |
| Codex (OpenAI) | `.codex/skills/` | `~/.codex/skills` |
| Qoder | `.qoder/skills/` | `~/.qoder/skills` |
| Trae | `.trae/skills/` | `~/.trae/skills` |

为其中一个或多个工具安装：

```bash
khufu init --ide claude,qoder,trae
```

每个被选中的工具都会在自己的目录中收到全部七项技能（`khufu-ut`、`khufu-it`、`khufu-api`、`khufu-e2e`、`khufu-harness`、`khufu-to-prd`、`khufu-to-test-cases`）。

## 更新

`khufu update` 将已安装版本与 npm 上最新发布的 `khufu-kit` 进行比较：

- 若有更新版本，则执行升级（交互模式下会先询问确认）。
- 否则提示当前已是最新版本。

```bash
khufu update       # 交互模式——升级前询问
khufu update -y    # 直接升级，不再询问
```

## 支持的语言（v0.2）

| 语言 | UT 框架 | IT 框架 | API 框架 | E2E 框架 |
|------|---------|---------|----------|----------|
| Java | JUnit 5/4, TestNG | Spring Boot Test, Testcontainers, **H2** | REST Assured, MockMvc | Playwright, Selenium |
| Python | pytest, unittest | pytest + testcontainers | pytest + httpx | Playwright |
| TypeScript/JS | Jest, Vitest, Mocha | Jest + Supertest | Supertest | Playwright, Cypress |
| Go | testing + testify | testing + dockertest | testing + httptest | Playwright |
| C# | xUnit, NUnit, MSTest | xUnit + Testcontainers | RestSharp | Playwright |

## 测试金字塔策略

Khufu 强制执行**互不重叠的测试金字塔**。每一层负责一个独立的风险维度：

| 层级 | 负责 | 不负责 |
|------|------|--------|
| **UT** | 业务逻辑、算法、校验、状态迁移 | 数据库查询、HTTP 路由、UI |
| **IT** | 组件装配、事务边界、ORM 映射、数据库约束 | 业务逻辑细节、HTTP 状态码 |
| **API** | 状态码、响应结构、请求头、认证/鉴权、内容协商 | 组件内部实现、数据库状态 |
| **E2E** | 关键用户旅程、多页面流程、浏览器交互 | 边界校验、穷举错误路径 |

在某一层生成测试时，khufu 会扫描下层已有测试，并跳过不会带来新风险的场景——让测试套件保持精简、快速。

## 规约体系（SDD）

Khufu 把测试规约当作一等产物。每个功能对应一份带版本的 Markdown 规约：

```
specs/
├── UserRegistration/
│   ├── spec.v1.md        # 带版本的规约
│   ├── spec.v2.md
│   └── CHANGELOG.md      # 规约变更历史
```

每份规约文件包含：

```markdown
# Feature: UserRegistration
- Version: 1 | Created: 2026-06-25 | Source: spec-based | Criticality: High

## Evaluation Criteria          ← EDD: defined BEFORE tests
### Correctness（正确性）
- [ ] Normal input returns User with ID
- [ ] Duplicate email throws DuplicateEmailException

## Unit Tests
### UT-USER-001: shouldCreateUser_whenValidInputGiven
- Category: happy-path | Status: implemented
- Test File: `__tests__/UserService.test.ts`
- Evaluates: Correctness — normal input returns User
**Scenario:** Given ... When ... Then ...

## Evaluation Summary           ← EDD: filled AFTER test execution
| Criteria | Target | Actual | Status |
|----------|--------|--------|--------|
| Line coverage | ≥85% | 88% | ✅ |
| Branch coverage | ≥75% | 72% | ❌ |
```

规约生命周期：`planned → implemented → evaluated → passed`（未达标项会触发重新评估）。

## 脆弱测试处理

对于难以用常规 mock 拆开的紧耦合代码，khufu-ut 提供：

- Java 的 **PowerMock / Mockito-inline** 支持（静态方法、构造函数、final 类）
- 此类测试一律标记 `@Tag("fragile")`，并且**默认不进入 CI**
- 脆弱测试按技术债跟踪——目标是不超过测试套件的 20%
- 不可测代码（C 级）记入 `untestable-report.md`，并附重构建议

## 配置

执行 `khufu init` 后，项目根目录会生成 `khufu.yaml`：

```yaml
ide: [claude, qoder, trae]
language: typescript
frameworks:
  ut: jest
  it: jest
  api: supertest
  e2e: playwright
directories:
  ut: __tests__/
  it: __tests__/integration/
  api: __tests__/api/
  e2e: e2e/
coverage:
  ut:
    tool: jest
    thresholds: { line: 80, branch: 70, function: 80 }
    formats: [lcov, html, text]
    excludes: ['**/*.d.ts', '**/index.ts', '**/*.config.*']
  it:
    tool: jest
    thresholds: { line: 60, branch: 50 }
    formats: [lcov, html]

# 脆弱测试管理（v0.2）
categories:
  fragile:
    excludeFromCI: true
    runOnSchedule: weekly

# 规约体系（v0.2）
spec:
  enabled: true
  directory: specs/
  format: markdown
  versioning: file-based
  autoGenerateFromTests: true

# 评估驱动开发（v0.2）
evaluation:
  enabled: true
  failOnUnmetCriteria: warning
  dimensions: [correctness, coverage, performance, maintainability]
  thresholds:
    ut: { lineCoverage: 80, branchCoverage: 70, maxTestMs: 100, maxFragileRatio: 20 }
    it: { lineCoverage: 60, branchCoverage: 50, maxTestMsH2: 2000, maxTestMsPostgres: 10000 }

# 共享测试数据（v0.2）
dataFactories:
  directory: tests/factories/
  reuseAcrossLayers: true

scope: project
```

## 架构

```
skills/
├── _shared/                       # 共享模块（v0.2）
│   ├── mode-selection.md          # 基于规约 vs 基于代码
│   ├── language-detection.md      # 语言与框架检测
│   ├── framework-selector.md      # 按语言 × 层级选择框架
│   ├── directory-resolver.md      # 测试目录解析
│   ├── coverage-config.md         # 覆盖率工具配置
│   ├── report-template.md         # 统一报告生成
│   ├── test-data-factories.md     # 共享数据工厂模式
│   ├── test-pyramid-strategy.md   # 分层去重规则
│   └── evaluation-framework.md    # EDD 方法
├── khufu-ut/SKILL.md              # 单元测试生成器
├── khufu-it/SKILL.md              # 集成测试生成器
├── khufu-api/SKILL.md             # API 测试生成器
├── khufu-e2e/SKILL.md             # 端到端测试生成器
├── khufu-harness/SKILL.md         # 约束资产生成器
├── khufu-to-prd/SKILL.md          # 按 Cockburn 用例编写的 MVP PRD
└── khufu-to-test-cases/SKILL.md   # 由 PRD 生成 docs/test-cases
```

技能通过 Read 工具委托引用 `_shared/` 模块——共享逻辑只定义一次，由四个技能共同使用。

## 开发

### 在本仓库中开发

一条命令把技能软链接到位，Claude Code 会直接从工作区加载它们：

```bash
git clone https://github.com/agiledon/khufu.git
cd khufu
npm install
npm run build
npm run setup    # 为本地开发创建软链接
```

`setup` 会做这些事：

- 将 `skills/_shared/` 软链接到项目根目录的 `_shared/`（这样技能文件里的 `Read _shared/...` 引用才能正确解析）
- 将每个 `skills/khufu-*/` 软链接到 `.claude/skills/khufu-*/`（Claude Code 从 `.claude/skills/` 加载技能）
- 替换先前 `khufu init` 留下的过期副本

设置完成后，直接编辑 `skills/` 下的任意文件，改动立即生效——无需重新构建，也无需再复制一次。

```bash
npm test         # 运行 khufu 自身的测试
npm run dev      # 监听模式（tsc --watch）
```

### 从本地源码安装到其他项目

用 `npm link` 把本地 khufu CLI 注册为全局命令，再在目标项目中初始化：

```bash
# 第 1 步：从源码构建 khufu-kit
cd /path/to/khufu-kit
npm install
npm run build
npm link                    # 全局注册 khufu 命令

# 第 2 步：安装到你的项目
cd /path/to/your-project
khufu init                  # 创建 khufu.yaml，并把技能安装到所选 IDE 的技能/命令目录
```

修改 khufu-kit 源码后，这样获取更新：

```bash
cd /path/to/khufu-kit
npm run build               # 重新编译 TypeScript
# khufu 命令会自动使用更新后的构建产物（npm link）
```

用完后取消全局链接：

```bash
cd /path/to/khufu-kit
npm unlink -g khufu-kit
```

也可以用本地路径直接 `npm install`（不注册全局链接）：

```bash
cd /path/to/your-project
npm install /path/to/khufu-kit
npx khufu init
```

## 许可证

MIT
