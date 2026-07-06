/**
 * Unit Tests: config-loader
 * Pyramid Level: UT
 * Tests config loading/saving with isolated temp directories.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// We import the module under test
// Note: config-loader uses fs-extra and js-yaml — both work in Node without mocking

describe('ConfigLoader — Unit Tests', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `khufu-ut-config-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    await fs.ensureDir(path.join(tmpDir, '.khufu'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('loadConfig', () => {
    it('should return null when khufu.yaml does not exist', async () => {
      const { loadConfig } = await import('../src/config/config-loader.js');
      const config = await loadConfig(tmpDir);
      expect(config).toBeNull();
    });

    it('should load a valid khufu.yaml file', async () => {
      const yamlContent = `ide: claude
language: typescript
frameworks:
  ut: jest
  it: jest
  api: supertest
  e2e: playwright
scope: project
`;
      await fs.writeFile(path.join(tmpDir, '.khufu', 'khufu.yaml'), yamlContent, 'utf-8');

      const { loadConfig } = await import('../src/config/config-loader.js');
      const config = await loadConfig(tmpDir);
      expect(config).not.toBeNull();
      expect(config!.ide).toEqual(['claude']);
      expect(config!.language).toBe('typescript');
      expect(config!.frameworks.ut).toBe('jest');
      expect(config!.scope).toBe('project');
    });

    it('should load a config with coverage settings', async () => {
      const yamlContent = `ide: claude
language: java
coverage:
  ut:
    tool: jacoco
    thresholds:
      line: 80
      branch: 70
scope: project
`;
      await fs.writeFile(path.join(tmpDir, '.khufu', 'khufu.yaml'), yamlContent, 'utf-8');

      const { loadConfig } = await import('../src/config/config-loader.js');
      const config = await loadConfig(tmpDir);
      expect(config!.coverage.ut).toBeDefined();
      expect(config!.coverage.ut!.tool).toBe('jacoco');
      expect(config!.coverage.ut!.thresholds!.line).toBe(80);
    });

    it('should return null for invalid YAML', async () => {
      await fs.writeFile(path.join(tmpDir, '.khufu', 'khufu.yaml'), '{{{ invalid: yaml: [[', 'utf-8');

      const { loadConfig } = await import('../src/config/config-loader.js');
      const config = await loadConfig(tmpDir);
      expect(config).toBeNull();
    });

    it('should load config with all pyramid levels configured', async () => {
      const yamlContent = `ide: claude
language: java
frameworks:
  ut: junit5
  it: spring-boot-test
  api: rest-assured
  e2e: playwright
directories:
  ut: src/test/java/
  it: src/test/java/
  api: src/test/java/
  e2e: e2e/
scope: project
`;
      await fs.writeFile(path.join(tmpDir, '.khufu', 'khufu.yaml'), yamlContent, 'utf-8');

      const { loadConfig } = await import('../src/config/config-loader.js');
      const config = await loadConfig(tmpDir);
      expect(config!.frameworks.ut).toBe('junit5');
      expect(config!.frameworks.it).toBe('spring-boot-test');
      expect(config!.frameworks.api).toBe('rest-assured');
      expect(config!.frameworks.e2e).toBe('playwright');
    });
  });

  describe('saveConfig', () => {
    it('should save config to khufu.yaml', async () => {
      const { saveConfig } = await import('../src/config/config-loader.js');
      const config = {
        ide: ['claude'],
        language: 'python',
        frameworks: { ut: 'pytest' },
        directories: { ut: 'tests/' },
        coverage: {},
        scope: 'project' as const,
      };

      await saveConfig(tmpDir, config);

      const configPath = path.join(tmpDir, '.khufu', 'khufu.yaml');
      expect(await fs.pathExists(configPath)).toBe(true);

      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toContain('- claude');
      expect(content).toContain('python');
      expect(content).toContain('pytest');
    });

    it('should overwrite existing khufu.yaml', async () => {
      const configPath = path.join(tmpDir, '.khufu', 'khufu.yaml');
      await fs.writeFile(configPath, 'ide: old-ide\nscope: project\n', 'utf-8');

      const { saveConfig } = await import('../src/config/config-loader.js');
      const config = {
        ide: ['claude'],
        frameworks: {},
        directories: {},
        coverage: {},
        scope: 'global' as const,
      };

      await saveConfig(tmpDir, config);

      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toContain('- claude');
      expect(content).not.toContain('old-ide');
    });

    it('should save and load back consistently', async () => {
      const { saveConfig, loadConfig } = await import('../src/config/config-loader.js');
      const originalConfig = {
        ide: ['claude'],
        language: 'typescript',
        frameworks: { ut: 'vitest', it: 'vitest', api: 'supertest', e2e: 'playwright' },
        directories: { ut: '__tests__/', it: '__tests__/integration/' },
        coverage: {
          ut: {
            tool: 'istanbul',
            thresholds: { line: 80, branch: 70 },
            formats: ['lcov', 'html'],
          },
        },
        scope: 'project' as const,
      };

      await saveConfig(tmpDir, originalConfig);
      const loaded = await loadConfig(tmpDir);

      expect(loaded).not.toBeNull();
      expect(loaded!.ide).toEqual(originalConfig.ide);
      expect(loaded!.language).toBe(originalConfig.language);
      expect(loaded!.frameworks.ut).toBe(originalConfig.frameworks.ut);
      expect(loaded!.scope).toBe(originalConfig.scope);
    });
  });
});
