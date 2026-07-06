/**
 * Unit Tests: project-scaffolder
 * Pyramid Level: UT
 * Tests scaffoldProject, updateInstalledState, readInstalledState with temp directories.
 *
 * Compilation note: These tests import modules that depend on fs-extra, js-yaml,
 * and getDefaultConfig — all work fine in Node test environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('ProjectScaffolder — Unit Tests', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `khufu-ut-scaffold-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    await fs.ensureDir(path.join(tmpDir, '.khufu'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('scaffoldProject', () => {
    it('should create .khufu/ directory and khufu.yaml', async () => {
      const { scaffoldProject } = await import('../src/scaffold/project-scaffolder.js');

      const result = await scaffoldProject(tmpDir, ['claude'], 'project', 'typescript');

      expect(result.config).toBeDefined();
      expect(result.config.ide).toEqual(['claude']);
      expect(result.config.scope).toBe('project');
      expect(result.khufuDir).toBe(path.join(tmpDir, '.khufu'));

      // Verify files exist
      expect(await fs.pathExists(path.join(tmpDir, '.khufu', 'khufu.yaml'))).toBe(true);
      expect(await fs.pathExists(path.join(tmpDir, '.khufu'))).toBe(true);
      expect(await fs.pathExists(path.join(tmpDir, '.khufu', 'installed-skills.json'))).toBe(true);
    });

    it('should create proper khufu.yaml content', async () => {
      const { scaffoldProject } = await import('../src/scaffold/project-scaffolder.js');

      await scaffoldProject(tmpDir, ['claude'], 'project', 'python');

      const configContent = await fs.readFile(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'utf-8');
      expect(configContent).toContain('- claude');
      expect(configContent).toContain('python');
      expect(configContent).toContain('scope: project');
    });

    it('should create installed-skills.json with initial state', async () => {
      const { scaffoldProject } = await import('../src/scaffold/project-scaffolder.js');

      const result = await scaffoldProject(tmpDir, ['claude'], 'global', 'go');

      const statePath = path.join(result.khufuDir, 'installed-skills.json');
      const state = await fs.readJson(statePath);
      expect(state.version).toBeTruthy();
      expect(state.installedAt).toBeTruthy();
      expect(Array.isArray(state.skills)).toBe(true);
      expect(state.skills).toHaveLength(0);
    });

    it('should throw if khufu.yaml already exists (no force)', async () => {
      await fs.writeFile(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'ide: old\n', 'utf-8');

      const { scaffoldProject } = await import('../src/scaffold/project-scaffolder.js');

      await expect(
        scaffoldProject(tmpDir, ['claude'], 'project'),
      ).rejects.toThrow(/already exists/);
    });

    it('should overwrite when force=true', async () => {
      await fs.writeFile(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'ide: old\n', 'utf-8');

      const { scaffoldProject } = await import('../src/scaffold/project-scaffolder.js');

      const result = await scaffoldProject(tmpDir, ['claude'], 'project', 'typescript', true);
      expect(result.config.ide).toEqual(['claude']);
    });

    it('should set language in config when provided', async () => {
      const { scaffoldProject } = await import('../src/scaffold/project-scaffolder.js');

      const result = await scaffoldProject(tmpDir, ['claude'], 'project', 'java');
      expect(result.config.language).toBe('java');
      expect(result.config.frameworks.ut).toBe('junit5');
    });

    it('should set language to undefined when not provided', async () => {
      const { scaffoldProject } = await import('../src/scaffold/project-scaffolder.js');

      const result = await scaffoldProject(tmpDir, ['claude'], 'project');
      expect(result.config.language).toBeUndefined();
    });
  });

  describe('updateInstalledState', () => {
    it('should write installed skills to JSON file', async () => {
      const { updateInstalledState } = await import('../src/scaffold/project-scaffolder.js');

      const khufuDir = path.join(tmpDir, '.khufu');
      await fs.ensureDir(khufuDir);

      const skills = [
        { name: 'khufu-ut', version: '0.2.0', path: '/tmp/test/khufu-ut' },
        { name: 'khufu-it', version: '0.2.0', path: '/tmp/test/khufu-it' },
      ];

      await updateInstalledState(khufuDir, skills);

      const statePath = path.join(khufuDir, 'installed-skills.json');
      expect(await fs.pathExists(statePath)).toBe(true);

      const state = await fs.readJson(statePath);
      expect(state.skills).toHaveLength(2);
      expect(state.skills[0].name).toBe('khufu-ut');
      expect(state.skills[1].name).toBe('khufu-it');
    });

    it('should overwrite existing state', async () => {
      const { updateInstalledState } = await import('../src/scaffold/project-scaffolder.js');

      const khufuDir = path.join(tmpDir, '.khufu');
      await fs.ensureDir(khufuDir);

      // Write initial state
      const statePath = path.join(khufuDir, 'installed-skills.json');
      await fs.writeJson(statePath, {
        installedAt: 'old-date',
        version: '0.1.0',
        skills: [],
      });

      // Update
      const skills = [{ name: 'khufu-ut', version: '0.2.0', path: '/tmp/test' }];
      await updateInstalledState(khufuDir, skills);

      const state = await fs.readJson(statePath);
      expect(state.version).toBe('0.1.0'); // version is hardcoded in scaffoldProject
      expect(state.skills).toHaveLength(1);
    });
  });

  describe('readInstalledState', () => {
    it('should return null if state file does not exist', async () => {
      const { readInstalledState } = await import('../src/scaffold/project-scaffolder.js');

      const khufuDir = path.join(tmpDir, '.khufu');
      await fs.ensureDir(khufuDir);

      const state = await readInstalledState(khufuDir);
      expect(state).toBeNull();
    });

    it('should return parsed state when file exists', async () => {
      const { readInstalledState } = await import('../src/scaffold/project-scaffolder.js');

      const khufuDir = path.join(tmpDir, '.khufu');
      await fs.ensureDir(khufuDir);

      const statePath = path.join(khufuDir, 'installed-skills.json');
      await fs.writeJson(statePath, {
        installedAt: '2024-01-01T00:00:00Z',
        version: '0.2.0',
        skills: [{ name: 'khufu-ut', version: '0.2.0', path: '/tmp/test' }],
      });

      const state = await readInstalledState(khufuDir);
      expect(state).not.toBeNull();
      expect(state!.version).toBe('0.2.0');
      expect(state!.skills).toHaveLength(1);
    });

    it('should return null for invalid JSON', async () => {
      const { readInstalledState } = await import('../src/scaffold/project-scaffolder.js');

      const khufuDir = path.join(tmpDir, '.khufu');
      await fs.ensureDir(khufuDir);

      await fs.writeFile(path.join(khufuDir, 'installed-skills.json'), 'not json', 'utf-8');

      const state = await readInstalledState(khufuDir);
      expect(state).toBeNull();
    });
  });
});
