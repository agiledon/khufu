import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import type { ToolDefinition, InstallScope } from '../registry/types.js';

const SKILL_NAMES = ['khufu-ut', 'khufu-it', 'khufu-api', 'khufu-e2e', 'khufu-harness'];

export interface InstallOptions {
  tool: ToolDefinition;
  scope: InstallScope;
  cwd: string;
  force: boolean;
}

export interface InstallResult {
  installed: Array<{ name: string; targetPath: string }>;
  skipped: Array<{ name: string; reason: string }>;
}

/**
 * Resolve the source directory containing the SKILL.md files.
 * When running from dist/, skills are at ../../skills/ relative to the source file.
 * When running from src/ during development, skills are at ../skills/.
 */
function getSkillsSourceDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Try dist/ layout first: dist/scaffold/installer.js -> ../../skills/
  let candidate = path.resolve(__dirname, '../../skills');
  if (fs.pathExistsSync(candidate)) {
    return candidate;
  }

  // Fallback: try from src/ layout: src/scaffold/installer.js -> ../skills/
  candidate = path.resolve(__dirname, '../skills');
  if (fs.pathExistsSync(candidate)) {
    return candidate;
  }

  throw new Error(
    'Could not locate skills source directory. Ensure the skills/ directory exists in the khufu package.',
  );
}

/**
 * Install khufu skills into the target IDE directory.
 */
export async function installSkills(options: InstallOptions): Promise<InstallResult> {
  const { tool, scope, cwd, force } = options;
  const result: InstallResult = { installed: [], skipped: [] };

  // Resolve target base directory
  const targetBase = resolveTargetDir(tool, scope, cwd);
  const skillsSource = getSkillsSourceDir();

  // Ensure target directory exists
  await fs.ensureDir(targetBase);

  for (const skillName of SKILL_NAMES) {
    const sourceDir = path.join(skillsSource, skillName);
    const sourceFile = path.join(sourceDir, 'SKILL.md');
    const targetDir = tool.skillSubdirPattern
      ? path.join(targetBase, skillName)
      : targetBase;
    const targetFile = path.join(targetDir, 'SKILL.md');

    // Check source exists
    if (!(await fs.pathExists(sourceFile))) {
      result.skipped.push({ name: skillName, reason: `Source not found: ${sourceFile}` });
      continue;
    }

    // Check if already installed
    if (!force && (await fs.pathExists(targetFile))) {
      result.skipped.push({
        name: skillName,
        reason: `Already installed at ${targetFile}. Use --force to overwrite.`,
      });
      continue;
    }

    // Install
    await fs.ensureDir(targetDir);
    await fs.copyFile(sourceFile, targetFile);
    result.installed.push({ name: skillName, targetPath: targetFile });
  }

  return result;
}

/**
 * Create a symlink from the global skills directory to the package skills.
 */
export async function installSkillsGlobal(tool: ToolDefinition, force: boolean): Promise<InstallResult> {
  const result: InstallResult = { installed: [], skipped: [] };

  const homeDir = os.homedir();
  const globalSkillsDir = tool.globalSkillsDir.replace(/^~/, homeDir);
  const skillsSource = getSkillsSourceDir();

  await fs.ensureDir(globalSkillsDir);

  for (const skillName of SKILL_NAMES) {
    const sourceDir = path.join(skillsSource, skillName);
    const targetLink = path.join(globalSkillsDir, skillName);

    if (!(await fs.pathExists(path.join(sourceDir, 'SKILL.md')))) {
      result.skipped.push({ name: skillName, reason: `Source not found in ${sourceDir}` });
      continue;
    }

    if (!force && (await fs.pathExists(targetLink))) {
      result.skipped.push({
        name: skillName,
        reason: `Already exists at ${targetLink}. Use --force to overwrite.`,
      });
      continue;
    }

    // Remove existing link if force
    if (force && (await fs.pathExists(targetLink))) {
      await fs.remove(targetLink);
    }

    try {
      await fs.ensureSymlink(sourceDir, targetLink, 'dir');
      result.installed.push({ name: skillName, targetPath: targetLink });
    } catch {
      // Fallback to copy if symlink fails
      await fs.copy(sourceDir, targetLink);
      result.installed.push({ name: skillName, targetPath: targetLink + ' (copied)' });
    }
  }

  return result;
}

/**
 * Resolve the target directory for skill installation based on scope.
 */
function resolveTargetDir(tool: ToolDefinition, scope: InstallScope, cwd: string): string {
  if (scope === 'global') {
    const homeDir = os.homedir();
    return tool.globalSkillsDir.replace(/^~/, homeDir);
  }
  // Project-level
  return path.join(cwd, tool.skillsDir);
}
