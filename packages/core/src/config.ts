import fs from 'node:fs';
import path from 'node:path';

/** Filenames checked (in order) for project-level PropLab config. */
export const PROPLAB_CONFIG_NAMES = [
  '.proplabrc.tsx',
  '.proplabrc.ts',
  '.proplabrc.jsx',
  '.proplabrc.js',
  'proplab.config.tsx',
  'proplab.config.ts',
  'proplab.config.jsx',
  'proplab.config.js',
] as const;

export interface PropLabConfigFile {
  /** Absolute path */
  path: string;
  /** Path relative to project root */
  relativePath: string;
}

/**
 * Locate `.proplabrc` / `proplab.config.*` at the project root.
 * Runtime shape (loaded in the preview iframe via Vite):
 *
 * ```ts
 * export default {
 *   decorators: [
 *     (Story) => <AppProviders><Story /></AppProviders>,
 *   ],
 * };
 * ```
 */
export function findPropLabConfig(root: string): PropLabConfigFile | null {
  const resolved = path.resolve(root);
  for (const name of PROPLAB_CONFIG_NAMES) {
    const abs = path.join(resolved, name);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return { path: abs, relativePath: name };
    }
  }
  return null;
}
