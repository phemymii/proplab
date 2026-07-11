import type { Plugin } from 'vite';

/**
 * Browser-safe shims for Next.js modules that cannot run in a Vite iframe.
 */
export function nextShimsPlugin(): Plugin {
  const prefix = '\0proplab-next:';

  const shims: Record<string, string> = {
    'next': `
      export default {};
      export const version = '0.0.0-proplab';
    `,
    'next/link': `
      import React from 'react';
      export default function Link({ href, children, className, style, replace, scroll, prefetch, ...rest }) {
        const url = typeof href === 'string' ? href : (href?.pathname ?? '#');
        return React.createElement('a', { href: url, className, style, ...rest }, children);
      }
    `,
    'next/image': `
      import React from 'react';
      export default function Image({ src, alt, width, height, fill, style, className, priority, ...rest }) {
        const resolved = typeof src === 'object' && src && 'src' in src ? src.src : src;
        const imgStyle = fill
          ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }
          : style;
        return React.createElement('img', {
          src: resolved,
          alt: alt ?? '',
          width: fill ? undefined : width,
          height: fill ? undefined : height,
          className,
          style: imgStyle,
          ...rest,
        });
      }
    `,
    'next/navigation': `
      const noop = () => {};
      const router = { push: noop, replace: noop, back: noop, forward: noop, refresh: noop, prefetch: noop };
      export function useRouter() { return router; }
      export function usePathname() { return '/'; }
      export function useSearchParams() { return new URLSearchParams(); }
      export function useParams() { return {}; }
      export function redirect() {}
      export function notFound() {}
      export function useSelectedLayoutSegment() { return null; }
      export function useSelectedLayoutSegments() { return []; }
    `,
    'next/headers': `
      export function headers() { return new Headers(); }
      export function cookies() { return { get: () => undefined, getAll: () => [], has: () => false }; }
      export function draftMode() { return { isEnabled: false }; }
    `,
    'next/font/google': `
      const makeFont = () => ({ className: '', style: {}, variable: '' });
      export const Inter = makeFont;
      export const Roboto = makeFont;
      export const Geist = makeFont;
      export const Geist_Mono = makeFont;
      export const Poppins = makeFont;
      export const Montserrat = makeFont;
      export const Open_Sans = makeFont;
      export const Lato = makeFont;
      export default new Proxy({}, { get: () => makeFont });
    `,
    'next/font/local': `
      export default function localFont() { return { className: '', style: {}, variable: '' }; }
    `,
    'next/dynamic': `
      import React from 'react';
      export default function dynamic(loader) {
        const Lazy = React.lazy(loader);
        return function DynamicComponent(props) {
          return React.createElement(React.Suspense, { fallback: null }, React.createElement(Lazy, props));
        };
      }
    `,
    'next/head': `
      import React from 'react';
      export default function Head({ children }) { return React.createElement(React.Fragment, null, children); }
    `,
    'next/script': `
      import React from 'react';
      export default function Script(props) { return React.createElement('script', props); }
    `,
    'next-themes': `
      import React, { createContext, useContext, useState } from 'react';
      const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });
      export function ThemeProvider({ children, defaultTheme = 'light', attribute = 'class' }) {
        const [theme, setTheme] = useState(defaultTheme);
        React.useEffect(() => {
          if (attribute === 'class') {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(theme);
          }
        }, [theme, attribute]);
        return React.createElement(ThemeContext.Provider, { value: { theme, setTheme } }, children);
      }
      export function useTheme() { return useContext(ThemeContext); }
    `,
  };

  return {
    name: 'proplab-next-shims',
    enforce: 'pre',
    resolveId(id) {
      const bare = id.split('?')[0];
      if (shims[bare]) return prefix + bare;
      if (bare.startsWith('next/font/google')) return prefix + 'next/font/google';
      if (bare.startsWith('next/font/local')) return prefix + 'next/font/local';
      // Any other next import → empty stub (never bundle real next internals)
      if (bare === 'next' || bare.startsWith('next/')) return prefix + 'next';
      return null;
    },
    load(id) {
      if (!id.startsWith(prefix)) return null;
      const key = id.slice(prefix.length);
      return shims[key] ?? null;
    },
  };
}

/**
 * Replace 'use server' modules with browser stubs so client components can import them.
 */
export function serverActionStubPlugin(): Plugin {
  return {
    name: 'proplab-server-action-stub',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('node_modules') || id.includes('\0')) return null;
      const head = code.slice(0, 400);
      if (!/['"]use server['"]/.test(head)) return null;

      // Export async stubs for every exported binding we can see
      const exportNames = new Set<string>();
      const namedFn = /export\s+async\s+function\s+(\w+)/g;
      const namedConst = /export\s+(?:async\s+)?function\s+(\w+)/g;
      const namedVar = /export\s+const\s+(\w+)\s*=/g;
      const namedList = /export\s*\{([^}]+)\}/g;
      let m: RegExpExecArray | null;
      while ((m = namedFn.exec(code))) exportNames.add(m[1]);
      while ((m = namedConst.exec(code))) exportNames.add(m[1]);
      while ((m = namedVar.exec(code))) exportNames.add(m[1]);
      while ((m = namedList.exec(code))) {
        for (const part of m[1].split(',')) {
          const name = part.trim().split(/\s+as\s+/).pop()?.trim();
          if (name) exportNames.add(name);
        }
      }

      if (exportNames.size === 0) {
        return {
          code: `
            export async function __proplabStub() {
              console.warn('[PropLab] stubbed server action module', ${JSON.stringify(id)});
              return { success: true, message: 'Stubbed by PropLab (server action)' };
            }
            export default __proplabStub;
          `,
          map: null,
        };
      }

      const lines = [...exportNames].map(
        (name) => `
export async function ${name}(...args) {
  console.warn('[PropLab] stubbed server action', ${JSON.stringify(name)}, args);
  return { success: true, message: 'Stubbed by PropLab (server action)' };
}`,
      );

      return {
        code: lines.join('\n') + '\n',
        map: null,
      };
    },
  };
}
