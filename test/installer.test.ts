/**
 * Unit Tests: installer
 * Pyramid Level: UT
 * Tests skill installation into target IDE directories.
 *
 * Compilation notes:
 * - installer.ts uses import.meta.url for resolving skills source dir.
 *   In vitest, this resolves correctly from the source tree.
 * - The skills/ directory must exist at the project root for these tests.
 *   If running from a CI build without skills/, getSkillsSourceDir() will fail.
 *   Solution: ensure skills/ is present, or mock fileURLToPath.
 *
 * - installer.ts depends on fs-extra (works in Node test environment).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { ToolDefinition } from '../src/registry/types.js';

// Simple Claude-like tool for testing
const testTool: ToolDefinition = {
  id: 'claude',
  name: 'Claude Code',
  configDir: '.claude',
  skillsDir: '.claude/skills',
  skillSubdirPattern: true,
  pluginManifestPath: '.claude-plugin/plugin.json',
  globalConfigDir: '~/.claude',
  globalSkillsDir: '~/.claude/skills',
};

// A tool without subdirectory pattern
const flatTool: ToolDefinition = {
  id: 'flat-ide',
  name: 'Flat IDE',
  configDir: '.flat',
  skillsDir: '.flat/skills',
  skillSubdirPattern: false,
  globalConfigDir: '~/.flat',
  globalSkillsDir: '~/.flat/skills',
};

describe('Installer — Unit Tests', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `khufu-ut-installer-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('installSkills (project-level)', () => {
    it('should install skills to project directory with subdir pattern', async () => {
      const { installSkills } = await import('../src/scaffold/installer.js');

      const result = await installSkills({
        tool: testTool,
        scope: 'project',
        cwd: tmpDir,
        force: false,
      });

      // At least some skills should be installed
      expect(result.installed.length).toBeGreaterThan(0);
      expect(result.installed.length + result.skipped.length).toBeGreaterThanOrEqual(4);

      // Verify files were created
      for (const installed of result.installed) {
        expect(await fs.pathExists(installed.targetPath)).toBe(true);
        expect(installed.name).toMatch(/^khufu-/);
      }
    });

    it('should install skills to correct target directory', async () => {
      const { installSkills } = await import('../src/scaffold/installer.js');

      await installSkills({
        tool: testTool,
        scope: 'project',
        cwd: tmpDir,
        force: false,
      });

      const expectedDir = path.join(tmpDir, '.claude', 'skills');
      expect(await fs.pathExists(expectedDir)).toBe(true);

      // Check subdirectory structure
      const entries = await fs.readdir(expectedDir);
      const skillDirs = entries.filter((e) => e.startsWith('khufu-'));
      expect(skillDirs.length).toBeGreaterThan(0);
    });

    it('should install skills to correct target for flat tool', async () => {
      const { installSkills } = await import('../src/scaffold/installer.js');

      const result = await installSkills({
        tool: flatTool,
        scope: 'project',
        cwd: tmpDir,
        force: false,
      });

      // For flat tools, files go directly to skillsDir without subdirectories
      if (result.installed.length > 0) {
        const expectedDir = path.join(tmpDir, '.flat', 'skills');
        expect(await fs.pathExists(expectedDir)).toBe(true);
      }
    });

    it('should skip already-installed skills (non-force)', async () => {
      const { installSkills } = await import('../src/scaffold/installer.js');

      // First install
      const result1 = await installSkills({
        tool: testTool,
        scope: 'project',
        cwd: tmpDir,
        force: false,
      });

      // Second install should skip all
      const result2 = await installSkills({
        tool: testTool,
        scope: 'project',
        cwd: tmpDir,
        force: false,
      });

      // No new installs on second run
      expect(result2.installed).toHaveLength(0);
      expect(result2.skipped.length).toBeGreaterThan(0);

      // All skipped should have "Already installed" reason
      for (const skip of result2.skipped) {
        expect(skip.reason).toMatch(/Already installed/);
      }
    });

    it('should overwrite with force=true', async () => {
      const { installSkills } = await import('../src/scaffold/installer.js');

      // First install
      await installSkills({
        tool: testTool,
        scope: 'project',
        cwd: tmpDir,
        force: false,
      });

      // Force reinstall
      const result = await installSkills({
        tool: testTool,
        scope: 'project',
        cwd: tmpDir,
        force: true,
      });

      // Should install everything fresh
      expect(result.installed.length).toBeGreaterThan(0);
      expect(result.skipped.length).toBe(0);
    });

    it('should return InstallResult with correct shape', async () => {
      const { installSkills } = await import('../src/scaffold/installer.js');

      const result = await installSkills({
        tool: testTool,
        scope: 'project',
        cwd: tmpDir,
        force: false,
      });

      expect(result).toHaveProperty('installed');
      expect(result).toHaveProperty('skipped');
      expect(Array.isArray(result.installed)).toBe(true);
      expect(Array.isArray(result.skipped)).toBe(true);

      for (const item of result.installed) {
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('targetPath');
      }
      for (const item of result.skipped) {
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('reason');
      }
    });

    it('should install every bundled skill', async () => {
      const { installSkills } = await import('../src/scaffold/installer.js');

      const result = await installSkills({
        tool: testTool,
        scope: 'project',
        cwd: tmpDir,
        force: false,
      });

      const names = result.installed.map((i) => i.name);
      expect(names).toContain('khufu-ut');
      expect(names).toContain('khufu-it');
      expect(names).toContain('khufu-api');
      expect(names).toContain('khufu-e2e');
      expect(names).toContain('khufu-harness');
      expect(names).toContain('khufu-to-prd');
      expect(names).toContain('khufu-to-test-cases');
    });

    it('should copy SKILL.md files (not empty)', async () => {
      const { installSkills } = await import('../src/scaffold/installer.js');

      const result = await installSkills({
        tool: testTool,
        scope: 'project',
        cwd: tmpDir,
        force: false,
      });

      for (const installed of result.installed) {
        const content = await fs.readFile(installed.targetPath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain('name:');
      }
    });
  });

  describe('installSkillsGlobal', () => {
    it('should install skills via symlink to global directory', async () => {
      const { installSkillsGlobal } = await import('../src/scaffold/installer.js');

      // Override global path to use temp dir
      const toolWithLocalGlobal: ToolDefinition = {
        ...testTool,
        globalSkillsDir: path.join(tmpDir, '.claude-global', 'skills'),
      };

      const result = await installSkillsGlobal(toolWithLocalGlobal, false);

      // Should install at least some skills
      const total = result.installed.length + result.skipped.length;
      expect(total).toBeGreaterThanOrEqual(4);
    });

    it('should skip existing symlinks (non-force)', async () => {
      const { installSkillsGlobal } = await import('../src/scaffold/installer.js');

      const toolWithLocalGlobal: ToolDefinition = {
        ...testTool,
        globalSkillsDir: path.join(tmpDir, '.claude-global', 'skills'),
      };

      // First install
      const result1 = await installSkillsGlobal(toolWithLocalGlobal, false);

      // Second install
      const result2 = await installSkillsGlobal(toolWithLocalGlobal, false);

      expect(result2.installed).toHaveLength(0);
      expect(result2.skipped.length).toBeGreaterThan(0);
    });

    it('should overwrite with force=true in global mode', async () => {
      const { installSkillsGlobal } = await import('../src/scaffold/installer.js');

      const toolWithLocalGlobal: ToolDefinition = {
        ...testTool,
        globalSkillsDir: path.join(tmpDir, '.claude-global', 'skills'),
      };

      // First install
      await installSkillsGlobal(toolWithLocalGlobal, false);

      // Force reinstall
      const result = await installSkillsGlobal(toolWithLocalGlobal, true);

      expect(result.installed.length).toBeGreaterThan(0);
    });
  });
});
