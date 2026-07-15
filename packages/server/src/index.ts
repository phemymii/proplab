import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import middie from '@fastify/middie';
import chokidar, { type FSWatcher } from 'chokidar';
import open from 'open';
import { createServer as createViteServer, type ViteDevServer, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import {
  scanProject,
  getComponentById,
  searchComponents,
  discoverProject,
  discoverPreviewStyles,
  findPropLabConfig,
  PROPLAB_CONFIG_NAMES,
  normalizeComponentId,
  type LabCatalog,
} from '@proplab/core';
import { previewHtml, proplabPreviewPlugin } from './preview-plugin.js';
import { nextShimsPlugin, serverActionStubPlugin } from './next-shims.js';
import { reactNativeWebPlugin } from './rn-web.js';
import { assertProjectDependencies, buildPreviewViteConfig } from './vite-preview.js';
import { openProjectFile } from './open-editor.js';

export interface ServerOptions {
  projectRoot: string;
  port?: number;
  openBrowser?: boolean;
  watch?: boolean;
  webDistPath?: string;
  /** Limit scan to these project-relative paths */
  include?: string[];
  onProgress?: (progress: { message: string; phase?: string }) => void;
}

export interface ServerInstance {
  url: string;
  port: number;
  close: () => Promise<void>;
  rescan: () => Promise<LabCatalog>;
}

const DEFAULT_PORT = 4591;

export async function startServer(options: ServerOptions): Promise<ServerInstance> {
  const {
    projectRoot,
    port = DEFAULT_PORT,
    openBrowser = true,
    watch = true,
    webDistPath,
    include,
    onProgress,
  } = options;

  const app = Fastify({ logger: false });
  let catalog: LabCatalog | null = null;
  const wsClients = new Set<{ send: (data: string) => void }>();

  await app.register(cors, { origin: true });
  await app.register(websocket);
  await app.register(middie);

  async function doScan(): Promise<LabCatalog> {
    catalog = await scanProject({ root: projectRoot, include }, (progress) => {
      onProgress?.(progress);
    });
    return catalog;
  }

  const projectConfig = discoverProject(projectRoot);
  assertProjectDependencies(projectRoot);
  const styleUrls = discoverPreviewStyles(projectRoot, projectConfig.type);
  let propLabConfig = findPropLabConfig(projectRoot);

  const plugins: PluginOption[] = [
    react(),
    proplabPreviewPlugin(
      (id) => (catalog ? getComponentById(catalog, id) : undefined),
      () => findPropLabConfig(projectRoot)?.path ?? null,
    ),
  ];

  if (projectConfig.type === 'nextjs') {
    plugins.unshift(nextShimsPlugin(), serverActionStubPlugin());
  }

  const rnPlugin = reactNativeWebPlugin(projectConfig);
  if (rnPlugin) plugins.unshift(rnPlugin);

  const vite: ViteDevServer = await createViteServer(
    buildPreviewViteConfig({
      projectRoot,
      projectConfig,
      plugins,
    }),
  );

  // Preview + Vite assets before static UI
  app.get('/__proplab_preview__', async (req, reply) => {
    if (!catalog) await doScan();
    const id = (req.query as { id?: string }).id ?? '';
    const html = previewHtml(normalizeComponentId(id), styleUrls, {
      reactNative: projectConfig.hasReactNative,
    });
    const transformed = await vite.transformIndexHtml('/__proplab_preview__', html);
    return reply.type('text/html').send(transformed);
  });

  app.use((req, res, next) => {
    const url = req.url ?? '';
    if (
      url.startsWith('/api/') ||
      url.startsWith('/ws') ||
      url === '/' ||
      url.startsWith('/assets/') ||
      url === '/favicon.svg' ||
      url === '/index.html'
    ) {
      next();
      return;
    }
    vite.middlewares(req, res, next);
  });

  const webPath =
    webDistPath ??
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'web');

  if (webDistPath || pathExists(webPath)) {
    await app.register(fastifyStatic, {
      root: webPath,
      prefix: '/',
      wildcard: false,
    });
  }

  app.get('/api/health', async () => ({
    status: 'ok',
    project: projectRoot,
    name: catalog?.config.name,
    type: catalog?.config.type ?? projectConfig.type,
    aliases: projectConfig.aliases,
    styles: styleUrls,
    proplabConfig: propLabConfig?.relativePath ?? catalog?.config.proplabConfig ?? null,
  }));

  app.get('/api/catalog', async () => {
    if (!catalog) await doScan();
    return catalog;
  });

  app.get('/api/components', async (req) => {
    if (!catalog) await doScan();
    const q = (req.query as { q?: string }).q ?? '';
    if (q) return searchComponents(catalog!, q);
    return catalog!.components;
  });

  app.get('/api/components/*', async (req, reply) => {
    if (!catalog) await doScan();
    const wildcard = (req.params as Record<string, string>)['*'] ?? '';
    const component = getComponentById(catalog!, normalizeComponentId(wildcard));
    if (!component) {
      return reply.status(404).send({ error: 'Component not found' });
    }
    return component;
  });

  app.get('/api/search', async (req) => {
    if (!catalog) await doScan();
    const q = (req.query as { q?: string }).q ?? '';
    return searchComponents(catalog!, q);
  });

  app.post('/api/rescan', async () => {
    const result = await doScan();
    broadcast({ type: 'catalog-update', data: result });
    return { ok: true, stats: result.stats };
  });

  /**
   * Open a catalog component in the local editor.
   * Accepts `{ id }` only — never raw client paths — so we can't escape the project tree.
   */
  app.post('/api/open', async (req, reply) => {
    if (!catalog) await doScan();
    const body = (req.body ?? {}) as { id?: string };
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return reply.status(400).send({ ok: false, error: 'Missing component id' });
    }

    const component = getComponentById(catalog!, id);
    if (!component) {
      return reply.status(404).send({ ok: false, error: 'Component not found' });
    }

    const result = await openProjectFile({
      projectRoot,
      filePath: component.filePath,
      line: component.line,
    });

    if (!result.ok) {
      return reply.status(400).send(result);
    }
    return result;
  });

  app.get('/ws', { websocket: true }, (socket) => {
    wsClients.add(socket);
    if (catalog) {
      socket.send(JSON.stringify({ type: 'catalog-update', data: catalog }));
    }
    socket.on('close', () => wsClients.delete(socket));
  });

  function broadcast(message: unknown): void {
    const data = JSON.stringify(message);
    for (const client of wsClients) {
      try {
        client.send(data);
      } catch {
        wsClients.delete(client);
      }
    }
  }

  let watcher: FSWatcher | null = null;
  if (watch) {
    const watchRoots = ['src', 'app', 'components', 'packages', 'lib']
      .map((dir) => path.join(projectRoot, dir))
      .filter((dir) => fs.existsSync(dir));
    const targets = watchRoots.length > 0 ? watchRoots : [projectRoot];
    for (const name of PROPLAB_CONFIG_NAMES) {
      targets.push(path.join(projectRoot, name));
    }

    watcher = chokidar.watch(targets, {
      ignored: (p) =>
        /(node_modules|\.git|dist|build|\.expo|android|ios|\.next|coverage|\.cache)/.test(p) ||
        (fs.existsSync(p) &&
          fs.statSync(p).isFile() &&
          !/\.(tsx?|jsx?|css|scss|sass|less)$/.test(p) &&
          !/(^|[\\/])(\.proplabrc|proplab\.config)\.(tsx?|jsx?)$/.test(p)),
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 },
      depth: 12,
    });

    watcher.on('error', (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[proplab] watcher error:', message);
    });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleChange = (changedPath?: string) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const isConfigChange =
          typeof changedPath === 'string' &&
          /(^|[\\/])(\.proplabrc|proplab\.config)\.(tsx?|jsx?)$/.test(changedPath);

        propLabConfig = findPropLabConfig(projectRoot);

        if (isConfigChange) {
          // Force preview iframe remount so decorators reload
          try {
            await vite.moduleGraph.invalidateAll();
          } catch {
            // ignore
          }
          broadcast({ type: 'config-update', data: { proplabConfig: propLabConfig?.relativePath ?? null } });
        }

        broadcast({ type: 'scanning' });
        const result = await doScan();
        broadcast({ type: 'catalog-update', data: result });
      }, 500);
    };

    watcher.on('change', (p) => handleChange(p));
    watcher.on('add', (p) => handleChange(p));
    watcher.on('unlink', (p) => handleChange(p));
  }

  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/ws') || req.url.startsWith('/__proplab')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    if (pathExists(path.join(webPath, 'index.html'))) {
      return reply.sendFile('index.html');
    }
    return reply.status(404).send({ error: 'Web UI not built. Run npm run build.' });
  });

  await app.listen({ port, host: '127.0.0.1' });
  const url = `http://localhost:${port}`;

  // Scan after the server is up so the CLI / UI aren't blocked on large repos
  onProgress?.({ phase: 'discover', message: 'Scanning components…' });
  broadcast({ type: 'scanning' });
  const firstCatalog = await doScan();
  broadcast({ type: 'catalog-update', data: firstCatalog });

  if (openBrowser) {
    await open(url);
  }

  return {
    url,
    port,
    close: async () => {
      if (watcher) await watcher.close();
      await vite.close();
      await app.close();
    },
    rescan: () => doScan(),
  };
}

function pathExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}
