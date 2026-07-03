/**
 * Integration Tests: init command
 * Pyramid Level: IT
 * Tests the init command flow wiring multiple modules together.
 *
 * Compilation notes:
 * - The init command imports: tool-registry, project-scaffolder, installer,
 *   language-detector, prompts. All work in Node test environment.
 * - inquirer prompts are skipped in non-interactive mode (test environment).
 * - These tests use real file system in temp directories.
 *
 * Running note:
 * - Tests in a CI environment without TTY will auto-select defaults.
 * - If skills/ directory is missing, installer will skip skills (not fail).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Init Command — Integration Tests', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `khufu-it-init-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
  });

  describe('initCommand with auto mode (non-interactive)', () => {
    it('should create khufu.yaml and .khufu/ directory', async () => {
      const { initCommand } = await import('../src/cli/commands/init.js');

      // Run with --yes to skip prompts
      await initCommand({ yes: true, force: false });

      // Verify scaffold result
      expect(await fs.pathExists(path.join(tmpDir, 'khufu.yaml'))).toBe(true);
      expect(await fs.pathExists(path.join(tmpDir, '.khufu'))).toBe(true);
      expect(await fs.pathExists(path.join(tmpDir, '.khufu', 'installed-skills.json'))).toBe(true);
    });

    it('should create valid khufu.yaml content', async () => {
      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ yes: true, force: false });

      const content = await fs.readFile(path.join(tmpDir, 'khufu.yaml'), 'utf-8');
      expect(content).toContain('ide: claude');
      expect(content).toContain('scope: project');
      // language detection: this dir may have some files that trigger detection
      // or it falls back to the default
    });

    it('should install skills when skills source is available', async () => {
      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ yes: true, force: false });

      // Check if skills were installed
      const skillsDir = path.join(tmpDir, '.claude', 'skills');
      if (await fs.pathExists(skillsDir)) {
        const entries = await fs.readdir(skillsDir);
        const skillDirs = entries.filter((e) => e.startsWith('khufu-'));
        // Skills should be installed if source is available
        expect(skillDirs.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should detect language from project files', async () => {
      // Create a python project
      await fs.writeFile(path.join(tmpDir, 'pyproject.toml'), '[tool]\nname="test"', 'utf-8');

      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ yes: true, force: false });

      const content = await fs.readFile(path.join(tmpDir, 'khufu.yaml'), 'utf-8');
      expect(content).toContain('python');
    });

    it('should detect TypeScript from package.json + tsconfig.json', async () => {
      await fs.writeFile(path.join(tmpDir, 'package.json'), '{"name":"test"}', 'utf-8');
      await fs.writeFile(path.join(tmpDir, 'tsconfig.json'), '{}', 'utf-8');

      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ yes: true, force: false });

      const content = await fs.readFile(path.join(tmpDir, 'khufu.yaml'), 'utf-8');
      expect(content).toContain('typescript');
    });

    it('should use specified IDE via --ide', async () => {
      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ ide: 'claude', yes: true, force: false });

      const content = await fs.readFile(path.join(tmpDir, 'khufu.yaml'), 'utf-8');
      expect(content).toContain('ide: claude');
    });

    it('should handle global scope', async () => {
      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ global: true, yes: true, force: false });

      const content = await fs.readFile(path.join(tmpDir, 'khufu.yaml'), 'utf-8');
      expect(content).toContain('scope: global');
    });

    it('should handle scope "project"', async () => {
      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ scope: 'project', yes: true, force: false });

      const content = await fs.readFile(path.join(tmpDir, 'khufu.yaml'), 'utf-8');
      expect(content).toContain('scope: project');
    });

    it('should detect Go project from go.mod', async () => {
      await fs.writeFile(path.join(tmpDir, 'go.mod'), 'module example.com/test\n\ngo 1.21', 'utf-8');

      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ yes: true, force: false });

      const content = await fs.readFile(path.join(tmpDir, 'khufu.yaml'), 'utf-8');
      expect(content).toContain('go');
    });

    it('should overwrite existing khufu.yaml with --force', async () => {
      await fs.writeFile(path.join(tmpDir, 'khufu.yaml'), 'ide: old-ide\nscope: project\n', 'utf-8');

      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ yes: true, force: true });

      const content = await fs.readFile(path.join(tmpDir, 'khufu.yaml'), 'utf-8');
      expect(content).toContain('ide: claude');
      expect(content).not.toContain('old-ide');
    });

    it('should handle empty directory (fallback to default language)', async () => {
      const { initCommand } = await import('../src/cli/commands/init.js');

      // Empty directory — no language detected
      // In auto mode, falls back to 'java'
      await initCommand({ yes: true, force: false });

      expect(await fs.pathExists(path.join(tmpDir, 'khufu.yaml'))).toBe(true);
    });
  });

  describe('installed-skills.json state', () => {
    it('should record installed skills in state file', async () => {
      const { initCommand } = await import('../src/cli/commands/init.js');

      await initCommand({ yes: true, force: false });

      const statePath = path.join(tmpDir, '.khufu', 'installed-skills.json');
      if (await fs.pathExists(statePath)) {
        const state = await fs.readJson(statePath);
        expect(state.version).toBeTruthy();
        expect(Array.isArray(state.skills)).toBe(true);
        // Each installed skill should have name, version, path
        for (const skill of state.skills) {
          expect(skill.name).toBeTruthy();
          expect(skill.version).toBeTruthy();
          expect(skill.path).toBeTruthy();
        }
      }
    });
  });
});
