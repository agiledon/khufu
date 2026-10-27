import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { getLocalVersion } from '../version.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('khufu')
    .description('🔺 Test generation skill framework for AI IDEs')
    .version(getLocalVersion());

  program
    .command('init')
    .description('Initialize khufu in the current project — displays the welcome page')
    .option('--ide <ides>', 'Agentic Coding Tool(s), comma-separated (claude, cursor, opencode, codex, qoder, trae). Required when non-interactive')
    .option('--global', 'Install globally instead of project-level')
    .option('--scope <scope>', 'Installation scope (project, global)')
    .option('--force', 'Force overwrite existing installation')
    .option('-y, --yes', 'Skip remaining prompts and use defaults. Does not choose a tool; pass --ide')
    .action(async (options) => {
      try {
        await initCommand(options);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  program
    .command('update')
    .description('Check for a newer khufu-kit version on npm and update if available')
    .option('-y, --yes', 'Skip confirmation and update automatically if a newer version exists')
    .action(async (options) => {
      try {
        await updateCommand(options);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return program;
}

