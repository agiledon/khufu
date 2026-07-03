/**
 * Unit Tests: CLI main
 * Pyramid Level: UT
 * Tests the CLI program structure and command registration.
 *
 * Compilation notes:
 * - Depends on commander package for Command creation.
 * - Tests program structure — not execution, since commands have side effects.
 * - Does not actually execute commands (no process.exit mock needed).
 */
import { describe, it, expect } from 'vitest';
import { createProgram } from '../src/cli/main.js';

describe('CLI Main — Unit Tests', () => {
  describe('createProgram', () => {
    it('should return a Command instance', () => {
      const program = createProgram();
      expect(program).toBeDefined();
      expect(typeof program.name).toBe('function');
    });

    it('should have name "khufu"', () => {
      const program = createProgram();
      expect(program.name()).toBe('khufu');
    });

    it('should have a description', () => {
      const program = createProgram();
      const desc = program.description();
      expect(desc).toBeTruthy();
      expect(desc).toContain('Test');
    });

    it('should have a version', () => {
      const program = createProgram();
      expect(program.version()).toBeTruthy();
    });

    it('should have "init" command registered', () => {
      const program = createProgram();
      const commands = program.commands.map((c) => c.name());
      expect(commands).toContain('init');
    });

    it('should use commander API correctly', () => {
      const program = createProgram();
      // commander exposes commands as an array
      expect(program.commands.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('init command', () => {
    it('should have description', () => {
      const program = createProgram();
      const initCmd = program.commands.find((c) => c.name() === 'init');
      expect(initCmd).toBeDefined();
      expect(initCmd!.description()).toBeTruthy();
    });

    it('should have expected options', () => {
      const program = createProgram();
      const initCmd = program.commands.find((c) => c.name() === 'init')!;

      const optionNames = initCmd.options.map((o) => o.long || o.short);
      expect(optionNames).toContain('--ide');
      expect(optionNames).toContain('--global');
      expect(optionNames).toContain('--scope');
      expect(optionNames).toContain('--force');
      expect(optionNames).toContain('--yes');
    });
  });
});
