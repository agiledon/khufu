import chalk from 'chalk';
import type { ToolDefinition } from '../registry/types.js';

const PYRAMID_ART = `
                            /\\
                           /  \\
                          /    \\
                         /      \\
                        /        \\
                       /          \\
                      /            \\
                     /              \\
                    /                \\
                   /                  \\
                  /                    \\
                 /                      \\
                /                        \\
               /                          \\
              /                            \\
             /                              \\
            /                                \\
           /__________________________________\\
          |                                    |
          |     ${chalk.bold.yellow('🔺  K H U F U  🔺')}              |
          |     ${chalk.cyan('Test Pyramid Skill Framework')}      |
          |____________________________________|
`;

/**
 * Display the Khufu welcome page with ASCII art pyramid logo.
 */
export function showWelcome(): void {
  console.clear();
  console.log(chalk.bold.cyan(PYRAMID_ART));
  console.log();
  console.log(chalk.gray('  The Great Pyramid of Giza — built to last an eternity.'));
  console.log(chalk.gray('  Khufu helps you build your own test pyramid, equally enduring.'));
  console.log();
  console.log(chalk.white('  Generate tests following the test pyramid methodology:'));
  console.log(chalk.cyan('    /khufu-ut') + '   — Unit Tests (the foundation)');
  console.log(chalk.cyan('    /khufu-it') + '   — Integration Tests');
  console.log(chalk.cyan('    /khufu-api') + '  — API / Contract Tests');
  console.log(chalk.cyan('    /khufu-e2e') + '  — End-to-End Tests (the tip)');
  console.log();
}

/**
 * Display a compact welcome banner (used in init flow).
 */
export function showBanner(): void {
  console.log();
  console.log(chalk.bold.cyan('🔺 Khufu — Test Pyramid Skill Framework'));
  console.log(chalk.gray('   Generate tests following the test pyramid methodology'));
  console.log();
}

/**
 * Display available tools in a formatted list.
 */
export function showToolList(tools: ToolDefinition[]): void {
  console.log(chalk.bold('  Supported Agentic Coding Tools:'));
  console.log();
  for (const tool of tools) {
    const indicator = tool.id === 'claude' ? chalk.green(' ● ') : chalk.gray(' ○ ');
    console.log(`  ${indicator}${chalk.white(tool.name)}`);
  }
  console.log();
}
