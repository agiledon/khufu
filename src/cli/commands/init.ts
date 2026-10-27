import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { DefaultToolRegistry } from '../../registry/tool-registry.js';
import { scaffoldProject, updateInstalledState, readInstalledState } from '../../scaffold/project-scaffolder.js';
import { installSkills, installSkillsGlobal } from '../../scaffold/installer.js';
import { detectLanguage } from '../../detection/language-detector.js';
import { promptIDE, promptScope, promptConfirm, promptLanguage, promptExistingInstall, promptExistingConfig } from '../prompts.js';
import { showWelcome } from '../welcome.js';
import type { InstallScope, ToolDefinition } from '../../registry/types.js';

interface InitOptions {
  ide?: string;
  global?: boolean;
  scope?: string;
  force?: boolean;
  yes?: boolean;
}

/**
 * Check if the terminal is interactive (TTY).
 */
function isInteractive(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const registry = new DefaultToolRegistry();
  const interactive = isInteractive();
  const autoMode = !interactive || options.yes || options.force;

  // Show welcome page with ASCII pyramid
  showWelcome();

  // Step 1: Select Agentic Coding Tools from welcome page
  let tools: ToolDefinition[] = [];

  if (options.ide) {
    // Support comma-separated IDE list, e.g. --ide claude,cursor
    const ideIds = options.ide.split(',').map(id => id.trim());
    tools = ideIds.map(id => registry.get(id)).filter(Boolean) as ToolDefinition[];
    if (tools.length === 0) {
      console.log(chalk.yellow(`⚠ No matching IDE found for "${options.ide}".`));
      console.log(chalk.gray('   Available: ' + registry.list().map(t => t.id).join(', ')));
    }
    if (tools.length < ideIds.length) {
      const found = new Set(tools.map(t => t.id));
      const missing = ideIds.filter(id => !found.has(id));
      console.log(chalk.yellow(`⚠ IDE not found: ${missing.join(', ')}`));
    }
  }

  if (tools.length === 0) {
    const availableTools = registry.list();
    if (availableTools.length === 0) {
      console.log(chalk.red('✗ No supported IDEs found in registry.'));
      return;
    }
    if (availableTools.length === 1) {
      tools = [availableTools[0]];
      console.log(chalk.green(`✓ Auto-selected IDE: ${tools[0].name}`));
    } else if (autoMode) {
      // In non-interactive mode, pick Claude Code
      tools = [availableTools[0]];
      console.log(chalk.green(`✓ Auto-selected IDE: ${tools[0].name}`));
    } else {
      // Show multi-select tool selection on welcome page
      console.log(chalk.bold('  Select your Agentic Coding Tools:'));
      console.log(chalk.gray('  (Space to toggle, arrows to navigate, Enter to confirm)'));
      console.log();
      tools = await promptIDE(availableTools);
    }
  }

  const toolNames = tools.map(t => t.name).join(', ');
  console.log(chalk.green(`✓ Target IDE(s): ${toolNames}`));
  const ideList = tools.map(t => t.id);

  // Step 2: Select installation scope
  let scope: InstallScope;
  if (options.global) {
    scope = 'global';
  } else if (options.scope === 'global' || options.scope === 'project') {
    scope = options.scope;
  } else if (autoMode) {
    // Default to project-level in non-interactive mode
    scope = 'project';
  } else {
    scope = await promptScope();
  }
  console.log(chalk.green(`✓ Installation scope: ${scope === 'project' ? 'Project-level' : 'Global'}`));

  // Step 3: Detect language
  let language: string | undefined;
  const detected = await detectLanguage(cwd);
  if (detected) {
    const confidenceLabel = detected.confidence === 'high' ? '' : chalk.gray(' (best guess)');
    console.log(chalk.blue(`ℹ Detected language: ${chalk.bold(detected.language)}${confidenceLabel}`));

    if (autoMode) {
      // Use detected language automatically in non-interactive mode
      language = detected.language;
    } else {
      const confirmed = await promptConfirm(
        `Use detected language "${detected.language}"?`,
        true,
      );
      if (confirmed) {
        language = detected.language;
      }
    }
  }

  if (!language) {
    if (autoMode) {
      console.log(chalk.yellow('⚠ No language detected and non-interactive mode. Defaulting to "java".'));
      console.log(chalk.gray('   Use --yes or run in interactive mode to specify a language.'));
      language = 'java';
    } else {
      language = await promptLanguage();
    }
  }
  console.log(chalk.green(`✓ Language: ${language}`));

  // Step 4: Scaffold and install
  let shouldOverwrite = options.force || false;
  const configPath = path.join(cwd, '.khufu', 'khufu.yaml');

  // Step 4a: Check for existing configuration
  if (!shouldOverwrite && (await fs.pathExists(configPath))) {
    if (autoMode) {
      console.log(chalk.yellow(`⚠ Configuration already exists at ${configPath}.`));
      console.log(chalk.gray('   Use --force to overwrite or run in interactive mode to choose.'));
      return;
    }
    console.log();
    console.log(chalk.yellow(`⚠ Configuration already exists at ${configPath}`));
    const configAction = await promptExistingConfig(configPath);
    if (configAction === 'ignore') {
      console.log(chalk.yellow('⚠ Installation skipped. Keeping existing configuration.'));
      return;
    }
    console.log(chalk.blue('ℹ Will overwrite existing configuration...'));
    shouldOverwrite = true;
  }

  try {
    // Step 4b: Scaffold project
    console.log();
    console.log(chalk.bold('Creating project structure...'));
    const { khufuDir } = await scaffoldProject(cwd, ideList, scope, language, shouldOverwrite);

    // Step 4c: Check for existing installation
    const existingState = await readInstalledState(khufuDir);
    if (existingState && existingState.skills.length > 0 && !shouldOverwrite) {
      if (autoMode) {
        console.log(chalk.yellow('⚠ Skills already installed. Use --force to overwrite. Skipping.'));
        return;
      }
      const action = await promptExistingInstall();
      if (action === 'skip') {
        console.log(chalk.yellow('⚠ Installation skipped. Skills are already installed.'));
        return;
      }
    }

    // Step 5: Install skills for each selected IDE
    console.log();
    console.log(chalk.bold('Installing skills...'));

    const allInstalled: Array<{ name: string; targetPath: string }> = [];

    for (const tool of tools) {
      console.log();
      console.log(chalk.cyan(`  For ${tool.name}:`));

      let installResult;
      if (scope === 'global') {
        installResult = await installSkillsGlobal(tool, shouldOverwrite);
      } else {
        installResult = await installSkills({ tool, scope, cwd, force: shouldOverwrite });
      }

      // Report per-tool results
      for (const skill of installResult.installed) {
        console.log(chalk.green(`    ✓ Installed ${skill.name} -> ${skill.targetPath}`));
        allInstalled.push(skill);
      }
      for (const skill of installResult.skipped) {
        console.log(chalk.yellow(`    ⚠ ${skill.name}: ${skill.reason}`));
      }
    }

    // Update state
    await updateInstalledState(
      khufuDir,
      allInstalled.map((s) => ({
        name: s.name,
        version: '0.1.0',
        path: s.targetPath,
      })),
    );

    // Step 6: Summary
    console.log();
    console.log(chalk.bold.green('✓ Installation complete!'));
    console.log();
    console.log(chalk.white(`  Configured for: ${chalk.bold(toolNames)}`));
    console.log();
    console.log('  Available skills:');
    console.log(chalk.cyan('    /khufu-ut') + '   - Generate unit tests');
    console.log(chalk.cyan('    /khufu-it') + '   - Generate integration tests');
    console.log(chalk.cyan('    /khufu-api') + '  - Generate API tests');
    console.log(chalk.cyan('    /khufu-e2e') + '  - Generate end-to-end tests');
    console.log(chalk.cyan('    /khufu-harness') + ' - Establish project constraint assets (Harness Engineering)');
    console.log(chalk.cyan('    /khufu-to-prd') + ' - Grill a requirement into MVP PRDs (Cockburn use cases)');
    console.log(chalk.cyan('    /khufu-to-test-cases') + ' - Turn a PRD into docs/test-cases');
    console.log();
    console.log(chalk.gray('  Configuration saved to .khufu/khufu.yaml'));
    console.log(chalk.gray('  Edit .khufu/khufu.yaml to customize frameworks and directories.'));
    console.log();
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      console.log(chalk.red(`✗ ${err.message}`));
    } else {
      throw err;
    }
  }
}
