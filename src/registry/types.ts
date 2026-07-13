/**
 * Represents an AI IDE tool that khufu can install skills into.
 */
export interface ToolDefinition {
  /** Unique identifier, e.g. "claude", "cursor", "codex" */
  id: string;
  /** Display name shown in prompts */
  name: string;
  /** Directory where IDE configuration lives (relative to project root) */
  configDir: string;
  /** Directory where skills are placed (relative to project root or absolute for global) */
  skillsDir: string;
  /** Whether skills use subdirectories with SKILL.md files */
  skillSubdirPattern: boolean;
  /** Path to plugin manifest if this IDE supports plugin manifests */
  pluginManifestPath?: string;
  /** Global config directory (relative to user home) */
  globalConfigDir: string;
  /** Global skills directory (relative to user home) */
  globalSkillsDir: string;
}

/**
 * Manages the registry of supported AI IDE tools.
 */
export interface ToolRegistry {
  /** Get all registered tool definitions */
  list(): ToolDefinition[];
  /** Get a specific tool definition by ID */
  get(id: string): ToolDefinition | undefined;
  /** Register a new tool definition */
  register(tool: ToolDefinition): void;
}

/** Test pyramid levels supported by khufu */
export type PyramidLevel = 'ut' | 'it' | 'api' | 'e2e';

/** Installation scope */
export type InstallScope = 'project' | 'global';

/** Coverage tool configuration per pyramid level */
export interface CoverageConfig {
  /** Coverage tool name (e.g., "jacoco", "pytest-cov", "istanbul") */
  tool?: string;
  /** Minimum coverage thresholds (percentage, 0-100) */
  thresholds?: {
    line?: number;
    branch?: number;
    function?: number;
  };
  /** Output formats */
  formats?: string[];
  /** Files/globs to exclude from coverage */
  excludes?: string[];
}

/** Spec (SDD) configuration */
export interface SpecConfig {
  /** Whether the spec system is enabled */
  enabled?: boolean;
  /** Planning spec directory (feature-centric), default "specs/" */
  directory?: string;
  /** Spec file format */
  format?: 'markdown';
  /** Spec versioning strategy */
  versioning?: 'file-based';
  /** Auto-generate specs from tests in code-based mode */
  autoGenerateFromTests?: boolean;
  /** Execution record spec directory (date-centric), default "docs/khufu/" */
  docsDirectory?: string;
}

/** Khufu project configuration (khufu.yaml) */
export interface KhufuConfig {
  /** Selected IDE IDs, e.g. ["claude", "cursor"] */
  ide: string[];
  language?: string;
  frameworks: {
    ut?: string;
    it?: string;
    api?: string;
    e2e?: string;
  };
  directories: {
    ut?: string;
    it?: string;
    api?: string;
    e2e?: string;
  };
  coverage: {
    ut?: CoverageConfig;
    it?: CoverageConfig;
    api?: CoverageConfig;
    e2e?: CoverageConfig;
  };
  /** Spec-driven development configuration */
  spec?: SpecConfig;
  scope: InstallScope;
}

/** Records installed skills state for idempotency */
export interface InstalledSkillsState {
  installedAt: string;
  version: string;
  skills: Array<{
    name: string;
    version: string;
    path: string;
  }>;
}
