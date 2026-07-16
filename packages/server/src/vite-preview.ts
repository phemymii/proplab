import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { InlineConfig, PluginOption, UserConfig } from 'vite';
import type { ProjectConfig } from '@proplab/core';
import { toViteAliases } from '@proplab/core';

const POSTCSS_NAMES = [
  'postcss.config.js',
  'postcss.config.mjs',
  'postcss.config.cjs',
  'postcss.config.ts',
];

const TAILWIND_NAMES = [
  'tailwind.config.cjs',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.ts',
];

const SKIP_OPTIMIZE = new Set([
  'typescript',
  'eslint',
  'prettier',
  '@types/node',
  '@types/react',
  '@types/react-dom',
  'sharp',
  'nodemailer',
  'next',
  '@netlify/plugin-nextjs',
  '@next/swc-wasm-nodejs',
  'webpack',
  'critters',
  'pnpapi',
  'jszip',
  '@supabase/supabase-js',
]);

/** Client libraries worth pre-bundling for faster preview. */
const PREFER_OPTIMIZE = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom/client',
  'lucide-react',
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
  'cmdk',
  'framer-motion',
  'zustand',
  'date-fns',
  'react-hook-form',
  '@hookform/resolvers',
  'zod',
  'sonner',
  'vaul',
  'embla-carousel-react',
  'react-day-picker',
  'react-resizable-panels',
  'recharts',
  'input-otp',
  'next-themes',
  'react-native-web',
];

export interface PreviewViteOptions {
  projectRoot: string;
  projectConfig: ProjectConfig;
  plugins: PluginOption[];
}

/** Build a Vite config that resolves deps and tooling from the target project. */
export function buildPreviewViteConfig(options: PreviewViteOptions): InlineConfig {
  const { projectRoot, projectConfig, plugins } = options;
  const resolvedRoot = path.resolve(projectRoot);
  const requireFromProject = createRequire(path.join(resolvedRoot, 'package.json'));
  const viteAliases = toViteAliases(projectConfig.aliases);
  const projectDeps = collectDependencyNames(resolvedRoot);

  const alias: Array<{ find: string | RegExp; replacement: string }> = [...viteAliases];

  // Stub node-only modules that break browser preview (stored in PropLab cache, not the project)
  const cacheDir = projectCacheDir(resolvedRoot);
  const stubDir = path.join(cacheDir, 'stubs');
  ensureNodeStubs(stubDir);

  for (const mod of ['sharp', 'nodemailer']) {
    alias.push({ find: mod, replacement: path.join(stubDir, `${mod}.js`) });
  }
  alias.push({ find: /^fs\/promises$/, replacement: path.join(stubDir, 'fs-promises.js') });
  alias.push({ find: /^fs$/, replacement: path.join(stubDir, 'fs.js') });

  const postcss = loadProjectPostcss(resolvedRoot, requireFromProject);
  const userConfig = tryLoadProjectViteConfig(resolvedRoot, requireFromProject);

  const optimizeInclude = [
    ...PREFER_OPTIMIZE.filter((d) => resolveProjectModule(resolvedRoot, d) !== null),
    ...projectDeps,
  ];

  const inline: InlineConfig = {
    root: resolvedRoot,
    configFile: false,
    appType: 'custom',
    cacheDir: path.join(cacheDir, 'vite'),
    server: {
      middlewareMode: true,
      fs: {
        strict: false,
        allow: [resolvedRoot, path.resolve(resolvedRoot, '..'), path.parse(resolvedRoot).root],
      },
    },
    plugins,
    css: postcss ? { postcss } : undefined,
    optimizeDeps: {
      include: [...new Set(optimizeInclude)],
      exclude: ['next', 'sharp', 'nodemailer', 'webpack', 'critters'],
      entries: [],
    },
    resolve: {
      alias,
      preserveSymlinks: true,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
    },
  };

  if (userConfig) {
    return mergePreviewConfig(inline, userConfig, resolvedRoot);
  }

  return inline;
}

function collectDependencyNames(projectRoot: string): string[] {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return [];

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    return [...new Set(names)].filter((name) => {
      if (SKIP_OPTIMIZE.has(name)) return false;
      if (name.startsWith('@types/')) return false;
      if (name.startsWith('eslint')) return false;
      if (name === 'next' || name.startsWith('next/')) return false;
      return PREFER_OPTIMIZE.includes(name) || name.startsWith('@radix-ui/');
    });
  } catch {
    return [];
  }
}

function resolveProjectModule(projectRoot: string, name: string): string | null {
  const requireFromProject = createRequire(path.join(projectRoot, 'package.json'));
  try {
    return requireFromProject.resolve(name);
  } catch {
    const candidate = path.join(projectRoot, 'node_modules', name);
    if (fs.existsSync(candidate)) return candidate;
    return null;
  }
}

function findConfigFile(root: string, names: string[]): string | null {
  for (const name of names) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadProjectPostcss(
  projectRoot: string,
  requireFromProject: NodeRequire,
): UserConfig['css'] extends { postcss?: infer P } ? P : never | undefined {
  const configPath = findConfigFile(projectRoot, POSTCSS_NAMES);
  const tailwindConfigPath = findConfigFile(projectRoot, TAILWIND_NAMES);
  const tailwindPlugin = resolvePostcssPlugin(projectRoot, requireFromProject, 'tailwindcss');
  const autoprefixerPlugin = resolvePostcssPlugin(projectRoot, requireFromProject, 'autoprefixer');

  // Always prefer an explicit plugin list with absolute Tailwind content paths.
  // PropLab's cwd is often the monorepo root — relative content globs then miss the project.
  if (tailwindPlugin && tailwindConfigPath) {
    try {
      const twConfig = loadTailwindConfig(projectRoot, tailwindConfigPath, requireFromProject);
      const plugins: unknown[] = [
        tailwindPlugin({
          config: twConfig,
        }),
      ];
      if (autoprefixerPlugin) plugins.push(autoprefixerPlugin());
      console.info('[proplab] Tailwind/PostCSS enabled for preview');
      return { plugins } as never;
    } catch (err) {
      console.warn(
        '[proplab] Could not configure Tailwind for preview:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  if (!configPath) return undefined;

  try {
    const raw = requireFromProject(configPath);
    const config = raw?.default ?? raw;

    // postcss.config.js plugins: { tailwindcss: {}, autoprefixer: {} }
    if (config?.plugins && !Array.isArray(config.plugins) && typeof config.plugins === 'object') {
      const resolvedPlugins: unknown[] = [];
      for (const [pluginName, pluginOpts] of Object.entries(config.plugins)) {
        const pluginModule = resolvePostcssPlugin(projectRoot, requireFromProject, pluginName);
        if (!pluginModule) continue;

        if (pluginName === 'tailwindcss' && tailwindConfigPath) {
          const twConfig = loadTailwindConfig(projectRoot, tailwindConfigPath, requireFromProject);
          resolvedPlugins.push(
            pluginModule({
              ...(pluginOpts as Record<string, unknown>),
              config: twConfig,
            }),
          );
        } else {
          resolvedPlugins.push(pluginModule((pluginOpts as Record<string, unknown>) ?? {}));
        }
      }
      return { plugins: resolvedPlugins } as never;
    }

    if (Array.isArray(config?.plugins)) {
      return { plugins: config.plugins } as never;
    }
  } catch (err) {
    console.warn(
      '[proplab] Could not load project PostCSS config:',
      err instanceof Error ? err.message : String(err),
    );
  }

  return undefined;
}

/**
 * Load Tailwind config and rewrite `content` globs to absolute paths under the
 * project root. Relative globs resolve against process.cwd() (often the PropLab
 * monorepo), which yields an empty utility CSS sheet.
 */
function loadTailwindConfig(
  projectRoot: string,
  configPath: string,
  requireFromProject: NodeRequire,
): Record<string, unknown> {
  let raw: Record<string, unknown> = {};
  try {
    if (configPath.endsWith('.ts') || configPath.endsWith('.mjs')) {
      // Prefer reading via jiti-less fallback: evaluate JS/CJS sibling or defaults
      try {
        const mod = requireFromProject(configPath);
        raw = (mod?.default ?? mod) as Record<string, unknown>;
      } catch {
        raw = {};
      }
    } else {
      const mod = requireFromProject(configPath);
      raw = (mod?.default ?? mod) as Record<string, unknown>;
    }
  } catch {
    raw = {};
  }

  const defaults = defaultTailwindContent(projectRoot);
  const content = Array.isArray(raw.content) ? (raw.content as unknown[]) : defaults;
  const absoluteContent = content
    .map((entry) => {
      if (typeof entry !== 'string') return entry;
      if (path.isAbsolute(entry)) return entry;
      return path.resolve(projectRoot, entry);
    })
    .filter(Boolean);

  return {
    ...raw,
    content: absoluteContent.length > 0 ? absoluteContent : defaults,
  };
}

function defaultTailwindContent(projectRoot: string): string[] {
  return [
    path.join(projectRoot, 'app/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(projectRoot, 'src/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(projectRoot, 'pages/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(projectRoot, 'components/**/*.{js,ts,jsx,tsx,mdx}'),
  ];
}

function resolvePostcssPlugin(
  projectRoot: string,
  requireFromProject: NodeJS.Require,
  name: string,
): ((opts?: Record<string, unknown>) => unknown) | null {
  try {
    return requireFromProject(name);
  } catch {
    const local = path.join(projectRoot, 'node_modules', name);
    try {
      return requireFromProject(local);
    } catch {
      return null;
    }
  }
}

function tryLoadProjectViteConfig(
  projectRoot: string,
  requireFromProject: NodeJS.Require,
): UserConfig | null {
  for (const name of ['vite.config.ts', 'vite.config.js', 'vite.config.mjs']) {
    const configPath = path.join(projectRoot, name);
    if (!fs.existsSync(configPath)) continue;
    try {
      const mod = requireFromProject(configPath);
      const cfg = mod?.default ?? mod;
      if (cfg && typeof cfg === 'object') return cfg as UserConfig;
    } catch {
      // Most Next projects don't have vite.config — ignore
    }
  }
  return null;
}

function mergePreviewConfig(
  inline: InlineConfig,
  user: UserConfig,
  projectRoot: string,
): InlineConfig {
  const merged: InlineConfig = { ...inline };

  if (user.resolve?.alias) {
    const userAliases = Array.isArray(user.resolve.alias)
      ? user.resolve.alias
      : Object.entries(user.resolve.alias).map(([find, replacement]) => ({
          find,
          replacement: String(replacement),
        }));
    merged.resolve = {
      ...merged.resolve,
      alias: [...(merged.resolve?.alias as never[] ?? []), ...userAliases],
    };
  }

  if (user.css && !merged.css) merged.css = user.css;

  // Never let project vite config override our middleware / root
  merged.root = projectRoot;
  merged.configFile = false;
  merged.appType = 'custom';

  return merged;
}

function projectCacheDir(projectRoot: string): string {
  const hash = crypto.createHash('sha1').update(path.resolve(projectRoot)).digest('hex').slice(0, 12);
  const dir = path.join(os.tmpdir(), 'proplab', hash);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureNodeStubs(stubDir: string): void {
  fs.mkdirSync(stubDir, { recursive: true });

  const stubs: Record<string, string> = {
    'sharp.js': 'export default {}; export const resize = () => Promise.resolve(Buffer.from(""));',
    'nodemailer.js': 'export default { createTransport: () => ({ sendMail: async () => ({}) }) };',
    'fs.js': 'export default {}; export const readFileSync = () => ""; export const existsSync = () => false; export const promises = { readFile: async () => "" };',
    'fs-promises.js': 'export const readFile = async () => ""; export const writeFile = async () => {}; export default { readFile, writeFile };',
    'path.js': 'export default {}; export const join = (...a) => a.join("/");',
    'crypto.js': 'export default {}; export const randomBytes = () => Buffer.from("");',
  };

  for (const [file, content] of Object.entries(stubs)) {
    const target = path.join(stubDir, file);
    if (!fs.existsSync(target)) fs.writeFileSync(target, content, 'utf8');
  }
}

/** Warn when the target project is missing installable dependencies. */
export function assertProjectDependencies(projectRoot: string): void {
  const nodeModules = path.join(projectRoot, 'node_modules');
  const pkgPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.warn(`[proplab] No package.json found in ${projectRoot}`);
    return;
  }

  if (!fs.existsSync(nodeModules)) {
    console.warn(
      `[proplab] node_modules not found in ${projectRoot}. Run npm install in the project first.`,
    );
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const required = ['react', ...Object.keys(pkg.dependencies ?? {}).filter((d) => d.startsWith('@radix-ui/'))];
  const missing = required.filter((d) => !resolveProjectModule(projectRoot, d));
  if (missing.length) {
    console.warn(`[proplab] Missing installed packages: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`);
  }
}
