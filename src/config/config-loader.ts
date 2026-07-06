import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import type { KhufuConfig } from '../registry/types.js';

const KHUFU_DIR = '.khufu';
const CONFIG_FILE = 'khufu.yaml';

/**
 * Resolve the config file path inside .khufu/ directory.
 */
function resolveConfigPath(cwd: string): string {
  return path.join(cwd, KHUFU_DIR, CONFIG_FILE);
}

/**
 * Load khufu configuration from .khufu/khufu.yaml.
 * Returns null if no config file exists.
 */
export async function loadConfig(cwd: string): Promise<KhufuConfig | null> {
  const configPath = resolveConfigPath(cwd);
  if (!(await fs.pathExists(configPath))) {
    return null;
  }
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const raw = yaml.load(content) as any;
    // Backward compatibility: normalize `ide` from string to array
    if (typeof raw.ide === 'string') {
      raw.ide = [raw.ide];
    }
    if (!Array.isArray(raw.ide)) {
      raw.ide = ['claude'];
    }
    return raw as KhufuConfig;
  } catch {
    return null;
  }
}

/**
 * Save khufu configuration to .khufu/khufu.yaml.
 */
export async function saveConfig(cwd: string, config: KhufuConfig): Promise<void> {
  const configPath = resolveConfigPath(cwd);
  await fs.ensureDir(path.dirname(configPath));
  const content = yaml.dump(config, { indent: 2, lineWidth: 120 });
  await fs.writeFile(configPath, content, 'utf-8');
}
