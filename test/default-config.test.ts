/**
 * Unit Tests: default-config
 * Pyramid Level: UT
 * Tests getDefaultConfig generation for all supported languages.
 */
import { describe, it, expect } from 'vitest';
import { getDefaultConfig } from '../src/config/default-config.js';
import type { PyramidLevel } from '../src/registry/types.js';

const ALL_LEVELS: PyramidLevel[] = ['ut', 'it', 'api', 'e2e'];

describe('DefaultConfig — Unit Tests', () => {
  describe('getDefaultConfig — basic structure', () => {
    it('should return config with correct ide and scope', () => {
      const config = getDefaultConfig(['claude']);
      expect(config.ide).toEqual(['claude']);
      expect(config.scope).toBe('project');
    });

    it('should return empty frameworks/directories/coverage when no language given', () => {
      const config = getDefaultConfig(['claude']);
      expect(config.frameworks.ut).toBeUndefined();
      expect(config.directories.ut).toBeUndefined();
      expect(Object.keys(config.coverage)).toHaveLength(0);
    });

    it('should return language in config when provided', () => {
      const config = getDefaultConfig(['claude'], 'java');
      expect(config.language).toBe('java');
    });
  });

  describe('getDefaultConfig — Java defaults', () => {
    it('should set Java frameworks correctly', () => {
      const config = getDefaultConfig(['claude'], 'java');
      expect(config.frameworks.ut).toBe('junit5');
      expect(config.frameworks.it).toBe('spring-boot-test');
      expect(config.frameworks.api).toBe('rest-assured');
      expect(config.frameworks.e2e).toBe('playwright');
    });

    it('should set Java directories correctly', () => {
      const config = getDefaultConfig(['claude'], 'java');
      expect(config.directories.ut).toBe('src/test/java/');
      expect(config.directories.it).toBe('src/test/java/');
      expect(config.directories.api).toBe('src/test/java/');
      expect(config.directories.e2e).toBe('e2e/');
    });

    it('should set Java coverage defaults correctly', () => {
      const config = getDefaultConfig(['claude'], 'java');
      expect(config.coverage.ut).toBeDefined();
      expect(config.coverage.ut!.tool).toBe('jacoco');
      expect(config.coverage.ut!.thresholds!.line).toBe(80);
      expect(config.coverage.ut!.thresholds!.branch).toBe(70);
      expect(config.coverage.it).toBeDefined();
      expect(config.coverage.it!.thresholds!.line).toBe(60);
    });
  });

  describe('getDefaultConfig — Python defaults', () => {
    it('should set Python frameworks correctly', () => {
      const config = getDefaultConfig(['claude'], 'python');
      expect(config.frameworks.ut).toBe('pytest');
      expect(config.frameworks.api).toBe('pytest-httpx');
      expect(config.frameworks.e2e).toBe('playwright');
    });

    it('should set Python coverage defaults', () => {
      const config = getDefaultConfig(['claude'], 'python');
      expect(config.coverage.ut!.tool).toBe('pytest-cov');
      expect(config.coverage.ut!.excludes).toContain('tests/*');
    });
  });

  describe('getDefaultConfig — TypeScript/JavaScript defaults', () => {
    it('should set TypeScript frameworks correctly', () => {
      const config = getDefaultConfig(['claude'], 'typescript');
      expect(config.frameworks.ut).toBe('jest');
      expect(config.frameworks.it).toBe('jest');
      expect(config.frameworks.api).toBe('supertest');
      expect(config.frameworks.e2e).toBe('playwright');
    });

    it('should set JavaScript frameworks (same as TypeScript)', () => {
      const config = getDefaultConfig(['claude'], 'javascript');
      expect(config.frameworks.ut).toBe('jest');
      expect(config.frameworks.e2e).toBe('playwright');
    });

    it('should set TS coverage defaults', () => {
      const config = getDefaultConfig(['claude'], 'typescript');
      expect(config.coverage.ut!.tool).toBe('jest');
      expect(config.coverage.ut!.thresholds!.line).toBe(80);
      expect(config.coverage.ut!.thresholds!.function).toBe(80);
    });
  });

  describe('getDefaultConfig — Go defaults', () => {
    it('should set Go frameworks correctly', () => {
      const config = getDefaultConfig(['claude'], 'go');
      expect(config.frameworks.ut).toBe('testing');
      expect(config.frameworks.e2e).toBe('playwright');
    });

    it('should set Go coverage thresholds (lower than managed languages)', () => {
      const config = getDefaultConfig(['claude'], 'go');
      expect(config.coverage.ut!.thresholds!.line).toBe(70);
    });
  });

  describe('getDefaultConfig — C# defaults', () => {
    it('should set C# frameworks (normalized form)', () => {
      const config = getDefaultConfig(['claude'], 'c#');
      expect(config.frameworks.ut).toBe('xunit');
      expect(config.frameworks.api).toBe('restsharp');
    });

    it('should set C# frameworks (csharp alias)', () => {
      const config = getDefaultConfig(['claude'], 'csharp');
      expect(config.frameworks.ut).toBe('xunit');
    });

    it('should set C# coverage defaults', () => {
      const config = getDefaultConfig(['claude'], 'c#');
      expect(config.coverage.ut!.tool).toBe('coverlet');
      expect(config.coverage.ut!.formats).toContain('cobertura');
    });
  });

  describe('getDefaultConfig — C++ defaults', () => {
    it('should set C++ frameworks correctly', () => {
      const config = getDefaultConfig(['claude'], 'c++');
      expect(config.frameworks.ut).toBe('gtest');
      expect(config.frameworks.it).toBe('gtest');
      expect(config.frameworks.api).toBe('pytest-httpx');
      expect(config.frameworks.e2e).toBe('playwright');
    });

    it('should set C++ frameworks (cpp alias)', () => {
      const config = getDefaultConfig(['claude'], 'cpp');
      expect(config.frameworks.ut).toBe('gtest');
    });

    it('should set C++ directories correctly', () => {
      const config = getDefaultConfig(['claude'], 'c++');
      expect(config.directories.ut).toBe('tests/ut/');
      expect(config.directories.it).toBe('tests/it/');
      expect(config.directories.api).toBe('tests/api/');
      expect(config.directories.e2e).toBe('tests/e2e/');
    });

    it('should set C++ coverage defaults', () => {
      const config = getDefaultConfig(['claude'], 'c++');
      expect(config.coverage.ut!.tool).toBe('gcov-lcov');
      expect(config.coverage.ut!.thresholds!.line).toBe(80);
      expect(config.coverage.ut!.thresholds!.branch).toBe(70);
      expect(config.coverage.ut!.formats).toContain('lcov');
      expect(config.coverage.it!.thresholds!.line).toBe(60);
    });
  });

  describe('getDefaultConfig — unknown language', () => {
    it('should return empty config for unknown language', () => {
      const config = getDefaultConfig(['claude'], 'haskell');
      expect(config.frameworks.ut).toBeUndefined();
      expect(config.directories.ut).toBeUndefined();
      expect(Object.keys(config.coverage)).toHaveLength(0);
    });
  });

  describe('getDefaultConfig — all pyramid levels present for known languages', () => {
    const languages = ['java', 'python', 'typescript', 'javascript', 'go', 'c#', 'c++'];

    for (const lang of languages) {
      it(`${lang}: should have all pyramid level frameworks`, () => {
        const config = getDefaultConfig(['claude'], lang);
        for (const level of ALL_LEVELS) {
          expect(
            config.frameworks[level],
            `${lang} should have ${level} framework set`,
          ).toBeTruthy();
        }
      });

      it(`${lang}: should have all pyramid level directories`, () => {
        const config = getDefaultConfig(['claude'], lang);
        for (const level of ALL_LEVELS) {
          const dir = config.directories[level];
          // Go uses empty string for UT dir (test files co-locate with source)
          if (lang === 'go' && level === 'ut') {
            expect(dir).toBe('');
          } else {
            expect(
              dir,
              `${lang} should have ${level} directory set`,
            ).toBeTruthy();
          }
        }
      });

      it(`${lang}: ut coverage thresholds should be >= it thresholds`, () => {
        const config = getDefaultConfig(['claude'], lang);
        const utLine = config.coverage.ut?.thresholds?.line ?? 0;
        const itLine = config.coverage.it?.thresholds?.line ?? 0;
        expect(
          utLine >= itLine,
          `${lang}: UT line coverage (${utLine}) should be >= IT (${itLine})`,
        ).toBe(true);
      });
    }
  });

  describe('getDefaultConfig — case insensitivity', () => {
    it('should handle uppercase language', () => {
      const config = getDefaultConfig(['claude'], 'JAVA');
      expect(config.frameworks.ut).toBe('junit5');
    });

    it('should handle mixed-case language', () => {
      const config = getDefaultConfig(['claude'], 'TypeScript');
      expect(config.frameworks.ut).toBe('jest');
    });
  });
});
