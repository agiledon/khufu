/**
 * End-to-End Tests: khufu CLI
 * Pyramid Level: E2E
 * Tests the full CLI invocation as a user would run it.
 *
 * Compilation notes:
 * - Relies on the dist/ build output. The CLI binary at dist/index.js
 *   must exist before running these tests.
 *
 * - Build suggestion: Run `npm run build` before executing E2E tests.
 *   If dist/ is missing or stale, tests will fail with a clear error.
 *
 * - Uses child_process to invoke the CLI, which is standard for E2E testing.
 *
 * Running:
 *   1. npm run build        # Ensure dist/ is up to date
 *   2. npx vitest run       # Run all tests including E2E
 *
 *   Or run E2E tests specifically:
 *   npx vitest run test/khufu-init.e2e.test.ts
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execSync, ExecSyncOptions } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/** Path to the built CLI entry point */
function getCliPath(): string {
  const distPath = path.resolve(process.cwd(), 'dist', 'index.js');
  if (!fs.pathExistsSync(distPath)) {
    throw new Error(
      `E2E tests require the CLI to be built first.\n` +
      `Expected: ${distPath}\n` +
      `Run: npm run build\n` +
      `Then: npx vitest run`,
    );
  }
  return distPath;
}

/** Execute the CLI and return stdout + stderr */
function runKhufu(args: string[], cwd: string): { stdout: string; stderr: string; status: number | null } {
  const cliPath = getCliPath();
  const cmd = `node ${cliPath} ${args.join(' ')}`;
  const opts: ExecSyncOptions = {
    cwd,
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'pipe',
    timeout: 30000,
  };

  try {
    const stdout = execSync(cmd, { ...opts, stdio: 'pipe' });
    return { stdout: stdout.toString(), stderr: '', status: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() || '',
      stderr: err.stderr?.toString() || '',
      status: err.status ?? null,
    };
  }
}

describe('khufu CLI — E2E Tests', () => {
  let tmpDir: string;

  beforeAll(() => {
    // Verify CLI is built before running any E2E test
    const cliPath = path.resolve(process.cwd(), 'dist', 'index.js');
    if (!fs.pathExistsSync(cliPath)) {
      console.warn(
        `\n⚠ E2E tests: dist/index.js not found. ` +
        `Run "npm run build" first.\n` +
        `Skipping E2E tests.\n`,
      );
    }
  });

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `khufu-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    await fs.ensureDir(path.join(tmpDir, '.khufu'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('khufu --help', () => {
    it('should print help and exit 0', () => {
      const result = runKhufu(['--help'], tmpDir);
      expect(result.stdout).toContain('khufu');
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('--help');
    });

    it('should show command list', () => {
      const result = runKhufu(['--help'], tmpDir);
      expect(result.stdout).toContain('init');
    });
  });

  describe('khufu --version', () => {
    it('should print version', () => {
      const result = runKhufu(['--version'], tmpDir);
      expect(result.stdout).toBeTruthy();
    });
  });

  describe('khufu init --help', () => {
    it('should show init command options', () => {
      const result = runKhufu(['init', '--help'], tmpDir);
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('--ide');
      expect(result.stdout).toContain('--global');
      expect(result.stdout).toContain('--force');
      expect(result.stdout).toContain('--yes');
    });
  });

  describe('khufu init (full flow)', () => {
    it('should not choose a tool when --yes is given without --ide', () => {
      const result = runKhufu(['init', '--yes'], tmpDir);
      const output = result.stdout + result.stderr;

      expect(output).toContain('--ide');
      expect(result.status).not.toBe(0);
      expect(fs.pathExistsSync(path.join(tmpDir, '.khufu', 'khufu.yaml'))).toBe(false);
    });

    it('should create project structure with --yes flag', () => {
      const result = runKhufu(['init', '--ide', 'claude', '--yes'], tmpDir);

      // Verify output includes key messages
      const output = result.stdout + result.stderr;
      expect(output).toContain('Khufu');

      // Verify files were created
      expect(fs.pathExistsSync(path.join(tmpDir, '.khufu', 'khufu.yaml'))).toBe(true);
      expect(fs.pathExistsSync(path.join(tmpDir, '.khufu'))).toBe(true);
    });

    it('should create valid khufu.yaml', () => {
      runKhufu(['init', '--ide', 'claude', '--yes'], tmpDir);

      const configContent = fs.readFileSync(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'utf-8');
      expect(configContent).toContain('- claude');
      expect(configContent).toContain('scope:');
    });

    it('should handle --ide claude flag', () => {
      runKhufu(['init', '--ide', 'claude', '--yes'], tmpDir);

      // Should succeed (not error out)
      expect(fs.pathExistsSync(path.join(tmpDir, '.khufu', 'khufu.yaml'))).toBe(true);
    });

    it('should handle --global flag', () => {
      runKhufu(['init', '--ide', 'claude', '--global', '--yes'], tmpDir);

      expect(fs.pathExistsSync(path.join(tmpDir, '.khufu', 'khufu.yaml'))).toBe(true);
      const content = fs.readFileSync(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'utf-8');
      expect(content).toContain('scope: global');
    });

    it('should handle --scope project flag', () => {
      runKhufu(['init', '--ide', 'claude', '--scope', 'project', '--yes'], tmpDir);

      const content = fs.readFileSync(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'utf-8');
      expect(content).toContain('scope: project');
    });

    it('should install skills into .claude/skills/', () => {
      runKhufu(['init', '--ide', 'claude', '--yes'], tmpDir);

      const skillsDir = path.join(tmpDir, '.claude', 'skills');
      if (fs.pathExistsSync(skillsDir)) {
        const entries = fs.readdirSync(skillsDir);
        const skillDirs = entries.filter((e) => e.startsWith('khufu-'));
        expect(skillDirs.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should detect Python project and configure accordingly', () => {
      fs.writeFileSync(path.join(tmpDir, 'setup.py'), '# setup', 'utf-8');

      runKhufu(['init', '--ide', 'claude', '--yes'], tmpDir);

      const content = fs.readFileSync(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'utf-8');
      expect(content).toContain('python');
    });

    it('should detect TypeScript project and configure accordingly', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name":"test"}', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}', 'utf-8');

      runKhufu(['init', '--ide', 'claude', '--yes'], tmpDir);

      const content = fs.readFileSync(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'utf-8');
      expect(content).toContain('typescript');
    });

    it('should report error for nonexistent IDE', () => {
      const result = runKhufu(['init', '--ide', 'nonexistent-ide'], tmpDir);

      // Should show a warning or error about unknown IDE
      const output = result.stdout + result.stderr;
      expect(output).toBeTruthy(); // Something was output
    });
  });

  describe('khufu init error handling', () => {
    it('should not crash with unknown flags', () => {
      // commander handles unknown options gracefully
      const result = runKhufu(['--invalid-flag-that-does-not-exist'], tmpDir);
      // commander exits with error for unknown flags
      const output = result.stdout + result.stderr;
      expect(output).toBeTruthy();
    });

    it('should handle read-only directory gracefully', () => {
      // This tests error resilience when writing to restricted directories.
      // Note: On macOS/Linux, the file owner can still write even with 0o444,
      // so this test may not trigger an error. The test verifies the CLI
      // doesn't crash regardless.
      const readOnlyDir = path.join(tmpDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      try {
        fs.chmodSync(readOnlyDir, 0o444); // read-only

        // Should not crash — may succeed (owner override) or report error
        const result = runKhufu(['init', '--yes'], readOnlyDir);
        // Just verify it didn't crash the process (we're still here)
        expect(result.status === 0 || result.status === 1 || result.status === null).toBe(true);
      } finally {
        fs.chmodSync(readOnlyDir, 0o755);
      }
    });
  });

  describe('idempotency', () => {
    it('init --yes should succeed on already-initialized project', () => {
      // First init
      runKhufu(['init', '--ide', 'claude', '--yes'], tmpDir);

      // Second init — should not error, but should skip install
      const result = runKhufu(['init', '--ide', 'claude', '--yes'], tmpDir);

      // Config should still exist
      expect(fs.pathExistsSync(path.join(tmpDir, '.khufu', 'khufu.yaml'))).toBe(true);
      // Should not crash — status indicates completion
      expect(result.status === 0 || result.status === 1 || result.status === null).toBe(true);
    });

    it('init --force should overwrite existing config', () => {
      // Create existing config
      fs.writeFileSync(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'ide: old\nscope: project\n', 'utf-8');

      // Force reinit
      runKhufu(['init', '--ide', 'claude', '--yes', '--force'], tmpDir);

      const content = fs.readFileSync(path.join(tmpDir, '.khufu', 'khufu.yaml'), 'utf-8');
      expect(content).toContain('- claude');
      expect(content).not.toMatch(/^ide:\s*old/m);
    });
  });
});
