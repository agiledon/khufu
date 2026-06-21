import { Command } from 'commander';
import { initCommand } from './commands/init.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('khufu')
    .description('🔺 Test generation skill framework for AI IDEs')
    .version('0.1.0');

  program
    .command('init')
    .description('Initialize khufu in the current project')
    .option('--ide <ide>', 'Target IDE (claude)')
    .option('--global', 'Install globally instead of project-level')
    .option('--scope <scope>', 'Installation scope (project, global)')
    .option('--force', 'Force overwrite existing installation')
    .option('-y, --yes', 'Skip all prompts and use defaults')
    .action(async (options) => {
      try {
        await initCommand(options);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return program;
}
