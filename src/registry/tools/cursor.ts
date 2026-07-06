import type { ToolDefinition } from '../types.js';

export const cursorTool: ToolDefinition = {
  id: 'cursor',
  name: 'Cursor',
  configDir: '.cursor',
  skillsDir: '.cursor/commands',
  skillSubdirPattern: true,
  globalConfigDir: '~/.cursor',
  globalSkillsDir: '~/.cursor/commands',
};
