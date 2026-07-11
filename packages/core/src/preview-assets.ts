import fs from 'node:fs';
import path from 'node:path';
import type { ProjectType } from './types.js';

const ROUTE_FILE_RE =
  /(^|\/)(page|layout|loading|error|not-found|template|default|route|middleware)\.(tsx?|jsx?|js)$/;

const FRAMEWORK_ONLY_RE =
  /(^|\/)(next\.config\.|tailwind\.config\.|postcss\.config\.|metro\.config\.|babel\.config\.|app\.config\.)/;

/** Skip Next/Expo route entry files from the component catalog by default. */
export function shouldSkipCatalogFile(relativePath: string, projectType: ProjectType): boolean {
  const norm = relativePath.replace(/\\/g, '/');

  if (FRAMEWORK_ONLY_RE.test(norm)) return true;

  if (
    projectType === 'nextjs' ||
    projectType === 'expo-router' ||
    projectType === 'expo' ||
    projectType === 'unknown'
  ) {
    // App Router / Expo Router conventions
    if (/(^|\/)app\//.test(norm) && ROUTE_FILE_RE.test(norm)) return true;
    // Next pages router
    if (/(^|\/)pages\//.test(norm) && !/(^|\/)_app\.(tsx?|jsx?)$/.test(norm)) {
      // Keep _components under pages, skip page files
      if (!norm.includes('/components/') && !norm.includes('/_components/')) {
        if (/\.(tsx|jsx|js|ts)$/.test(norm) && !norm.includes('.module.')) {
          // pages/api
          if (norm.includes('/api/')) return true;
          // typical page files at pages/*
          const base = path.posix.basename(norm);
          if (!base.startsWith('_') || base === '_app.tsx' || base === '_app.jsx' || base === '_document.tsx') {
            if (base === '_app.tsx' || base === '_app.jsx' || base === '_document.tsx' || base === '_document.jsx') {
              return true;
            }
            // Heuristic: files directly under pages (or nested) that aren't in a components folder
            if (!/\/(components|ui|hooks)\//.test(norm)) return true;
          }
        }
      }
    }
  }

  // Server-only modules
  if (/(^|\/)actions\.(tsx?|ts|js)$/.test(norm)) return true;
  if (norm.includes('/actions/') && /\.(tsx?|ts|js)$/.test(norm)) return true;

  return false;
}

/** Discover CSS files to inject into the preview iframe. */
export function discoverPreviewStyles(root: string, projectType: ProjectType): string[] {
  const candidates = [
    'app/globals.css',
    'src/app/globals.css',
    'styles/globals.css',
    'src/styles/globals.css',
    'app/global.css',
    'src/index.css',
    'src/App.css',
    'styles/index.css',
  ];

  const found: string[] = [];
  for (const rel of candidates) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) found.push(toFsUrl(abs));
  }

  // Pull CSS imports from root layout when present
  for (const layout of ['app/layout.tsx', 'app/layout.jsx', 'src/app/layout.tsx', 'src/app/layout.jsx']) {
    const abs = path.join(root, layout);
    if (!fs.existsSync(abs)) continue;
    try {
      const src = fs.readFileSync(abs, 'utf8');
      const re = /import\s+['"]([^'"]+\.css)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const spec = m[1];
        const resolved = spec.startsWith('@/')
          ? path.join(root, spec.slice(2))
          : path.resolve(path.dirname(abs), spec);
        if (fs.existsSync(resolved)) {
          const url = toFsUrl(resolved);
          if (!found.includes(url)) found.push(url);
        }
      }
    } catch {
      // ignore
    }
  }

  // RN/Expo: no CSS by default
  if (projectType === 'expo' || projectType === 'expo-router' || projectType === 'react-native-cli') {
    return found.filter((u) => !u.endsWith('.css') || true);
  }

  return found;
}

function toFsUrl(absPath: string): string {
  const normalized = absPath.split(path.sep).join('/');
  return `/@fs${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}
