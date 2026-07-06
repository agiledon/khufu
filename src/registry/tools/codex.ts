import type { ToolDefinition } from '../types.js';

/**
 * Codex (OpenAI Codex CLI) tool definition.
 *
 * Codex auto-discovers skills from .codex/skills/ — no plugin manifest needed.
 * Skills are invoked via $skillname in prompts. Codex has no slash command mechanism.
 */
export const codexTool: ToolDefinition = {
  id: 'codex',
  name: 'Codex (OpenAI)',
  configDir: '.codex',
  skillsDir: '.codex/skills',
  skillSubdirPattern: true,
  globalConfigDir: '~/.codex',
  globalSkillsDir: '~/.codex/skills',
};
