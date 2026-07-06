import type { ToolDefinition } from './types.js';
import type { ToolRegistry as IToolRegistry } from './types.js';
import { claudeTool } from './tools/claude.js';
import { cursorTool } from './tools/cursor.js';
import { opencodeTool } from './tools/opencode.js';
import { codexTool } from './tools/codex.js';

export class DefaultToolRegistry implements IToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    // Register built-in tools
    this.register(claudeTool);
    this.register(cursorTool);
    this.register(opencodeTool);
    this.register(codexTool);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with id "${tool.id}" is already registered`);
    }
    this.tools.set(tool.id, tool);
  }
}
