import fs from 'fs-extra';
import path from 'path';
import type { InstallScope, KhufuConfig, InstalledSkillsState } from '../registry/types.js';
import { getDefaultConfig } from '../config/default-config.js';
import { saveConfig } from '../config/config-loader.js';

const KHUFU_DIR = '.khufu';
const INSTALLED_SKILLS_FILE = 'installed-skills.json';

export interface ScaffoldResult {
  config: KhufuConfig;
  khufuDir: string;
}

/**
 * Create the khufu project structure.
 * - Creates .khufu/ directory for internal state
 * - Creates khufu.yaml with project configuration
 */
export async function scaffoldProject(
  cwd: string,
  ide: string,
  scope: InstallScope,
  language?: string,
  force: boolean = false,
): Promise<ScaffoldResult> {
  const khufuDir = path.join(cwd, KHUFU_DIR);
  const configPath = path.join(cwd, 'khufu.yaml');

  // Check for existing configuration
  if (!force) {
    if (await fs.pathExists(configPath)) {
      throw new Error(
        `khufu.yaml already exists at ${configPath}. Use --force to overwrite.`,
      );
    }
  }

  // Create .khufu/ directory
  await fs.ensureDir(khufuDir);

  // Create khufu.yaml
  const config = getDefaultConfig(ide, language);
  config.scope = scope;
  await saveConfig(cwd, config);

  // Write installed skills state
  const state: InstalledSkillsState = {
    installedAt: new Date().toISOString(),
    version: '0.1.0',
    skills: [],
  };
  await fs.writeJson(path.join(khufuDir, INSTALLED_SKILLS_FILE), state, { spaces: 2 });

  return { config, khufuDir };
}

/**
 * Update the installed skills state after installation.
 */
export async function updateInstalledState(
  khufuDir: string,
  skills: Array<{ name: string; version: string; path: string }>,
): Promise<void> {
  const statePath = path.join(khufuDir, INSTALLED_SKILLS_FILE);
  const state: InstalledSkillsState = {
    installedAt: new Date().toISOString(),
    version: '0.1.0',
    skills,
  };
  await fs.writeJson(statePath, state, { spaces: 2 });
}

/**
 * Read the installed skills state.
 */
export async function readInstalledState(khufuDir: string): Promise<InstalledSkillsState | null> {
  const statePath = path.join(khufuDir, INSTALLED_SKILLS_FILE);
  if (!(await fs.pathExists(statePath))) {
    return null;
  }
  try {
    return await fs.readJson(statePath);
  } catch {
    return null;
  }
}
