import type { KhufuConfig } from '../registry/types.js';

export function getDefaultConfig(ide: string, language?: string): KhufuConfig {
  const config: KhufuConfig = {
    ide,
    language,
    frameworks: {},
    directories: {},
    coverage: {},
    scope: 'project',
  };

  // Set sensible defaults based on detected language
  if (language) {
    const defaults = getLanguageDefaults(language);
    config.frameworks = defaults.frameworks;
    config.directories = defaults.directories;
    config.coverage = defaults.coverage;
  }

  return config;
}

interface LanguageDefaults {
  frameworks: KhufuConfig['frameworks'];
  directories: KhufuConfig['directories'];
  coverage: KhufuConfig['coverage'];
}

function getLanguageDefaults(language: string): LanguageDefaults {
  switch (language.toLowerCase()) {
    case 'java':
      return {
        frameworks: {
          ut: 'junit5',
          it: 'spring-boot-test',
          api: 'rest-assured',
          e2e: 'playwright',
        },
        directories: {
          ut: 'src/test/java/',
          it: 'src/test/java/',
          api: 'src/test/java/',
          e2e: 'e2e/',
        },
        coverage: {
          ut: {
            tool: 'jacoco',
            thresholds: { line: 80, branch: 70 },
            formats: ['xml', 'html', 'csv'],
            excludes: ['**/dto/**', '**/entity/**', '**/config/**'],
          },
          it: {
            tool: 'jacoco',
            thresholds: { line: 60, branch: 50 },
            formats: ['xml', 'html'],
            excludes: ['**/config/**'],
          },
        },
      };
    case 'python':
      return {
        frameworks: {
          ut: 'pytest',
          it: 'pytest',
          api: 'pytest-httpx',
          e2e: 'playwright',
        },
        directories: {
          ut: 'tests/',
          it: 'tests/integration/',
          api: 'tests/api/',
          e2e: 'e2e/',
        },
        coverage: {
          ut: {
            tool: 'pytest-cov',
            thresholds: { line: 80, branch: 70 },
            formats: ['xml', 'html', 'term'],
            excludes: ['tests/*', '**/migrations/*', '**/__init__.py'],
          },
          it: {
            tool: 'pytest-cov',
            thresholds: { line: 60, branch: 50 },
            formats: ['xml', 'html'],
            excludes: ['tests/*', '**/migrations/*'],
          },
        },
      };
    case 'typescript':
    case 'javascript':
      return {
        frameworks: {
          ut: 'jest',
          it: 'jest',
          api: 'supertest',
          e2e: 'playwright',
        },
        directories: {
          ut: '__tests__/',
          it: '__tests__/integration/',
          api: '__tests__/api/',
          e2e: 'e2e/',
        },
        coverage: {
          ut: {
            tool: 'jest',
            thresholds: { line: 80, branch: 70, function: 80 },
            formats: ['lcov', 'html', 'text'],
            excludes: ['**/*.d.ts', '**/index.ts', '**/*.config.*'],
          },
          it: {
            tool: 'jest',
            thresholds: { line: 60, branch: 50 },
            formats: ['lcov', 'html'],
            excludes: ['**/*.config.*'],
          },
        },
      };
    case 'go':
      return {
        frameworks: {
          ut: 'testing',
          it: 'testing',
          api: 'testing',
          e2e: 'playwright',
        },
        directories: {
          ut: '',
          it: 'integration/',
          api: 'api/',
          e2e: 'e2e/',
        },
        coverage: {
          ut: {
            tool: 'go-cover',
            thresholds: { line: 70, function: 70 },
            formats: ['out', 'html'],
            excludes: ['**/mocks/**', '**/generated/**'],
          },
          it: {
            tool: 'go-cover',
            thresholds: { line: 50 },
            formats: ['out', 'html'],
          },
        },
      };
    case 'c#':
    case 'csharp':
      return {
        frameworks: {
          ut: 'xunit',
          it: 'xunit',
          api: 'restsharp',
          e2e: 'playwright',
        },
        directories: {
          ut: 'tests/',
          it: 'tests/integration/',
          api: 'tests/api/',
          e2e: 'e2e/',
        },
        coverage: {
          ut: {
            tool: 'coverlet',
            thresholds: { line: 80, branch: 70 },
            formats: ['cobertura', 'html', 'json'],
            excludes: ['**/Migrations/**', '**/Program.cs'],
          },
          it: {
            tool: 'coverlet',
            thresholds: { line: 60, branch: 50 },
            formats: ['cobertura', 'html'],
          },
        },
      };
    default:
      return {
        frameworks: {},
        directories: {},
        coverage: {},
      };
  }
}
