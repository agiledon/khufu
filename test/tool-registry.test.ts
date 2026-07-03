/**
 * Unit Tests: tool-registry
 * Pyramid Level: UT
 * Tests the DefaultToolRegistry for IDE tool management.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultToolRegistry } from '../src/registry/tool-registry.js';
import type { ToolDefinition } from '../src/registry/types.js';

describe('ToolRegistry — Unit Tests', () => {
  let registry: DefaultToolRegistry;

  beforeEach(() => {
    registry = new DefaultToolRegistry();
  });

  describe('list', () => {
    it('should return built-in tools on creation', () => {
      const tools = registry.list();
      expect(tools.length).toBeGreaterThanOrEqual(1);
      expect(tools.map((t) => t.id)).toContain('claude');
    });

    it('should return an array', () => {
      expect(Array.isArray(registry.list())).toBe(true);
    });
  });

  describe('get', () => {
    it('should return claude tool by id', () => {
      const tool = registry.get('claude');
      expect(tool).toBeDefined();
      expect(tool!.id).toBe('claude');
      expect(tool!.name).toBe('Claude Code');
    });

    it('should return undefined for unknown tool id', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(registry.get('')).toBeUndefined();
    });
  });

  describe('register', () => {
    it('should register a new tool definition', () => {
      const cursorTool: ToolDefinition = {
        id: 'cursor',
        name: 'Cursor IDE',
        configDir: '.cursor',
        skillsDir: '.cursor/skills',
        skillSubdirPattern: true,
        globalConfigDir: '~/.cursor',
        globalSkillsDir: '~/.cursor/skills',
      };

      registry.register(cursorTool);
      expect(registry.get('cursor')).toEqual(cursorTool);
      expect(registry.list().length).toBeGreaterThanOrEqual(2);
    });

    it('should register a tool without plugin manifest', () => {
      const simpleTool: ToolDefinition = {
        id: 'simple-ide',
        name: 'Simple IDE',
        configDir: '.simple',
        skillsDir: '.simple/skills',
        skillSubdirPattern: false,
        globalConfigDir: '~/.simple',
        globalSkillsDir: '~/.simple/skills',
      };

      registry.register(simpleTool);
      expect(registry.get('simple-ide')!.pluginManifestPath).toBeUndefined();
    });

    it('should throw when registering duplicate tool id', () => {
      expect(() => {
        registry.register(registry.get('claude')!);
      }).toThrow(/already registered/);
    });

    it('should throw with tool id in error message', () => {
      try {
        registry.register(registry.get('claude')!);
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toContain('claude');
        expect((err as Error).message).toContain('already registered');
      }
    });
  });

  describe('claude tool definition', () => {
    it('should have required fields', () => {
      const tool = registry.get('claude')!;
      expect(tool.id).toBe('claude');
      expect(tool.name).toBeTruthy();
      expect(tool.configDir).toBeTruthy();
      expect(tool.skillsDir).toBeTruthy();
      expect(tool.globalConfigDir).toBeTruthy();
      expect(tool.globalSkillsDir).toBeTruthy();
    });

    it('should have subdirectory pattern enabled', () => {
      const tool = registry.get('claude')!;
      expect(tool.skillSubdirPattern).toBe(true);
    });

    it('should have plugin manifest path', () => {
      const tool = registry.get('claude')!;
      expect(tool.pluginManifestPath).toBe('.claude-plugin/plugin.json');
    });

    it('should have skillsDir under configDir', () => {
      const tool = registry.get('claude')!;
      expect(tool.skillsDir.startsWith(tool.configDir)).toBe(true);
    });
  });

  describe('list after registration', () => {
    it('should include all registered tools', () => {
      const before = registry.list().length;

      registry.register({
        id: 'test-ide-1',
        name: 'Test IDE 1',
        configDir: '.test1',
        skillsDir: '.test1/skills',
        skillSubdirPattern: false,
        globalConfigDir: '~/.test1',
        globalSkillsDir: '~/.test1/skills',
      });

      registry.register({
        id: 'test-ide-2',
        name: 'Test IDE 2',
        configDir: '.test2',
        skillsDir: '.test2/skills',
        skillSubdirPattern: true,
        globalConfigDir: '~/.test2',
        globalSkillsDir: '~/.test2/skills',
      });

      expect(registry.list().length).toBe(before + 2);
    });
  });
});
