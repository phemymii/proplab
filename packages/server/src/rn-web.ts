import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';
import type { ProjectConfig } from '@proplab/core';

const require = createRequire(import.meta.url);

/**
 * Alias react-native → react-native-web when available (Expo / RN web preview).
 */
export function reactNativeWebPlugin(config: ProjectConfig): Plugin | null {
  if (!config.hasReactNative) return null;

  const rnWeb = tryResolve('react-native-web', config.root);
  if (!rnWeb) {
    console.warn(
      '[proplab] React Native project detected but react-native-web is not installed. ' +
        'Install it in the project (or use Expo which includes it) for web previews.',
    );
    return null;
  }

  const rn = tryResolve('react-native', config.root);

  return {
    name: 'proplab-react-native-web',
    enforce: 'pre',
    config() {
      return {
        resolve: {
          alias: [
            { find: 'react-native', replacement: rnWeb },
            // Common Expo/RN web shims
            { find: 'react-native-svg', replacement: tryResolve('react-native-svg', config.root) ?? 'react-native-svg' },
          ].filter((a) => a.replacement),
          extensions: [
            '.web.tsx',
            '.web.ts',
            '.web.jsx',
            '.web.js',
            '.tsx',
            '.ts',
            '.jsx',
            '.js',
            '.json',
          ],
        },
        define: {
          __DEV__: JSON.stringify(true),
          global: 'globalThis',
          'process.env.NODE_ENV': JSON.stringify('development'),
        },
        optimizeDeps: {
          include: ['react-native-web'],
          esbuildOptions: {
            resolveExtensions: [
              '.web.js',
              '.web.ts',
              '.web.tsx',
              '.js',
              '.jsx',
              '.ts',
              '.tsx',
            ],
            loader: { '.js': 'jsx' },
          },
        },
      };
    },
    resolveId(id) {
      // Prefer .web.* when requesting react-native subpaths already aliased
      if (id === 'react-native' && rnWeb) return rnWeb;
      if (rn && id.startsWith('react-native/')) {
        // Let react-native-web handle core; leave native-only subpaths
        return null;
      }
      return null;
    },
  };
}

function tryResolve(id: string, fromRoot: string): string | null {
  try {
    return require.resolve(id, { paths: [fromRoot, path.dirname(fileURLToPathSafe())] });
  } catch {
    try {
      const pkg = path.join(fromRoot, 'node_modules', id);
      if (fs.existsSync(pkg)) return require.resolve(id, { paths: [fromRoot] });
    } catch {
      // ignore
    }
    return null;
  }
}

function fileURLToPathSafe(): string {
  return path.dirname(new URL(import.meta.url).pathname);
}
