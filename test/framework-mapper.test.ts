import { describe, it, expect } from 'vitest';
import {
  getFrameworks,
  getAllFrameworksForLanguage,
  getCoverageTool,
  COVERAGE_TOOL_MAP,
} from '../src/detection/framework-mapper.js';
import type { PyramidLevel } from '../src/registry/types.js';

describe('FrameworkMapper', () => {
  const levels: PyramidLevel[] = ['ut', 'it', 'api', 'e2e'];

  describe('getFrameworks', () => {
    it('should return frameworks for Java unit tests', () => {
      const frameworks = getFrameworks('java', 'ut');
      expect(frameworks.length).toBeGreaterThanOrEqual(2);
      expect(frameworks[0].name).toBe('JUnit 5');
      expect(frameworks[0].recommendation).toBe('primary');
    });

    it('should return frameworks for Python unit tests', () => {
      const frameworks = getFrameworks('python', 'ut');
      expect(frameworks.length).toBeGreaterThanOrEqual(1);
      expect(frameworks[0].name).toBe('pytest');
    });

    it('should return frameworks for TypeScript E2E tests', () => {
      const frameworks = getFrameworks('typescript', 'e2e');
      expect(frameworks.length).toBeGreaterThanOrEqual(2);
      const names = frameworks.map((f) => f.name);
      expect(names).toContain('Playwright');
      expect(names).toContain('Cypress');
    });

    it('should return empty array for unknown language', () => {
      const frameworks = getFrameworks('brainfuck', 'ut');
      expect(frameworks).toEqual([]);
    });

    it('should normalize csharp to c#', () => {
      const frameworks = getFrameworks('csharp', 'ut');
      expect(frameworks.length).toBeGreaterThan(0);
      expect(frameworks[0].name).toBe('xUnit');
    });

    it('should normalize js to javascript', () => {
      const frameworks = getFrameworks('js', 'ut');
      expect(frameworks.length).toBeGreaterThan(0);
      expect(frameworks[0].name).toBe('Jest');
    });

    it('should normalize ts to typescript', () => {
      const frameworks = getFrameworks('ts', 'ut');
      expect(frameworks.length).toBeGreaterThan(0);
      expect(frameworks[0].name).toBe('Jest');
    });

    it('should prioritize primary recommendations', () => {
      const frameworks = getFrameworks('java', 'ut');
      const primaryFrameworks = frameworks.filter((f) => f.recommendation === 'primary');
      expect(primaryFrameworks.length).toBeGreaterThan(0);
      // Primary should come first
      expect(frameworks[0].recommendation).toBe('primary');
    });
  });

  describe('getAllFrameworksForLanguage', () => {
    it('should return frameworks for all four pyramid levels', () => {
      const all = getAllFrameworksForLanguage('java');
      expect(Object.keys(all)).toHaveLength(4);
      for (const level of levels) {
        expect(all[level].length).toBeGreaterThan(0);
      }
    });

    it('should return empty arrays for unknown language', () => {
      const all = getAllFrameworksForLanguage('haskell');
      expect(all.ut).toEqual([]);
      expect(all.it).toEqual([]);
      expect(all.api).toEqual([]);
      expect(all.e2e).toEqual([]);
    });
  });

  describe('framework completeness', () => {
    const supportedLanguages = ['java', 'python', 'typescript', 'javascript', 'go', 'c#'];

    it('should have at least one framework per level for each supported language', () => {
      for (const lang of supportedLanguages) {
        for (const level of levels) {
          const frameworks = getFrameworks(lang, level);
          expect(
            frameworks.length,
            `${lang} should have at least one ${level} framework`,
          ).toBeGreaterThan(0);
        }
      }
    });

    it('each framework should have required fields', () => {
      for (const lang of supportedLanguages) {
        for (const level of levels) {
          for (const fw of getFrameworks(lang, level)) {
            expect(fw.name).toBeTruthy();
            expect(fw.language).toBeTruthy();
            expect(fw.level).toBe(level);
            expect(fw.description).toBeTruthy();
            expect(['primary', 'alternative', 'legacy']).toContain(fw.recommendation);
          }
        }
      }
    });
  });

  describe('CoverageTool', () => {
    const supportedLanguages = ['java', 'python', 'typescript', 'javascript', 'go', 'c#'];

    it('should return a coverage tool for each supported language', () => {
      for (const lang of supportedLanguages) {
        const tool = getCoverageTool(lang);
        expect(tool, `${lang} should have a coverage tool`).toBeDefined();
        expect(tool!.name).toBeTruthy();
        expect(tool!.runCommand).toBeTruthy();
        expect(tool!.configExample).toBeTruthy();
        expect(tool!.formats.length).toBeGreaterThan(0);
        expect(tool!.recommendedThresholds.ut.line).toBeGreaterThan(0);
        expect(tool!.recommendedThresholds.it.line).toBeGreaterThan(0);
      }
    });

    it('should return undefined for unknown language', () => {
      expect(getCoverageTool('haskell')).toBeUndefined();
    });

    it('should normalize csharp/c# for coverage tools', () => {
      expect(getCoverageTool('csharp')).toBeDefined();
      expect(getCoverageTool('csharp')!.name).toBe('coverlet');
    });

    it('should normalize js/javascript for coverage tools', () => {
      expect(getCoverageTool('js')).toBeDefined();
      expect(getCoverageTool('js')!.name).toContain('Istanbul');
    });

    it('should normalize ts/typescript for coverage tools', () => {
      expect(getCoverageTool('ts')).toBeDefined();
      expect(getCoverageTool('ts')!.name).toContain('Istanbul');
    });

    it('COVERAGE_TOOL_MAP should export all expected languages', () => {
      for (const lang of supportedLanguages) {
        expect(COVERAGE_TOOL_MAP[lang], `COVERAGE_TOOL_MAP should have ${lang}`).toBeDefined();
      }
    });

    it('each coverage tool should have valid recommended thresholds', () => {
      for (const lang of supportedLanguages) {
        const tool = getCoverageTool(lang)!;
        const ut = tool.recommendedThresholds.ut;
        const it = tool.recommendedThresholds.it;
        expect(ut.line).toBeGreaterThanOrEqual(50);
        expect(ut.line).toBeLessThanOrEqual(100);
        expect(it.line).toBeGreaterThanOrEqual(40);
        // Integration test thresholds should be lower than unit test thresholds
        expect(it.line).toBeLessThanOrEqual(ut.line);
      }
    });
  });
});
