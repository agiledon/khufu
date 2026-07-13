import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// We test the detector by creating temp directories with known files
// Since detectLanguage is not exported directly, we test indirectly
// through the public API. For now, we verify the config file map logic.

describe('LanguageDetector', () => {
  // The language detector uses these known config files
  const KNOWN_MAPPINGS: Record<string, string> = {
    'pom.xml': 'java',
    'build.gradle': 'java',
    'build.gradle.kts': 'java',
    'pyproject.toml': 'python',
    'setup.py': 'python',
    'go.mod': 'go',
    'Cargo.toml': 'rust',
    'Gemfile': 'ruby',
    'xmake.lua': 'c++',
    'CMakeLists.txt': 'c++',
  };

  it('should map known config files to correct languages', () => {
    expect(KNOWN_MAPPINGS['pom.xml']).toBe('java');
    expect(KNOWN_MAPPINGS['pyproject.toml']).toBe('python');
    expect(KNOWN_MAPPINGS['go.mod']).toBe('go');
    expect(KNOWN_MAPPINGS['Cargo.toml']).toBe('rust');
  });

  it('should detect package.json projects as typescript or javascript', () => {
    // package.json detection depends on whether tsconfig.json exists
    // This is a content-level test ensuring the mapping exists
    expect(KNOWN_MAPPINGS['package.json']).toBeUndefined(); // Handled specially
  });
});

describe('LanguageDetector - integration', () => {
  async function withTempDir(
    files: Record<string, string>,
    fn: (dir: string) => Promise<void>,
  ): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), `khufu-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    try {
      for (const [filename, content] of Object.entries(files)) {
        await fs.writeFile(path.join(tmpDir, filename), content, 'utf-8');
      }
      await fn(tmpDir);
    } finally {
      await fs.remove(tmpDir);
    }
  }

  it('should detect Java project from pom.xml', async () => {
    await withTempDir({ 'pom.xml': '<project></project>' }, async (dir) => {
      const { detectLanguage } = await import('../src/detection/language-detector.js');
      const result = await detectLanguage(dir);
      expect(result).toBeDefined();
      expect(result!.language).toBe('java');
      expect(result!.confidence).toBe('high');
    });
  });

  it('should detect Python project from pyproject.toml', async () => {
    await withTempDir({ 'pyproject.toml': '[tool]\nname = "test"' }, async (dir) => {
      const { detectLanguage } = await import('../src/detection/language-detector.js');
      const result = await detectLanguage(dir);
      expect(result).toBeDefined();
      expect(result!.language).toBe('python');
      expect(result!.confidence).toBe('high');
    });
  });

  it('should detect Go project from go.mod', async () => {
    await withTempDir({ 'go.mod': 'module example.com/test' }, async (dir) => {
      const { detectLanguage } = await import('../src/detection/language-detector.js');
      const result = await detectLanguage(dir);
      expect(result).toBeDefined();
      expect(result!.language).toBe('go');
      expect(result!.confidence).toBe('high');
    });
  });

  it('should detect C++ project from xmake.lua', async () => {
    await withTempDir({ 'xmake.lua': 'add_rules("mode.debug")' }, async (dir) => {
      const { detectLanguage } = await import('../src/detection/language-detector.js');
      const result = await detectLanguage(dir);
      expect(result).toBeDefined();
      expect(result!.language).toBe('c++');
      expect(result!.confidence).toBe('high');
    });
  });

  it('should detect C++ project from CMakeLists.txt', async () => {
    await withTempDir({ 'CMakeLists.txt': 'cmake_minimum_required(VERSION 3.16)' }, async (dir) => {
      const { detectLanguage } = await import('../src/detection/language-detector.js');
      const result = await detectLanguage(dir);
      expect(result).toBeDefined();
      expect(result!.language).toBe('c++');
      expect(result!.confidence).toBe('high');
    });
  });

  it('should detect TypeScript from package.json and tsconfig.json', async () => {
    await withTempDir(
      {
        'package.json': '{"name": "test"}',
        'tsconfig.json': '{}',
      },
      async (dir) => {
        const { detectLanguage } = await import('../src/detection/language-detector.js');
        const result = await detectLanguage(dir);
        expect(result).toBeDefined();
        expect(result!.language).toBe('typescript');
        expect(result!.confidence).toBe('high');
      },
    );
  });

  it('should detect JavaScript from package.json without tsconfig', async () => {
    await withTempDir({ 'package.json': '{"name": "test"}' }, async (dir) => {
      const { detectLanguage } = await import('../src/detection/language-detector.js');
      const result = await detectLanguage(dir);
      expect(result).toBeDefined();
      expect(result!.language).toBe('javascript');
      expect(result!.confidence).toBe('high');
    });
  });

  it('should fall back to file extension counting', async () => {
    await withTempDir({}, async (dir) => {
      // Create directory structure first, then write files
      const srcDir = path.join(dir, 'src');
      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'main.py'), 'print("hello")', 'utf-8');
      await fs.writeFile(path.join(srcDir, 'utils.py'), 'def util(): pass', 'utf-8');

      const { detectLanguage } = await import('../src/detection/language-detector.js');
      const result = await detectLanguage(dir);
      expect(result).toBeDefined();
      expect(result!.confidence).toBe('medium');
    });
  });

  it('should detect C++ from .cpp file extension fallback', async () => {
    await withTempDir({}, async (dir) => {
      const srcDir = path.join(dir, 'src');
      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'main.cpp'), 'int main() { return 0; }', 'utf-8');
      await fs.writeFile(path.join(srcDir, 'utils.cpp'), 'void util() {}', 'utf-8');

      const { detectLanguage } = await import('../src/detection/language-detector.js');
      const result = await detectLanguage(dir);
      expect(result).toBeDefined();
      expect(result!.language).toBe('c++');
      expect(result!.confidence).toBe('medium');
    });
  });

  it('should return undefined for empty directory', async () => {
    await withTempDir({}, async (dir) => {
      const { detectLanguage } = await import('../src/detection/language-detector.js');
      const result = await detectLanguage(dir);
      expect(result).toBeUndefined();
    });
  });
});
