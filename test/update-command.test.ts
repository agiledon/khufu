/**
 * Unit Tests: update command
 * Pyramid Level: UT
 * Tests the version comparison and update decision logic.
 *
 * Compilation notes:
 * - Pure logic only — no network or process spawning.
 */
import { describe, it, expect } from 'vitest';
import { compareVersions, getLocalVersion } from '../src/version.js';
import { decideUpdate } from '../src/cli/commands/update.js';

describe('Version utilities — Unit Tests', () => {
  describe('compareVersions', () => {
    it('returns 0 for equal versions', () => {
      expect(compareVersions('0.4.1', '0.4.1')).toBe(0);
    });

    it('returns 1 when first is newer', () => {
      expect(compareVersions('0.4.1', '0.4.0')).toBe(1);
    });

    it('returns -1 when first is older', () => {
      expect(compareVersions('0.4.0', '0.4.1')).toBe(-1);
    });

    it('orders across major, minor, patch', () => {
      expect(compareVersions('1.0.0', '0.9.9')).toBe(1);
      expect(compareVersions('0.5.0', '0.4.9')).toBe(1);
      expect(compareVersions('0.4.2', '0.4.1')).toBe(1);
    });

    it('ignores a leading "v" prefix', () => {
      expect(compareVersions('v0.4.1', '0.4.0')).toBe(1);
    });

    it('treats a release as newer than a prerelease', () => {
      expect(compareVersions('0.4.1', '0.4.1-beta.1')).toBe(1);
      expect(compareVersions('0.4.1-beta.1', '0.4.1')).toBe(-1);
    });

    it('orders prereleases', () => {
      expect(compareVersions('0.4.1-beta.2', '0.4.1-beta.1')).toBe(1);
    });
  });

  describe('getLocalVersion', () => {
    it('returns a semver-like string', () => {
      expect(getLocalVersion()).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('matches the package.json version', () => {
      expect(getLocalVersion()).toBe('0.5.0');
    });
  });

  describe('decideUpdate', () => {
    it('returns "update" when latest is newer', () => {
      expect(decideUpdate('0.4.0', '0.4.1')).toBe('update');
    });

    it('returns "current" when versions are equal', () => {
      expect(decideUpdate('0.4.1', '0.4.1')).toBe('current');
    });

    it('returns "current" when local is newer', () => {
      expect(decideUpdate('0.5.0', '0.4.1')).toBe('current');
    });
  });
});
