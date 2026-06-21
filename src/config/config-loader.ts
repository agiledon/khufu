import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import type { KhufuConfig } from '../registry/types.js';

const CONFIG_FILE = 'khufu.yaml';

/**
 * Load khufu configuration from the project root.
 * Returns null if no config file exists.
 */
export async function loadConfig(cwd: string): Promise<KhufuConfig | null> {
  const configPath = path.join(cwd, CONFIG_FILE);
  if (!(await fs.pathExists(configPath))) {
    return null;
  }
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = yaml.load(content) as KhufuConfig;
    return config;
  } catch {
    return null;
  }
}

/**
 * Save khufu configuration to the project root.
 */
export async function saveConfig(cwd: string, config: KhufuConfig): Promise<void> {
  const configPath = path.join(cwd, CONFIG_FILE);
  const content = yaml.dump(config, { indent: 2, lineWidth: 120 });
  await fs.writeFile(configPath, content, 'utf-8');
}
