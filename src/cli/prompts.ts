import inquirer from 'inquirer';
import type { ToolDefinition, InstallScope } from '../registry/types.js';

/**
 * Prompt the user to select one or more target IDEs (multi-select).
 * Use space to toggle, arrow keys to navigate, enter to confirm.
 */
export async function promptIDE(availableTools: ToolDefinition[]): Promise<ToolDefinition[]> {
  const { toolIds } = await inquirer.prompt<{ toolIds: string[] }>([
    {
      type: 'checkbox',
      name: 'toolIds',
      message: 'Select your Agentic Coding Tools (space to toggle, enter to confirm):',
      choices: availableTools.map((tool) => ({
        name: `${tool.name}${tool.id === 'claude' ? ' (recommended)' : ''}`,
        value: tool.id,
        checked: tool.id === 'claude',
      })),
      pageSize: 10,
      validate: (answer: string[]) => {
        if (answer.length === 0) {
          return 'You must select at least one tool.';
        }
        return true;
      },
    },
  ]);

  const selected = availableTools.filter((t) => toolIds.includes(t.id));
  return selected;
}

/**
 * Prompt the user to select installation scope.
 */
export async function promptScope(): Promise<InstallScope> {
  const { scope } = await inquirer.prompt<{ scope: InstallScope }>([
    {
      type: 'list',
      name: 'scope',
      message: 'Select installation scope:',
      choices: [
        {
          name: 'Project-level (this project only)',
          value: 'project',
        },
        {
          name: 'Global (available in all projects)',
          value: 'global',
        },
      ],
    },
  ]);
  return scope;
}

/**
 * Confirm whether to proceed with an action.
 */
export async function promptConfirm(message: string, defaultValue = true): Promise<boolean> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);
  return confirmed;
}

/**
 * Prompt for a language when auto-detection fails.
 */
export async function promptLanguage(): Promise<string> {
  const { language } = await inquirer.prompt<{ language: string }>([
    {
      type: 'list',
      name: 'language',
      message: 'Select project language:',
      choices: [
        { name: 'Java', value: 'java' },
        { name: 'Python', value: 'python' },
        { name: 'TypeScript', value: 'typescript' },
        { name: 'JavaScript', value: 'javascript' },
        { name: 'Go', value: 'go' },
        { name: 'C#', value: 'c#' },
        { name: 'Rust', value: 'rust' },
        { name: 'Ruby', value: 'ruby' },
      ],
    },
  ]);
  return language;
}

/**
 * Prompt for handling already-installed skills.
 */
export async function promptExistingInstall(): Promise<'overwrite' | 'skip' | 'update'> {
  const { action } = await inquirer.prompt<{ action: 'overwrite' | 'skip' | 'update' }>([
    {
      type: 'list',
      name: 'action',
      message: 'khufu skills are already installed. What would you like to do?',
      choices: [
        { name: 'Overwrite (reinstall all skills)', value: 'overwrite' },
        { name: 'Skip (keep existing installation)', value: 'skip' },
        { name: 'Update (install missing skills only)', value: 'update' },
      ],
    },
  ]);
  return action;
}

/**
 * Prompt for handling existing khufu configuration.
 */
export async function promptExistingConfig(configPath: string): Promise<'ignore' | 'overwrite'> {
  const { action } = await inquirer.prompt<{ action: 'ignore' | 'overwrite' }>([
    {
      type: 'list',
      name: 'action',
      message: `Configuration already exists at ${configPath}. What would you like to do?`,
      choices: [
        { name: 'Ignore (keep existing configuration)', value: 'ignore' },
        { name: 'Overwrite (replace with new configuration)', value: 'overwrite' },
      ],
    },
  ]);
  return action;
}
