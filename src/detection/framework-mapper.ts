import type { PyramidLevel } from '../registry/types.js';

export interface Framework {
  name: string;
  language: string;
  level: PyramidLevel;
  description: string;
  recommendation: 'primary' | 'alternative' | 'legacy';
  dependencies?: string[];
  configExample?: string;
}

/** Coverage tool definition for a language */
export interface CoverageTool {
  name: string;
  language: string;
  description: string;
  /** How to invoke (e.g., "mvn verify jacoco:report", "pytest --cov") */
  runCommand: string;
  /** Configuration snippet for the build tool */
  configExample: string;
  /** Output formats supported */
  formats: string[];
  /** Minimum recommended thresholds */
  recommendedThresholds: {
    ut: { line: number; branch: number };
    it: { line: number; branch: number };
  };
}

/**
 * Map of language -> coverage tool recommendation.
 */
export const COVERAGE_TOOL_MAP: Record<string, CoverageTool> = {
  java: {
    name: 'JaCoCo',
    language: 'java',
    description:
      'Java Code Coverage library integrated with Maven/Gradle. Generates HTML, XML, and CSV reports. Widely used in Java ecosystem with CI/CD integration.',
    runCommand: 'mvn verify jacoco:report',
    configExample: `<!-- Maven pom.xml -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.11</version>
  <executions>
    <execution>
      <goals>
        <goal>prepare-agent</goal>
      </goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals>
        <goal>report</goal>
      </goals>
    </execution>
  </executions>
  <configuration>
    <rules>
      <rule>
        <limits>
          <limit>
            <counter>LINE</counter>
            <value>COVEREDRATIO</value>
            <minimum>0.80</minimum>
          </limit>
        </limits>
      </rule>
    </rules>
  </configuration>
</plugin>`,
    formats: ['html', 'xml', 'csv'],
    recommendedThresholds: {
      ut: { line: 80, branch: 70 },
      it: { line: 60, branch: 50 },
    },
  },

  python: {
    name: 'pytest-cov',
    language: 'python',
    description:
      'pytest plugin for coverage reporting using coverage.py. Generates terminal, HTML, and XML reports. Integrates seamlessly with pytest.',
    runCommand: 'pytest --cov=. --cov-report=html --cov-report=term --cov-report=xml',
    configExample: `# pyproject.toml
[tool.coverage.run]
omit = ["tests/*", "**/migrations/*", "**/__init__.py"]

[tool.coverage.report]
show_missing = true
fail_under = 80
exclude_lines = [
  "pragma: no cover",
  "raise NotImplementedError"
]`,
    formats: ['html', 'xml', 'term', 'json'],
    recommendedThresholds: {
      ut: { line: 80, branch: 70 },
      it: { line: 60, branch: 50 },
    },
  },

  typescript: {
    name: 'Istanbul (built into Jest)',
    language: 'typescript',
    description:
      'Jest uses Istanbul under the hood for code coverage. Reports in lcov, HTML, text, and JSON formats. No additional dependencies needed.',
    runCommand: 'jest --coverage',
    configExample: `// jest.config.ts or package.json jest section
{
  "coverageThreshold": {
    "global": {
      "lines": 80,
      "branches": 70,
      "functions": 80,
      "statements": 80
    }
  },
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/**/*.config.*"
  ],
  "coverageReporters": ["lcov", "html", "text", "json"]
}`,
    formats: ['lcov', 'html', 'text', 'json'],
    recommendedThresholds: {
      ut: { line: 80, branch: 70 },
      it: { line: 60, branch: 50 },
    },
  },

  javascript: {
    name: 'Istanbul (built into Jest)',
    language: 'javascript',
    description:
      'Jest uses Istanbul under the hood for code coverage. Same configuration as TypeScript without the type-related exclusions.',
    runCommand: 'jest --coverage',
    configExample: `// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 70,
      functions: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/index.js",
    "!src/**/*.config.*"
  ],
  coverageReporters: ["lcov", "html", "text"]
};`,
    formats: ['lcov', 'html', 'text', 'json'],
    recommendedThresholds: {
      ut: { line: 80, branch: 70 },
      it: { line: 60, branch: 50 },
    },
  },

  go: {
    name: 'go test -cover',
    language: 'go',
    description:
      'Built-in Go coverage tool. Generates coverage profiles and HTML reports. No external dependencies for basic usage.',
    runCommand: 'go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out',
    configExample: `# Run with:
# go test -coverprofile=coverage.out ./...
# go tool cover -html=coverage.out -o coverage.html
# go tool cover -func=coverage.out

# Optionally set coverage threshold in CI:
# test -z "$(go tool cover -func=coverage.out | tail -1 | awk '{print $3}' | sed 's/%//' | awk '{if ($1 < 70) print "fail"}')"`,
    formats: ['out', 'html', 'func'],
    recommendedThresholds: {
      ut: { line: 70, branch: 0 },  // Go doesn't have branch coverage natively
      it: { line: 50, branch: 0 },
    },
  },

  'c#': {
    name: 'coverlet',
    language: 'c#',
    description:
      'Cross-platform code coverage for .NET. Integrates with xUnit/NUnit/MSTest. Generates cobertura, HTML, JSON reports.',
    runCommand: 'dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura',
    configExample: `<!-- In .csproj test project -->
<ItemGroup>
  <PackageReference Include="coverlet.collector" Version="6.0.0" />
  <PackageReference Include="coverlet.msbuild" Version="6.0.0" />
</ItemGroup>

<PropertyGroup>
  <CollectCoverage>true</CollectCoverage>
  <CoverletOutputFormat>cobertura,html,json</CoverletOutputFormat>
  <CoverletOutput>./coverage/</CoverletOutput>
  <Threshold>80</Threshold>
</PropertyGroup>`,
    formats: ['cobertura', 'html', 'json'],
    recommendedThresholds: {
      ut: { line: 80, branch: 70 },
      it: { line: 60, branch: 50 },
    },
  },

  'c++': {
    name: 'gcov + lcov (Linux/GCC)',
    language: 'c++',
    description:
      'Standard GNU coverage toolchain for C/C++ on Linux with GCC. gcov generates coverage data, lcov converts it to HTML reports. Integrated with xmake via coverage mode.',
    runCommand: 'xmake f -m coverage && xmake build && xmake run <test_target>',
    configExample: `-- xmake.lua coverage configuration (GCC on Linux)
add_rules("mode.coverage")
-- Coverage mode adds --coverage flag to compiler and linker
-- Build: xmake f -m coverage && xmake build
-- Run tests: xmake run <test_target>
-- Generate report:
--   lcov --capture --directory build/ --output-file coverage.info
--   genhtml coverage.info --output-directory coverage_report/
`,
    formats: ['lcov', 'html', 'cobertura', 'json'],
    recommendedThresholds: {
      ut: { line: 80, branch: 70 },
      it: { line: 60, branch: 50 },
    },
  },
};

/**
 * Map of language -> multiple coverage tool options.
 * For languages with only one tool, the array has one entry.
 * For C++, multiple options are provided for different OS/toolchain combos.
 */
export const COVERAGE_TOOL_OPTIONS: Record<string, CoverageTool[]> = {
  'c++': [
    {
      name: 'gcov + lcov (Linux/GCC)',
      language: 'c++',
      description:
        'Standard GNU coverage toolchain on Linux. gcov generates raw coverage data, lcov converts to HTML/LCOV reports. Requires GCC compiler. Best for Linux CI/CD pipelines.',
      runCommand: 'xmake f -m coverage && xmake build && xmake run <test_target>',
      configExample: `-- xmake.lua: GCC + gcov/lcov (Linux)
add_rules("mode.coverage")
-- Ensure GCC toolchain:
--   xmake f --toolchain=gcc -m coverage
-- Build and run tests:
--   xmake build && xmake run <test_target>
-- Generate report:
--   lcov --capture --directory build/ --output-file coverage.info
--   genhtml coverage.info --output-directory coverage_report/
`,
      formats: ['lcov', 'html', 'cobertura', 'json'],
      recommendedThresholds: {
        ut: { line: 80, branch: 70 },
        it: { line: 60, branch: 50 },
      },
    },
    {
      name: 'gcovr (Linux/GCC, cross-platform)',
      language: 'c++',
      description:
        'Python-based wrapper around gcov with better output formatting. Supports Cobertura XML, HTML, and JSON reports. Works on both Linux and Windows with GCC/MinGW.',
      runCommand: 'xmake f -m coverage && xmake build && xmake run <test_target> && gcovr -r . --html-details coverage_report/index.html',
      configExample: `-- xmake.lua: GCC + gcovr (cross-platform)
add_rules("mode.coverage")
-- Build and run tests:
--   xmake f -m coverage && xmake build && xmake run <test_target>
-- Generate report with gcovr:
--   gcovr -r . --html-details coverage_report/index.html
--   gcovr -r . --xml -o coverage.xml
--   gcovr -r . --json -o coverage.json
`,
      formats: ['html', 'xml', 'json', 'txt'],
      recommendedThresholds: {
        ut: { line: 80, branch: 70 },
        it: { line: 60, branch: 50 },
      },
    },
    {
      name: 'OpenCppCoverage (Windows/MSVC)',
      language: 'c++',
      description:
        'Native Windows coverage tool for MSVC-compiled C++ code. No GCC dependency. Generates HTML and Cobertura XML reports. Best for Windows/MSVC CI/CD pipelines.',
      runCommand: 'OpenCppCoverage --sources <src_dir> --export_type cobertura:coverage.xml -- <test_exe>',
      configExample: `-- xmake.lua: MSVC + OpenCppCoverage (Windows)
-- Build with debug info:
--   xmake f -m debug && xmake build
-- Run tests with coverage:
--   OpenCppCoverage --sources src/ --export_type cobertura:coverage.xml -- build/<test_target>.exe
--   OpenCppCoverage --sources src/ --export_type html:coverage_report -- build/<test_target>.exe
`,
      formats: ['cobertura', 'html', 'xml'],
      recommendedThresholds: {
        ut: { line: 80, branch: 70 },
        it: { line: 60, branch: 50 },
      },
    },
    {
      name: 'llvm-cov + llvm-profdata (cross-platform/Clang)',
      language: 'c++',
      description:
        'LLVM/Clang native coverage toolchain. Works on Linux, macOS, and Windows. Generates HTML, JSON, and LCOV-compatible reports. Best for projects using Clang compiler.',
      runCommand: 'xmake f --toolchain=clang -m coverage && xmake build && xmake run <test_target>',
      configExample: `-- xmake.lua: Clang + llvm-cov (cross-platform)
add_rules("mode.coverage")
-- Use Clang toolchain:
--   xmake f --toolchain=clang -m coverage
--   xmake build && xmake run <test_target>
-- Generate report with llvm-cov:
--   llvm-profdata merge -sparse default.profraw -o coverage.profdata
--   llvm-cov show <test_target> -instr-profile=coverage.profdata -format=html -output-dir=coverage_report/
--   llvm-cov export <test_target> -instr-profile=coverage.profdata -format=lcov > coverage.lcov
`,
      formats: ['html', 'lcov', 'json', 'txt'],
      recommendedThresholds: {
        ut: { line: 80, branch: 70 },
        it: { line: 60, branch: 50 },
      },
    },
  ],
};

/**
 * Map of (language, pyramidLevel) -> recommended test frameworks.
 * Kept in sync with the framework recommendations in SKILL.md files.
 */
const FRAMEWORK_MAP: Record<string, Record<PyramidLevel, Framework[]>> = {
  java: {
    ut: [
      {
        name: 'JUnit 5',
        language: 'java',
        level: 'ut',
        description:
          'Modern Java testing framework with parameterized tests, dynamic tests, and extension model. Recommended for all new projects.',
        recommendation: 'primary',
        dependencies: ['org.junit.jupiter:junit-jupiter:5.10.x'],
      },
      {
        name: 'JUnit 4',
        language: 'java',
        level: 'ut',
        description: 'Legacy but widely used. Still supported by many tools but lacks modern features.',
        recommendation: 'legacy',
        dependencies: ['junit:junit:4.13.x'],
      },
      {
        name: 'TestNG',
        language: 'java',
        level: 'ut',
        description:
          'Advanced test configuration with grouping, parallel execution, and data providers. Good for complex test suites.',
        recommendation: 'alternative',
        dependencies: ['org.testng:testng:7.x'],
      },
    ],
    it: [
      {
        name: 'Spring Boot Test + JUnit 5',
        language: 'java',
        level: 'it',
        description:
          'Spring Boot testing support with context loading, auto-configuration, and test slices.',
        recommendation: 'primary',
        dependencies: ['org.springframework.boot:spring-boot-starter-test'],
      },
      {
        name: 'Testcontainers',
        language: 'java',
        level: 'it',
        description:
          'Docker-based integration testing for databases, message queues, and external services. Works with any Java framework.',
        recommendation: 'primary',
        dependencies: ['org.testcontainers:testcontainers', 'org.testcontainers:junit-jupiter'],
      },
      {
        name: 'Arquillian',
        language: 'java',
        level: 'it',
        description:
          'Container-based integration testing for Java EE/Jakarta EE. Deploy to real application server environments.',
        recommendation: 'alternative',
        dependencies: ['org.jboss.arquillian:arquillian-bom'],
      },
    ],
    api: [
      {
        name: 'REST Assured',
        language: 'java',
        level: 'api',
        description:
          'Fluent Java DSL for testing RESTful APIs. Excellent readability with Given/When/Then syntax.',
        recommendation: 'primary',
        dependencies: ['io.rest-assured:rest-assured'],
      },
      {
        name: 'Spring MockMvc',
        language: 'java',
        level: 'api',
        description:
          'Server-side Spring MVC testing without deploying to a real server. Fast and integrated with Spring Test.',
        recommendation: 'primary',
        dependencies: ['org.springframework:spring-test'],
      },
      {
        name: 'Pact JVM',
        language: 'java',
        level: 'api',
        description: 'Consumer-driven contract testing. Verify API contracts between services.',
        recommendation: 'alternative',
        dependencies: ['au.com.dius.pact.consumer:junit5'],
      },
    ],
    e2e: [
      {
        name: 'Playwright (Java)',
        language: 'java',
        level: 'e2e',
        description:
          'Modern cross-browser automation with auto-wait, trace viewer, and multi-browser support. Recommended for new projects.',
        recommendation: 'primary',
        dependencies: ['com.microsoft.playwright:playwright'],
      },
      {
        name: 'Selenium WebDriver',
        language: 'java',
        level: 'e2e',
        description: 'Mature browser automation framework with broad language and browser support.',
        recommendation: 'alternative',
        dependencies: ['org.seleniumhq.selenium:selenium-java'],
      },
    ],
  },

  python: {
    ut: [
      {
        name: 'pytest',
        language: 'python',
        level: 'ut',
        description:
          'Modern, idiomatic Python testing with fixtures, parameterization, and rich plugin ecosystem. Recommended for all new projects.',
        recommendation: 'primary',
        dependencies: ['pytest'],
      },
      {
        name: 'unittest',
        language: 'python',
        level: 'ut',
        description: 'Python standard library testing framework. No dependencies but lacks pytest expressiveness.',
        recommendation: 'legacy',
      },
    ],
    it: [
      {
        name: 'pytest + testcontainers-python',
        language: 'python',
        level: 'it',
        description: 'pytest with Docker-based test containers for databases and services.',
        recommendation: 'primary',
        dependencies: ['pytest', 'testcontainers'],
      },
      {
        name: 'pytest-django',
        language: 'python',
        level: 'it',
        description: 'pytest plugin for Django, with database fixtures and test client.',
        recommendation: 'alternative',
        dependencies: ['pytest', 'pytest-django'],
      },
    ],
    api: [
      {
        name: 'pytest + httpx',
        language: 'python',
        level: 'api',
        description: 'Modern async HTTP client with pytest integration. Great for testing REST APIs.',
        recommendation: 'primary',
        dependencies: ['pytest', 'httpx'],
      },
      {
        name: 'pytest + requests',
        language: 'python',
        level: 'api',
        description: 'Classic combination using the popular requests library.',
        recommendation: 'alternative',
        dependencies: ['pytest', 'requests'],
      },
    ],
    e2e: [
      {
        name: 'Playwright (Python)',
        language: 'python',
        level: 'e2e',
        description: 'Cross-browser E2E testing with auto-wait and trace viewer.',
        recommendation: 'primary',
        dependencies: ['playwright'],
      },
      {
        name: 'Selenium (Python)',
        language: 'python',
        level: 'e2e',
        description: 'Traditional browser automation with Python bindings.',
        recommendation: 'alternative',
        dependencies: ['selenium'],
      },
    ],
  },

  typescript: {
    ut: [
      {
        name: 'Jest',
        language: 'typescript',
        level: 'ut',
        description:
          'Popular testing framework with snapshot testing, built-in mocking, and code coverage. Works with ts-jest.',
        recommendation: 'primary',
        dependencies: ['jest', 'ts-jest', '@types/jest'],
      },
      {
        name: 'Vitest',
        language: 'typescript',
        level: 'ut',
        description:
          'Fast, Vite-native testing framework with Jest-compatible API. Native TypeScript support.',
        recommendation: 'primary',
        dependencies: ['vitest'],
      },
      {
        name: 'Mocha + Chai',
        language: 'typescript',
        level: 'ut',
        description: 'Flexible test runner with assertion library. More configuration needed but highly customizable.',
        recommendation: 'alternative',
        dependencies: ['mocha', 'chai', '@types/mocha', '@types/chai'],
      },
    ],
    it: [
      {
        name: 'Jest + Supertest',
        language: 'typescript',
        level: 'it',
        description: 'Jest with Supertest for HTTP integration testing. Widely used in Node.js ecosystem.',
        recommendation: 'primary',
        dependencies: ['jest', 'ts-jest', 'supertest', '@types/supertest'],
      },
      {
        name: 'Vitest + testcontainers',
        language: 'typescript',
        level: 'it',
        description: 'Vitest with Docker-based test containers for real service integration.',
        recommendation: 'alternative',
        dependencies: ['vitest', 'testcontainers'],
      },
    ],
    api: [
      {
        name: 'Supertest',
        language: 'typescript',
        level: 'api',
        description: 'HTTP assertion library for testing Express/Koa/Fastify APIs. Simple and expressive.',
        recommendation: 'primary',
        dependencies: ['supertest', '@types/supertest'],
      },
      {
        name: 'Pact JS',
        language: 'typescript',
        level: 'api',
        description: 'Consumer-driven contract testing for HTTP and message integrations.',
        recommendation: 'alternative',
        dependencies: ['@pact-foundation/pact'],
      },
    ],
    e2e: [
      {
        name: 'Playwright',
        language: 'typescript',
        level: 'e2e',
        description:
          'Modern cross-browser E2E testing with auto-wait, trace viewer, and excellent TypeScript support. Recommended.',
        recommendation: 'primary',
        dependencies: ['@playwright/test'],
      },
      {
        name: 'Cypress',
        language: 'typescript',
        level: 'e2e',
        description: 'Developer-friendly E2E testing with time travel debugging and real-time reloads.',
        recommendation: 'alternative',
        dependencies: ['cypress'],
      },
    ],
  },

  javascript: {
    ut: [
      {
        name: 'Jest',
        language: 'javascript',
        level: 'ut',
        description: 'Popular testing framework with snapshot testing and built-in mocking.',
        recommendation: 'primary',
        dependencies: ['jest'],
      },
      {
        name: 'Mocha + Chai',
        language: 'javascript',
        level: 'ut',
        description: 'Flexible test runner with assertion library.',
        recommendation: 'alternative',
        dependencies: ['mocha', 'chai'],
      },
    ],
    it: [
      {
        name: 'Jest + Supertest',
        language: 'javascript',
        level: 'it',
        description: 'Jest with Supertest for HTTP integration testing.',
        recommendation: 'primary',
        dependencies: ['jest', 'supertest'],
      },
    ],
    api: [
      {
        name: 'Supertest',
        language: 'javascript',
        level: 'api',
        description: 'HTTP assertion library for testing web APIs.',
        recommendation: 'primary',
        dependencies: ['supertest'],
      },
    ],
    e2e: [
      {
        name: 'Playwright',
        language: 'javascript',
        level: 'e2e',
        description: 'Modern cross-browser E2E testing.',
        recommendation: 'primary',
        dependencies: ['@playwright/test'],
      },
      {
        name: 'Cypress',
        language: 'javascript',
        level: 'e2e',
        description: 'Developer-friendly E2E testing with time travel debugging.',
        recommendation: 'alternative',
        dependencies: ['cypress'],
      },
    ],
  },

  go: {
    ut: [
      {
        name: 'testing + testify',
        language: 'go',
        level: 'ut',
        description: 'Go standard library testing package with testify for assertions and mocking.',
        recommendation: 'primary',
        dependencies: ['github.com/stretchr/testify'],
      },
      {
        name: 'testing (stdlib)',
        language: 'go',
        level: 'ut',
        description: 'Go standard library testing. No external dependencies.',
        recommendation: 'alternative',
      },
    ],
    it: [
      {
        name: 'testing + dockertest',
        language: 'go',
        level: 'it',
        description: 'Go testing with Docker-based test containers for databases and services.',
        recommendation: 'primary',
        dependencies: ['github.com/ory/dockertest/v3'],
      },
    ],
    api: [
      {
        name: 'testing + httptest',
        language: 'go',
        level: 'api',
        description: 'Go standard library HTTP testing server. No external dependencies for simple API testing.',
        recommendation: 'primary',
      },
    ],
    e2e: [
      {
        name: 'Playwright (external)',
        language: 'go',
        level: 'e2e',
        description: 'E2E testing via Playwright in a separate test project (recommended approach for Go services).',
        recommendation: 'primary',
      },
    ],
  },

  'c#': {
    ut: [
      {
        name: 'xUnit',
        language: 'c#',
        level: 'ut',
        description: 'Modern .NET testing framework with excellent extensibility. Recommended for new projects.',
        recommendation: 'primary',
        dependencies: ['xunit', 'xunit.runner.visualstudio'],
      },
      {
        name: 'NUnit',
        language: 'c#',
        level: 'ut',
        description: 'Mature testing framework with rich assertion model and test configuration.',
        recommendation: 'alternative',
        dependencies: ['NUnit', 'NUnit3TestAdapter'],
      },
      {
        name: 'MSTest',
        language: 'c#',
        level: 'ut',
        description: 'Microsoft official testing framework. Good Visual Studio integration.',
        recommendation: 'legacy',
        dependencies: ['MSTest.TestFramework', 'MSTest.TestAdapter'],
      },
    ],
    it: [
      {
        name: 'xUnit + Testcontainers',
        language: 'c#',
        level: 'it',
        description: 'xUnit with Docker-based test containers for .NET integration testing.',
        recommendation: 'primary',
        dependencies: ['Testcontainers', 'xunit'],
      },
    ],
    api: [
      {
        name: 'RestSharp + xUnit',
        language: 'c#',
        level: 'api',
        description: 'Popular REST client library combined with xUnit for API testing.',
        recommendation: 'primary',
        dependencies: ['RestSharp', 'xunit'],
      },
    ],
    e2e: [
      {
        name: 'Playwright (.NET)',
        language: 'c#',
        level: 'e2e',
        description: 'Modern cross-browser automation with .NET bindings.',
        recommendation: 'primary',
        dependencies: ['Microsoft.Playwright'],
      },
    ],
  },

  'c++': {
    ut: [
      {
        name: 'Google Test',
        language: 'c++',
        level: 'ut',
        description:
          "Google's C++ testing and mocking framework. Widely adopted, feature-rich with test discovery, fixtures, and death tests. Recommended for all new C++ projects.",
        recommendation: 'primary',
        dependencies: ['gtest'],
      },
      {
        name: 'Catch2',
        language: 'c++',
        level: 'ut',
        description:
          'Modern, header-only C++ test framework with expressive assertion macros and BDD-style sections. Lightweight alternative to Google Test.',
        recommendation: 'alternative',
        dependencies: ['catch2'],
      },
      {
        name: 'doctest',
        language: 'c++',
        level: 'ut',
        description:
          'Fastest C++ testing framework with low compile-time overhead. Single-header, feature-rich with BDD style, subcases, and property-based testing.',
        recommendation: 'alternative',
        dependencies: ['doctest'],
      },
      {
        name: 'Qt Test',
        language: 'c++',
        level: 'ut',
        description:
          "Qt framework's built-in testing module. Best choice for Qt-based projects — integrates with Qt's signal/slot mechanism, event loop, and GUI classes.",
        recommendation: 'alternative',
        dependencies: ['Qt5::Test', 'Qt6::Test'],
      },
    ],
    it: [
      {
        name: 'Google Test + testcontainers-c',
        language: 'c++',
        level: 'it',
        description:
          'Google Test with Docker-based service containers for integration testing of databases, caches, and external services.',
        recommendation: 'primary',
        dependencies: ['gtest', 'testcontainers-c'],
      },
      {
        name: 'Google Test + Boost.Beast',
        language: 'c++',
        level: 'it',
        description:
          'Google Test with Boost.Beast for HTTP client/server integration testing. Good for testing REST endpoints in-process.',
        recommendation: 'alternative',
        dependencies: ['gtest', 'boost'],
      },
    ],
    api: [
      {
        name: 'Language-agnostic (pytest + httpx)',
        language: 'c++',
        level: 'api',
        description:
          'Recommended: Use Python pytest + httpx for API testing of C++ backends. Language-agnostic — test HTTP endpoints regardless of backend language. Richer ecosystem, faster test development.',
        recommendation: 'primary',
        dependencies: ['pytest', 'httpx'],
      },
      {
        name: 'Language-agnostic (Supertest)',
        language: 'c++',
        level: 'api',
        description:
          'Use Node.js Supertest for API testing of C++ backends. Great for teams already using JavaScript/TypeScript tooling.',
        recommendation: 'alternative',
        dependencies: ['jest', 'supertest'],
      },
      {
        name: 'Google Test + cpp-httplib',
        language: 'c++',
        level: 'api',
        description:
          'C++ native option: Google Test with cpp-httplib for HTTP client testing. Use when the team prefers staying in C++ for all test layers.',
        recommendation: 'alternative',
        dependencies: ['gtest', 'cpp-httplib'],
      },
    ],
    e2e: [
      {
        name: 'Playwright (external)',
        language: 'c++',
        level: 'e2e',
        description:
          'E2E testing via Playwright in a separate test project. Recommended approach for C++ backend services with web frontends.',
        recommendation: 'primary',
      },
      {
        name: 'Qt Test (GUI E2E)',
        language: 'c++',
        level: 'e2e',
        description:
          'For Qt desktop applications: Qt Test with GUI simulation. Tests widget interactions, signal/slot chains, and window behavior.',
        recommendation: 'alternative',
        dependencies: ['Qt5::Test', 'Qt5::Widgets'],
      },
    ],
  },
};

/**
 * Get recommended test frameworks for a given language and pyramid level.
 */
export function getFrameworks(language: string, level: PyramidLevel): Framework[] {
  const normalizedLang = mapLanguage(language);
  const langFrameworks = FRAMEWORK_MAP[normalizedLang];
  if (!langFrameworks) {
    return [];
  }
  return langFrameworks[level] || [];
}

/**
 * Get all available frameworks for a language across all pyramid levels.
 */
export function getAllFrameworksForLanguage(language: string): Record<PyramidLevel, Framework[]> {
  const normalizedLang = mapLanguage(language);
  const langFrameworks = FRAMEWORK_MAP[normalizedLang];
  if (!langFrameworks) {
    return { ut: [], it: [], api: [], e2e: [] };
  }
  return langFrameworks;
}

/**
 * Get the recommended (default) coverage tool for a given language.
 */
export function getCoverageTool(language: string): CoverageTool | undefined {
  const normalizedLang = mapLanguage(language);
  return COVERAGE_TOOL_MAP[normalizedLang];
}

/**
 * Get all available coverage tool options for a given language.
 * For most languages, returns a single-element array.
 * For C++, returns multiple options grouped by OS/toolchain.
 */
export function getCoverageTools(language: string): CoverageTool[] {
  const normalizedLang = mapLanguage(language);
  const options = COVERAGE_TOOL_OPTIONS[normalizedLang];
  if (options && options.length > 0) {
    return options;
  }
  // Fall back to the single tool in COVERAGE_TOOL_MAP
  const single = COVERAGE_TOOL_MAP[normalizedLang];
  return single ? [single] : [];
}

/**
 * Normalize language identifier to the key used in the framework map.
 */
function mapLanguage(language: string): string {
  const normalized = language.toLowerCase().trim();
  if (normalized === 'csharp' || normalized === 'csharp') return 'c#';
  if (normalized === 'js') return 'javascript';
  if (normalized === 'ts') return 'typescript';
  if (normalized === 'cpp' || normalized === 'cplusplus') return 'c++';
  return normalized;
}
