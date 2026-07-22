import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';
import type { ProjectConfig } from '@proplab/core';

/**
 * Alias react-native → react-native-web and stub common Expo/native modules
 * so presentational components can preview in the browser iframe.
 */
export function reactNativeWebPlugin(config: ProjectConfig): Plugin | null {
  if (!config.hasReactNative) return null;

  const rnWeb = resolveFromProject('react-native-web', config.root);
  if (!rnWeb) {
    console.warn(
      '[proplab] Expo/React Native project detected, but react-native-web is not installed.\n' +
        '  Preview needs a web renderer. In the project, run:\n' +
        '    npx expo install react-native-web react-dom\n' +
        '  Catalog/prop editing still works; live preview will fail until then.',
    );
    return expoNativeStubPlugin(config, null);
  }

  console.info(
    `[proplab] Expo/RN web preview enabled via react-native-web` +
      (config.type.startsWith('expo') ? ` (${config.type})` : ''),
  );

  return {
    name: 'proplab-react-native-web',
    enforce: 'pre',
    config() {
      return {
        resolve: {
          alias: buildRnAliases(config.root, rnWeb),
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
          conditions: ['react-native-web', 'browser', 'module', 'import', 'default'],
        },
        define: {
          __DEV__: JSON.stringify(true),
          global: 'globalThis',
          'process.env.NODE_ENV': JSON.stringify('development'),
          'process.env.EXPO_OS': JSON.stringify('web'),
        },
        optimizeDeps: {
          include: ['react-native-web'],
          rolldownOptions: {
            resolve: {
              extensions: [
                '.web.js',
                '.web.ts',
                '.web.tsx',
                '.js',
                '.jsx',
                '.ts',
                '.tsx',
              ],
              mainFields: ['browser', 'module', 'main'],
            },
            moduleTypes: {
              '.js': 'jsx',
            },
          },
        },
      };
    },
    resolveId(id) {
      if (id === 'react-native') return rnWeb;

      const shim = EXPO_SHIMS[id] ?? EXPO_SHIMS[bareId(id)];
      if (shim) return `\0proplab-expo-shim:${bareId(id)}`;

      // Unresolvable expo- / react-native- packages → soft stub (native-only modules)
      if (shouldStubNativeModule(id, config.root)) {
        return `\0proplab-native-stub:${id}`;
      }
      return null;
    },
    load(id) {
      if (id.startsWith('\0proplab-expo-shim:')) {
        const name = id.slice('\0proplab-expo-shim:'.length);
        return EXPO_SHIMS[name] ?? emptyStub(name);
      }
      if (id.startsWith('\0proplab-native-stub:')) {
        const name = id.slice('\0proplab-native-stub:'.length);
        return emptyStub(name);
      }
      return null;
    },
  };
}

/** Fallback plugin when react-native-web is missing — still stub natives so scan UX is clearer. */
function expoNativeStubPlugin(config: ProjectConfig, _rnWeb: string | null): Plugin {
  return {
    name: 'proplab-expo-native-stubs',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'react-native' || EXPO_SHIMS[id] || EXPO_SHIMS[bareId(id)] || shouldStubNativeModule(id, config.root)) {
        return `\0proplab-native-stub:${bareId(id) || id}`;
      }
      return null;
    },
    load(id) {
      if (!id.startsWith('\0proplab-native-stub:')) return null;
      const name = id.slice('\0proplab-native-stub:'.length);
      if (EXPO_SHIMS[name]) return EXPO_SHIMS[name];
      return emptyStub(name);
    },
  };
}

function buildRnAliases(
  root: string,
  rnWeb: string,
): Array<{ find: string | RegExp; replacement: string }> {
  const aliases: Array<{ find: string | RegExp; replacement: string }> = [
    { find: 'react-native', replacement: rnWeb },
  ];

  const svg = resolveFromProject('react-native-svg', root);
  if (svg) aliases.push({ find: 'react-native-svg', replacement: svg });

  // Platform select helper used by many RN libs
  const platform = resolveFromProject('react-native-web/dist/exports/Platform', root);
  if (platform) {
    aliases.push({ find: 'react-native/Libraries/Utilities/Platform', replacement: platform });
  }

  return aliases;
}

function shouldStubNativeModule(id: string, root: string): boolean {
  if (id.startsWith('\0') || id.startsWith('/') || id.startsWith('.')) return false;
  const bare = bareId(id);
  if (!bare) return false;

  const isNativeFamily =
    bare === 'react-native' ||
    bare.startsWith('react-native-') ||
    bare === 'expo' ||
    bare.startsWith('expo-') ||
    bare.startsWith('@expo/') ||
    bare.startsWith('@react-native/') ||
    bare.startsWith('@react-navigation/');

  if (!isNativeFamily) return false;
  // If the package resolves, let Vite load the real thing
  return resolveFromProject(bare, root) === null;
}

function bareId(id: string): string {
  if (id.startsWith('@')) {
    const parts = id.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : id;
  }
  return id.split('/')[0] ?? id;
}

function emptyStub(name: string): string {
  return `
const handler = {
  get(_t, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return proxy;
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    return (..._args) => null;
  },
  apply() { return null; },
};
const proxy = new Proxy(function Stub() { return null; }, handler);
console.warn('[proplab] stubbed native module in web preview:', ${JSON.stringify(name)});
export default proxy;
export const __proplabStub = true;
`;
}

/** Explicit shims for packages we want to behave somewhat correctly on web. */
const EXPO_SHIMS: Record<string, string> = {
  'expo-constants': `
    const Constants = {
      appOwnership: 'expo',
      executionEnvironment: 'storeClient',
      experienceUrl: '',
      expoConfig: { name: 'PropLab Preview', slug: 'proplab', version: '1.0.0' },
      expoVersion: '0.0.0-proplab',
      platform: { web: {} },
      sessionId: 'proplab',
      statusBarHeight: 0,
      systemFonts: [],
      get manifest() { return this.expoConfig; },
      get manifest2() { return { extra: {} }; },
    };
    export default Constants;
    export { Constants };
  `,
  'expo-status-bar': `
    import React from 'react';
    export function StatusBar() { return null; }
    export function setStatusBarStyle() {}
    export function setStatusBarHidden() {}
    export function setStatusBarBackgroundColor() {}
    export function setStatusBarNetworkActivityIndicatorVisible() {}
    export function setStatusBarTranslucent() {}
    export default { StatusBar };
  `,
  'expo-splash-screen': `
    export async function preventAutoHideAsync() {}
    export async function hideAsync() {}
    export function setOptions() {}
    export default { preventAutoHideAsync, hideAsync, setOptions };
  `,
  'expo-font': `
    export async function loadAsync() { return true; }
    export function isLoaded() { return true; }
    export function isLoading() { return false; }
    export function processFontFamily(f) { return f; }
    export default { loadAsync, isLoaded, isLoading, processFontFamily };
  `,
  'expo-asset': `
    export class Asset {
      static fromModule() { return new Asset(); }
      static loadAsync() { return Promise.resolve([]); }
      async downloadAsync() { return this; }
      localUri = '';
      uri = '';
      name = '';
      width = 0;
      height = 0;
    }
    export default { Asset };
  `,
  'expo-linking': `
    export function createURL(path = '') { return 'proplab://' + String(path).replace(/^\\//, ''); }
    export async function getInitialURL() { return null; }
    export function parse(url) { return { path: url, queryParams: {} }; }
    export function addEventListener() { return { remove() {} }; }
    export async function openURL() { return true; }
    export async function canOpenURL() { return true; }
    export default { createURL, getInitialURL, parse, addEventListener, openURL, canOpenURL };
  `,
  'expo-system-ui': `
    export async function setBackgroundColorAsync() {}
    export async function getBackgroundColorAsync() { return '#ffffff'; }
    export default { setBackgroundColorAsync, getBackgroundColorAsync };
  `,
  'expo-router': `
    import React from 'react';
    const router = {
      push() {}, replace() {}, back() {}, canGoBack() { return false; },
      setParams() {}, navigate() {},
    };
    export function useRouter() { return router; }
    export function usePathname() { return '/'; }
    export function useLocalSearchParams() { return {}; }
    export function useGlobalSearchParams() { return {}; }
    export function useSegments() { return []; }
    export function useNavigationContainerRef() { return { current: null }; }
    export function Link({ href, children, ...rest }) {
      return React.createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children);
    }
    export function Redirect() { return null; }
    export function Stack(props) { return props.children ?? null; }
    export function Tabs(props) { return props.children ?? null; }
    export function Slot(props) { return props.children ?? null; }
    Stack.Screen = function Screen() { return null; };
    Tabs.Screen = function Screen() { return null; };
    export default { useRouter, Link, Stack, Tabs, Slot };
  `,
  'expo-image': `
    import React from 'react';
    export function Image({ source, style, ...rest }) {
      const src = typeof source === 'string' ? source : source?.uri;
      return React.createElement('img', { src, style, alt: '', ...rest });
    }
    export default Image;
  `,
  '@expo/vector-icons': `
    import React from 'react';
    function makeIcon(set) {
      return function Icon({ name, size = 24, color = '#111', style }) {
        return React.createElement('span', {
          style: { fontSize: size, color, lineHeight: 1, display: 'inline-flex', ...style },
          'aria-label': String(name || set),
        }, '●');
      };
    }
    export const Ionicons = makeIcon('Ionicons');
    export const MaterialIcons = makeIcon('MaterialIcons');
    export const FontAwesome = makeIcon('FontAwesome');
    export const Entypo = makeIcon('Entypo');
    export const Feather = makeIcon('Feather');
    export const AntDesign = makeIcon('AntDesign');
    export default { Ionicons, MaterialIcons, FontAwesome, Entypo, Feather, AntDesign };
  `,
};

function resolveFromProject(id: string, fromRoot: string): string | null {
  const candidates = [fromRoot];
  let dir = fromRoot;
  for (let i = 0; i < 6; i++) {
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
    candidates.push(dir);
  }

  for (const root of candidates) {
    const pkgJson = path.join(root, 'package.json');
    if (!fs.existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson).resolve(id);
    } catch {
      // continue
    }
  }

  return null;
}
