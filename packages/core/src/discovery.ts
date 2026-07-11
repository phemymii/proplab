import fs from 'node:fs';
import path from 'node:path';
import type { ProjectConfig, ProjectType } from './types.js';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.expo',
  'android',
  'ios',
  'coverage',
  '.next',
  '__tests__',
  '__mocks__',
  '.venv',
  '.idea',
  '.turbo',
  '.cache',
  'vendor',
  'Pods',
  '.gradle',
  'DerivedData',
  'storybook-static',
  '.storybook',
]);

export { IGNORE_DIRS };

export function discoverProject(root: string): ProjectConfig {
  const resolved = path.resolve(root);
  const pkgPath = findPackageJson(resolved);
  const pkg = readJson(pkgPath);
  const name = (pkg?.name as string) ?? path.basename(resolved);
  const deps = {
    ...((pkg?.dependencies as Record<string, string>) ?? {}),
    ...((pkg?.devDependencies as Record<string, string>) ?? {}),
  };

  const hasReact = Boolean(deps.react);
  const hasReactNative = Boolean(deps['react-native'] || deps.expo);
  const type = detectProjectType(resolved, deps);
  const packageManager = detectPackageManager(resolved);
  const aliases = resolveAliases(resolved);

  return {
    root: resolved,
    name,
    type,
    packageManager,
    aliases,
    hasReact,
    hasReactNative,
  };
}

export function listSourceFiles(root: string): string[] {
  const results: string[] = [];
  walk(root, root, results);
  return results;
}

function walk(root: string, dir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    if (IGNORE_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(root, full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(tsx|jsx|ts|js)$/.test(entry.name)) continue;
    if (/\.(test|spec|stories|story)\.(tsx|jsx|ts|js)$/.test(entry.name)) continue;
    if (entry.name.endsWith('.d.ts')) continue;
    out.push(full);
  }
}

function findPackageJson(root: string): string {
  let current = root;
  while (current !== path.dirname(current)) {
    const candidate = path.join(current, 'package.json');
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }
  return path.join(root, 'package.json');
}

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function detectProjectType(root: string, deps: Record<string, string>): ProjectType {
  if (deps.next) return 'nextjs';
  if (deps['expo-router'] || (deps.expo && fs.existsSync(path.join(root, 'app')))) {
    return 'expo-router';
  }
  if (deps.expo) return 'expo';
  if (deps['react-native']) return 'react-native-cli';
  if (deps.vite && deps.react) return 'vite-react';
  if (deps.react) return 'react';
  return 'unknown';
}

function detectPackageManager(root: string): ProjectConfig['packageManager'] {
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(root, 'package-lock.json'))) return 'npm';
  return 'unknown';
}

function resolveAliases(root: string): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const name of ['tsconfig.json', 'jsconfig.json', 'tsconfig.app.json', 'tsconfig.base.json']) {
    mergeAliasesFromConfig(path.join(root, name), root, aliases, new Set());
  }
  return aliases;
}

function mergeAliasesFromConfig(
  cfgPath: string,
  projectRoot: string,
  aliases: Record<string, string>,
  seen: Set<string>,
): void {
  if (seen.has(cfgPath) || !fs.existsSync(cfgPath)) return;
  seen.add(cfgPath);

  const cfg = readJson(cfgPath);
  if (!cfg) return;

  // Follow extends (string or string[])
  const ext = cfg.extends;
  const configDir = path.dirname(cfgPath);
  const extendsList = Array.isArray(ext) ? ext : typeof ext === 'string' ? [ext] : [];
  for (const rel of extendsList) {
    // Skip bare package extends like "next/tsconfig"
    if (!rel.startsWith('.') && !path.isAbsolute(rel)) continue;
    const parent = path.resolve(configDir, rel);
    const withJson = parent.endsWith('.json') ? parent : `${parent}.json`;
    mergeAliasesFromConfig(withJson, projectRoot, aliases, seen);
  }

  const compilerOptions = cfg.compilerOptions as Record<string, unknown> | undefined;
  if (!compilerOptions) return;

  const paths = compilerOptions.paths as Record<string, string[]> | undefined;
  const baseUrl = (compilerOptions.baseUrl as string) ?? '.';
  // baseUrl is relative to the config file location
  const base = path.resolve(configDir, baseUrl);

  if (!paths) return;
  for (const [key, values] of Object.entries(paths)) {
    const target = values?.[0];
    if (!target) continue;
    const cleanKey = key.replace(/\/\*$/, '');
    const cleanTarget = target.replace(/\/\*$/, '');
    // Later configs (root tsconfig) override extended ones
    aliases[cleanKey] = path.resolve(base, cleanTarget);
  }
}

/**
 * Convert tsconfig-style aliases into Vite `resolve.alias` entries.
 * Uses a boundary after the alias so `@/` works without breaking `@scope/pkg`.
 * Keys are normalized so macOS path case differences still match.
 */
export function toViteAliases(
  aliases: Record<string, string>,
): Array<{ find: RegExp; replacement: string }> {
  return Object.entries(aliases).map(([key, absPath]) => ({
    find: new RegExp(`^${escapeRegExp(key)}(?=/|$)`),
    replacement: absPath,
  }));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
