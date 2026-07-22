import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import open from 'open';
import { isSecretPath } from '@proplab/core';

const execFileAsync = promisify(execFile);

export interface OpenEditorResult {
  ok: boolean;
  editor?: string;
  filePath?: string;
  error?: string;
}

/**
 * Open a catalog component file in the user's editor.
 * Security: only absolute paths already resolved inside projectRoot are accepted.
 */
export async function openProjectFile(options: {
  projectRoot: string;
  filePath: string;
  line?: number;
}): Promise<OpenEditorResult> {
  const root = path.resolve(options.projectRoot);
  const resolved = path.resolve(options.filePath);

  if (!isPathInsideRoot(resolved, root)) {
    return { ok: false, error: 'Path is outside the project root' };
  }

  if (isSecretPath(resolved)) {
    return { ok: false, error: 'Refusing to open secret or credential file' };
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return { ok: false, error: 'File not found' };
  }

  const line = options.line && options.line > 0 ? options.line : undefined;
  const target = line != null ? `${resolved}:${line}` : resolved;

  const candidates: Array<{ editor: string; cmd: string; args: string[] }> = [];

  const preferred = process.env.PROPLAB_EDITOR?.trim();
  if (preferred) {
    // Custom editor: pass file (and :line when set) as a single path arg
    candidates.push({ editor: preferred, cmd: preferred, args: [target] });
  }

  for (const cmd of ['cursor', 'code', 'code-insiders', 'codium']) {
    candidates.push({ editor: cmd, cmd, args: line != null ? ['-g', target] : [resolved] });
  }

  for (const { editor, cmd, args } of candidates) {
    try {
      await execFileAsync(cmd, args, {
        timeout: 8_000,
        windowsHide: true,
      });
      return { ok: true, editor, filePath: resolved };
    } catch {
      // try next candidate
    }
  }

  try {
    await open(resolved);
    return { ok: true, editor: 'system', filePath: resolved };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not open editor',
      filePath: resolved,
    };
  }
}

function isPathInsideRoot(filePath: string, root: string): boolean {
  const rel = path.relative(root, filePath);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}
