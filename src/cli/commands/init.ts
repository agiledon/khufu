import chalk from 'chalk';
import { DefaultToolRegistry } from '../../registry/tool-registry.js';
import { scaffoldProject, updateInstalledState, readInstalledState } from '../../scaffold/project-scaffolder.js';
import { installSkills, installSkillsGlobal } from '../../scaffold/installer.js';
import { detectLanguage } from '../../detection/language-detector.js';
import { promptIDE, promptScope, promptConfirm, promptLanguage, promptExistingInstall } from '../prompts.js';
import type { InstallScope } from '../../registry/types.js';

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

  console.log();
  console.log(chalk.bold.cyan('🔺 Khufu - Test Pyramid Skill Framework'));
  console.log(chalk.gray('   Generate tests following the test pyramid methodology'));
  console.log();

  // Step 1: Select IDE
  let tool = options.ide ? registry.get(options.ide) : undefined;

  if (!tool) {
    if (options.ide) {
      console.log(chalk.yellow(`⚠ IDE "${options.ide}" not found in registry.`));
    }
    const availableTools = registry.list();
    if (availableTools.length === 0) {
      console.log(chalk.red('✗ No supported IDEs found in registry.'));
      return;
    }
    if (availableTools.length === 1) {
      tool = availableTools[0];
      console.log(chalk.green(`✓ Auto-selected IDE: ${tool.name}`));
    } else if (autoMode) {
      // In non-interactive mode, pick the first available tool
      tool = availableTools[0];
      console.log(chalk.green(`✓ Auto-selected IDE: ${tool.name}`));
    } else {
      tool = await promptIDE(availableTools);
    }
  }

  console.log(chalk.green(`✓ Target IDE: ${tool.name}`));

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
  const force = options.force || false;
  try {
    // Step 4a: Scaffold project
    console.log();
    console.log(chalk.bold('Creating project structure...'));
    const { khufuDir } = await scaffoldProject(cwd, tool.id, scope, language, force);

    // Step 4b: Check for existing installation
    const existingState = await readInstalledState(khufuDir);
    if (existingState && existingState.skills.length > 0 && !force) {
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

    // Step 5: Install skills
    console.log();
    console.log(chalk.bold('Installing skills...'));

    let installResult;
    if (scope === 'global') {
      installResult = await installSkillsGlobal(tool, force);
    } else {
      installResult = await installSkills({ tool, scope, cwd, force });
    }

    // Report results
    for (const skill of installResult.installed) {
      console.log(chalk.green(`  ✓ Installed ${skill.name} -> ${skill.targetPath}`));
    }
    for (const skill of installResult.skipped) {
      console.log(chalk.yellow(`  ⚠ ${skill.name}: ${skill.reason}`));
    }

    // Update state
    await updateInstalledState(
      khufuDir,
      installResult.installed.map((s) => ({
        name: s.name,
        version: '0.1.0',
        path: s.targetPath,
      })),
    );

    // Step 6: Summary
    console.log();
    console.log(chalk.bold.green('✓ Installation complete!'));
    console.log();
    console.log('  Available skills:');
    console.log(chalk.cyan('    /khufu-ut') + '   - Generate unit tests');
    console.log(chalk.cyan('    /khufu-it') + '   - Generate integration tests');
    console.log(chalk.cyan('    /khufu-api') + '  - Generate API tests');
    console.log(chalk.cyan('    /khufu-e2e') + '  - Generate end-to-end tests');
    console.log();
    console.log(chalk.gray('  Configuration saved to khufu.yaml'));
    console.log(chalk.gray('  Edit khufu.yaml to customize frameworks and directories.'));
    console.log();
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      console.log(chalk.red(`✗ ${err.message}`));
    } else {
      throw err;
    }
  }
}
