import type { Connect, Plugin } from 'vite';
import { isSecretPath } from '@proplab/core';

/**
 * Refuse to serve env files, keys, and credential dumps through Vite (/@fs, etc.).
 */
export function blockSecretsPlugin(): Plugin {
  return {
    name: 'proplab-block-secrets',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(secretGuardMiddleware);
    },
  };
}

const secretGuardMiddleware: Connect.NextHandleFunction = (req, res, next) => {
  const raw = req.url ?? '';
  const pathOnly = raw.split('?')[0] ?? '';
  let decoded = pathOnly;
  try {
    decoded = decodeURIComponent(pathOnly);
  } catch {
    // keep raw
  }

  const candidates = [decoded];
  if (decoded.startsWith('/@fs/')) {
    // /@fs/Users/.../project/.env  or  /@fs/C:/...
    candidates.push(decoded.slice('/@fs'.length));
    candidates.push(decoded.slice('/@fs/'.length));
  }

  if (candidates.some((p) => isSecretPath(p))) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Forbidden: PropLab will not serve secret or credential files.');
    return;
  }

  next();
};
