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
 * Get the recommended coverage tool for a given language.
 */
export function getCoverageTool(language: string): CoverageTool | undefined {
  const normalizedLang = mapLanguage(language);
  return COVERAGE_TOOL_MAP[normalizedLang];
}

/**
 * Normalize language identifier to the key used in the framework map.
 */
function mapLanguage(language: string): string {
  const normalized = language.toLowerCase().trim();
  if (normalized === 'csharp' || normalized === 'csharp') return 'c#';
  if (normalized === 'js') return 'javascript';
  if (normalized === 'ts') return 'typescript';
  return normalized;
}
