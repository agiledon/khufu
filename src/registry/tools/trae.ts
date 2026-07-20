import type { ToolDefinition } from '../types.js';

export const traeTool: ToolDefinition = {
  id: 'trae',
  name: 'Trae',
  configDir: '.trae',
  skillsDir: '.trae/skills',
  skillSubdirPattern: true,
  globalConfigDir: '~/.trae',
  globalSkillsDir: '~/.trae/skills',
};
