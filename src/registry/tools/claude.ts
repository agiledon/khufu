import type { ToolDefinition } from '../types.js';

export const claudeTool: ToolDefinition = {
  id: 'claude',
  name: 'Claude Code',
  configDir: '.claude',
  skillsDir: '.claude/skills',
  skillSubdirPattern: true,
  pluginManifestPath: '.claude-plugin/plugin.json',
  globalConfigDir: '~/.claude',
  globalSkillsDir: '~/.claude/skills',
};
