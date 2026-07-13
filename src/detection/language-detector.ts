import fs from 'fs-extra';
import path from 'path';

/**
 * Map of config/build files to languages, ordered by detection priority.
 * First match wins (highest confidence).
 */
const CONFIG_FILE_MAP: Array<{ file: string; language: string }> = [
  { file: 'pom.xml', language: 'java' },
  { file: 'build.gradle.kts', language: 'java' },
  { file: 'build.gradle', language: 'java' },
  { file: 'settings.gradle.kts', language: 'java' },
  { file: 'settings.gradle', language: 'java' },
  { file: 'pyproject.toml', language: 'python' },
  { file: 'setup.py', language: 'python' },
  { file: 'setup.cfg', language: 'python' },
  { file: 'Pipfile', language: 'python' },
  { file: 'requirements.txt', language: 'python' },
  { file: 'go.mod', language: 'go' },
  { file: 'Cargo.toml', language: 'rust' },
  { file: 'Gemfile', language: 'ruby' },
  { file: 'mix.exs', language: 'elixir' },
  { file: 'CMakeLists.txt', language: 'c++' },
  { file: 'xmake.lua', language: 'c++' },
  { file: 'package.json', language: 'typescript' }, // Will be refined
];

/**
 * File extension heuristics as fallback when no config file is found.
 */
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.java': 'java',
  '.kt': 'java', // Kotlin on JVM — treat as Java ecosystem
  '.py': 'python',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.cs': 'c#',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.cpp': 'c++',
  '.cc': 'c++',
  '.cxx': 'c++',
  '.hpp': 'c++',
  '.hxx': 'c++',
  '.h': 'c++',
};

export interface DetectionResult {
  language: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect the primary programming language of a project.
 * Returns undefined if language cannot be determined.
 */
export async function detectLanguage(cwd: string): Promise<DetectionResult | undefined> {
  // Step 1: Scan for known config/build files
  for (const entry of CONFIG_FILE_MAP) {
    if (await fs.pathExists(path.join(cwd, entry.file))) {
      // Refine TypeScript vs JavaScript detection
      if (entry.language === 'typescript') {
        const refined = await refineTSvsJS(cwd);
        return { language: refined, confidence: 'high' };
      }
      return { language: entry.language, confidence: 'high' };
    }
  }

  // Step 2: Scan for .sln / .csproj files
  const slnFiles = await findFilesByExtension(cwd, '.sln');
  if (slnFiles.length > 0) {
    return { language: 'c#', confidence: 'high' };
  }
  const csprojFiles = await findFilesByExtension(cwd, '.csproj');
  if (csprojFiles.length > 0) {
    return { language: 'c#', confidence: 'high' };
  }

  // Step 3: Fall back to source file extension counting
  const counts = await countExtensions(cwd);
  if (Object.keys(counts).length > 0) {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topLanguage = sorted[0][0];
    return { language: topLanguage, confidence: 'medium' };
  }

  return undefined;
}

/**
 * Refine the TypeScript/JavaScript distinction by checking for tsconfig or .ts files.
 */
async function refineTSvsJS(cwd: string): Promise<string> {
  if (await fs.pathExists(path.join(cwd, 'tsconfig.json'))) {
    return 'typescript';
  }
  // Check if .ts/.tsx files exist
  const tsFiles = await findFilesByExtension(cwd, '.ts');
  const tsxFiles = await findFilesByExtension(cwd, '.tsx');
  if (tsFiles.length > 0 || tsxFiles.length > 0) {
    return 'typescript';
  }
  return 'javascript';
}

/**
 * List files in a directory (non-recursive) matching an extension.
 */
async function findFilesByExtension(cwd: string, ext: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(cwd);
    return entries.filter((e) => e.endsWith(ext) && !e.startsWith('.'));
  } catch {
    return [];
  }
}

/**
 * Count source files by language across the project (recursive, excluding common dirs).
 */
async function countExtensions(cwd: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const excludes = new Set([
    'node_modules', 'vendor', '.git', 'dist', 'build', 'target',
    '__pycache__', '.venv', 'venv', '.idea', '.vscode',
  ]);

  async function walk(dir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!excludes.has(entry.name) && !entry.name.startsWith('.')) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext && EXTENSION_LANGUAGE_MAP[ext]) {
          const lang = EXTENSION_LANGUAGE_MAP[ext];
          counts[lang] = (counts[lang] || 0) + 1;
        }
      }
    }
  }

  await walk(cwd);
  return counts;
}
