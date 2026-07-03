/**
 * API Tests: CLI programmatic interface
 * Pyramid Level: API
 * Tests the public API surface of the khufu CLI framework.
 *
 * These tests verify the API contract — that exported functions return
 * expected shapes, accept expected inputs, and behave as documented.
 *
 * Compilation notes:
 * - Tests import from src/ modules directly.
 * - All dependencies are available in the test environment.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createProgram } from '../src/cli/main.js';
import { DefaultToolRegistry } from '../src/registry/tool-registry.js';
import { getDefaultConfig } from '../src/config/default-config.js';
import type { KhufuConfig, PyramidLevel, ToolDefinition, ToolRegistry } from '../src/registry/types.js';

describe('API Tests — CLI Program Structure', () => {
  describe('Program creation API', () => {
    it('createProgram() returns a configured Command', () => {
      const program = createProgram();

      // API contract: program must have name, description, version
      expect(program.name()).toBe('khufu');
      expect(program.description()).toBeTruthy();
      expect(program.version()).toBeTruthy();
    });

    it('program has init subcommand with expected interface', () => {
      const program = createProgram();
      const initCmd = program.commands.find((c) => c.name() === 'init');

      expect(initCmd).toBeDefined();
      // API contract: init command has options
      expect(initCmd!.options.length).toBeGreaterThanOrEqual(5);
    });

    it('init command accepts --ide option', () => {
      const program = createProgram();
      const initCmd = program.commands.find((c) => c.name() === 'init')!;
      const ideOption = initCmd.options.find((o) => o.long === '--ide');
      expect(ideOption).toBeDefined();
    });

    it('init command accepts --global flag', () => {
      const program = createProgram();
      const initCmd = program.commands.find((c) => c.name() === 'init')!;
      const globalOption = initCmd.options.find((o) => o.long === '--global');
      expect(globalOption).toBeDefined();
    });

    it('init command accepts --scope option with values', () => {
      const program = createProgram();
      const initCmd = program.commands.find((c) => c.name() === 'init')!;
      const scopeOption = initCmd.options.find((o) => o.long === '--scope');
      expect(scopeOption).toBeDefined();
    });

    it('init command accepts -y shorthand', () => {
      const program = createProgram();
      const initCmd = program.commands.find((c) => c.name() === 'init')!;
      const yesOption = initCmd.options.find((o) => o.short === '-y');
      expect(yesOption).toBeDefined();
    });
  });

  describe('Tool Registry API', () => {
    let registry: DefaultToolRegistry;

    beforeEach(() => {
      registry = new DefaultToolRegistry();
    });

    it('implements ToolRegistry interface', () => {
      // Verify registry conforms to the interface
      expect(typeof registry.list).toBe('function');
      expect(typeof registry.get).toBe('function');
      expect(typeof registry.register).toBe('function');
    });

    it('list() returns ToolDefinition array', () => {
      const tools = registry.list();
      expect(Array.isArray(tools)).toBe(true);
      for (const tool of tools) {
        expect(tool.id).toBeTruthy();
        expect(tool.name).toBeTruthy();
        expect(tool.configDir).toBeTruthy();
        expect(tool.skillsDir).toBeTruthy();
        expect(typeof tool.skillSubdirPattern).toBe('boolean');
      }
    });

    it('get() returns ToolDefinition | undefined', () => {
      const tool = registry.get('claude');
      expect(tool).toBeDefined();
      expect(tool!.id).toBe('claude');

      const missing = registry.get('nonexistent');
      expect(missing).toBeUndefined();
    });

    it('register() validates ToolDefinition shape', () => {
      const validTool: ToolDefinition = {
        id: 'test',
        name: 'Test',
        configDir: '.test',
        skillsDir: '.test/skills',
        skillSubdirPattern: true,
        globalConfigDir: '~/.test',
        globalSkillsDir: '~/.test/skills',
      };

      expect(() => registry.register(validTool)).not.toThrow();
    });
  });

  describe('Config API', () => {
    it('getDefaultConfig returns KhufuConfig shape', () => {
      const config = getDefaultConfig('claude', 'java');

      // Verify KhufuConfig interface
      expect(config.ide).toBeDefined();
      expect(config.scope).toBeDefined();
      expect(config.frameworks).toBeDefined();
      expect(config.directories).toBeDefined();
      expect(config.coverage).toBeDefined();
    });

    it('all supported pyramid levels are in config shape', () => {
      const levels: PyramidLevel[] = ['ut', 'it', 'api', 'e2e'];
      const config = getDefaultConfig('claude', 'typescript');

      for (const level of levels) {
        expect(config.frameworks).toHaveProperty(level);
        expect(config.directories).toHaveProperty(level);
      }
    });

    it('unknown language returns empty defaults', () => {
      const config = getDefaultConfig('claude', 'unknownlang');
      expect(config.frameworks.ut).toBeUndefined();
      expect(config.directories.ut).toBeUndefined();
    });

    it('config shape matches KhufuConfig type (static check)', () => {
      const config: KhufuConfig = getDefaultConfig('claude', 'python');
      // If this compiles, the shape is correct
      expect(config.ide).toBe('claude');
      expect(config.scope).toBe('project');
    });
  });

  describe('Framework Mapper API', () => {
    it('getFrameworks accepts language + level and returns Framework[]', async () => {
      const { getFrameworks } = await import('../src/detection/framework-mapper.js');

      const frameworks = getFrameworks('java', 'ut');
      expect(Array.isArray(frameworks)).toBe(true);
      expect(frameworks.length).toBeGreaterThan(0);

      for (const fw of frameworks) {
        expect(fw.name).toBeTruthy();
        expect(fw.language).toBeTruthy();
        expect(fw.level).toBe('ut');
        expect(fw.description).toBeTruthy();
        expect(['primary', 'alternative', 'legacy']).toContain(fw.recommendation);
      }
    });

    it('getAllFrameworksForLanguage returns all four levels', async () => {
      const { getAllFrameworksForLanguage } = await import('../src/detection/framework-mapper.js');

      const all = getAllFrameworksForLanguage('python');
      expect(Object.keys(all)).toHaveLength(4);
      expect(all.ut.length).toBeGreaterThan(0);
      expect(all.it.length).toBeGreaterThan(0);
      expect(all.api.length).toBeGreaterThan(0);
      expect(all.e2e.length).toBeGreaterThan(0);
    });

    it('getCoverageTool returns CoverageTool | undefined', async () => {
      const { getCoverageTool } = await import('../src/detection/framework-mapper.js');

      const tool = getCoverageTool('java');
      expect(tool).toBeDefined();
      expect(tool!.name).toBeTruthy();
      expect(tool!.runCommand).toBeTruthy();
      expect(tool!.formats.length).toBeGreaterThan(0);

      const missing = getCoverageTool('haskell');
      expect(missing).toBeUndefined();
    });
  });

  describe('Language Detector API', () => {
    it('detectLanguage returns DetectionResult | undefined', async () => {
      const { detectLanguage } = await import('../src/detection/language-detector.js');

      // Detect from current project (should find TypeScript)
      const result = await detectLanguage(process.cwd());
      // Current project has package.json + tsconfig.json = typescript
      if (result) {
        expect(result.language).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(result.confidence);
      }
    });
  });
});
