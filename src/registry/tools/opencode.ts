import type { ToolDefinition } from '../types.js';

export const opencodeTool: ToolDefinition = {
  id: 'opencode',
  name: 'OpenCode',
  configDir: '.opencode',
  skillsDir: '.opencode/commands',
  skillSubdirPattern: true,
  globalConfigDir: '~/.opencode',
  globalSkillsDir: '~/.opencode/commands',
};
