import chalk from 'chalk';
import { spawnSync } from 'node:child_process';
import { get } from 'node:https';
import { promptConfirm } from '../prompts.js';
import { PACKAGE_NAME, compareVersions, getLocalVersion } from '../../version.js';

export interface UpdateOptions {
  yes?: boolean;
}

export type UpdateDecision = 'update' | 'current';

/**
 * Decide whether an update is needed by comparing local vs latest versions.
 */
export function decideUpdate(local: string, latest: string): UpdateDecision {
  return compareVersions(latest, local) > 0 ? 'update' : 'current';
}

/**
 * Fetch the latest published version of a package from the npm registry.
 * Resolves to null when the registry is unreachable or the response is invalid.
 */
export function fetchLatestVersion(packageName: string = PACKAGE_NAME): Promise<string | null> {
  return new Promise((resolve) => {
    const req = get(
      `https://registry.npmjs.org/${packageName}/latest`,
      { timeout: 10000 },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body) as { version?: string };
            resolve(data.version ?? null);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
  });
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Compare the local khufu-kit version against the latest npm version, and update when newer.
 */
export async function updateCommand(options: UpdateOptions = {}): Promise<void> {
  const local = getLocalVersion();
  console.log(chalk.blue(`ℹ Local version:        ${chalk.bold(local)}`));

  const latest = await fetchLatestVersion();
  if (latest === null) {
    console.log(
      chalk.yellow('⚠ Could not reach the npm registry. Please check your network and try again.'),
    );
    return;
  }
  console.log(chalk.blue(`ℹ Latest npm version:    ${chalk.bold(latest)}`));

  if (decideUpdate(local, latest) === 'current') {
    console.log(chalk.green(`✓ Already up to date (${local}). No update needed.`));
    return;
  }

  console.log(chalk.yellow(`A newer version is available: ${latest} (current: ${local}).`));

  const autoMode = options.yes || !isInteractive();
  let shouldUpdate = true;
  if (!autoMode) {
    shouldUpdate = await promptConfirm(`Update ${PACKAGE_NAME} from ${local} to ${latest}?`);
  }
  if (!shouldUpdate) {
    console.log(chalk.gray('Update skipped.'));
    return;
  }

  console.log(chalk.bold(`Updating ${PACKAGE_NAME} to ${latest}...`));
  const result = spawnSync('npm', ['install', '-g', `${PACKAGE_NAME}@${latest}`], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.log(chalk.red(`✗ Update failed (exit code ${result.status ?? 'unknown'}).`));
    process.exitCode = 1;
    return;
  }
  console.log(chalk.green(`✓ ${PACKAGE_NAME} updated to ${latest}.`));
}
