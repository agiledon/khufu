import type { ToolDefinition } from '../types.js';

export const qoderTool: ToolDefinition = {
  id: 'qoder',
  name: 'Qoder',
  configDir: '.qoder',
  skillsDir: '.qoder/skills',
  skillSubdirPattern: true,
  globalConfigDir: '~/.qoder',
  globalSkillsDir: '~/.qoder/skills',
};
