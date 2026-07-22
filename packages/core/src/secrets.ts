import path from 'node:path';

/**
 * Basenames that must never be scanned, served, or opened by PropLab.
 * Covers env files, keys, and common credential dumps.
 */
const SECRET_BASENAME_RE =
  /^(?:\.env(?:\..+)?|\.envrc|\.npmrc|\.netrc|\.pgpass|\.htpasswd|\.dockercfg|\.dockerconfigjson|id_rsa(?:\.pub)?|id_dsa(?:\.pub)?|id_ecdsa(?:\.pub)?|id_ed25519(?:\.pub)?|.+\.(?:pem|key|p12|pfx|jks|keystore)|(?:google-)?service-account.+\.json|.+credentials.*\.json|credentials\.json|secrets?\.(?:json|ya?ml|toml|env)|auth\.json|token\.json|\.secrets)$/i;

/** Directory segments that typically hold secrets (not generic app folders). */
const SECRET_DIR_RE =
  /(^|\/)(?:\.ssh|\.aws|\.gnupg|\.kube|\.azure|\.gcloud|\.config\/gcloud)(\/|$)/i;

/**
 * True when a path looks like a secret (env file, private key, credentials, etc.).
 * Accepts absolute or project-relative paths.
 */
export function isSecretPath(filePath: string): boolean {
  if (!filePath) return false;
  const norm = filePath.replace(/\\/g, '/');
  const base = path.posix.basename(norm);

  if (base.startsWith('.env')) return true;
  if (SECRET_BASENAME_RE.test(base)) return true;
  if (SECRET_DIR_RE.test(norm)) return true;

  return false;
}

/** Filter absolute paths, dropping anything that looks secret. */
export function rejectSecretPaths(paths: string[]): string[] {
  return paths.filter((p) => !isSecretPath(p));
}
