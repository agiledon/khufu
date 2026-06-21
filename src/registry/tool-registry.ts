import type { ToolDefinition } from './types.js';
import type { ToolRegistry as IToolRegistry } from './types.js';
import { claudeTool } from './tools/claude.js';

export class DefaultToolRegistry implements IToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    // Register built-in tools
    this.register(claudeTool);
    // Future: register(cursorTool), register(codexTool), etc.
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
