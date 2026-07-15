import fs from 'node:fs';
import path from 'node:path';
import { Project, Node, type SourceFile } from 'ts-morph';
import { discoverProject, listSourceFiles } from './discovery.js';
import { extractPropSchema } from './props.js';
import { generateFixtures, generateVariants } from './fixtures.js';
import { shouldSkipCatalogFile } from './preview-assets.js';
import type {
  ComponentInfo,
  LabCatalog,
  ProgressCallback,
  ScanOptions,
} from './types.js';

const MAX_FILE_BYTES = 400_000;

export async function scanProject(
  options: ScanOptions,
  onProgress?: ProgressCallback,
): Promise<LabCatalog> {
  const started = Date.now();
  onProgress?.({ phase: 'discover', message: 'Discovering project…' });

  const config = discoverProject(options.root);
  const discovered = listSourceFiles(config.root, options.include).filter((f) => {
    const rel = toPosixPath(path.relative(config.root, f));
    if (options.exclude?.some((p) => rel.includes(p))) return false;
    if (shouldSkipCatalogFile(rel, config.type)) return false;
    return true;
  });

  onProgress?.({
    phase: 'discover',
    message: `Filtering ${discovered.length} files…`,
    current: 0,
    total: discovered.length,
  });

  const files: string[] = [];
  for (let i = 0; i < discovered.length; i++) {
    if (mightContainComponents(discovered[i])) files.push(discovered[i]);
    if (i > 0 && i % 200 === 0) {
      onProgress?.({
        phase: 'discover',
        message: `Filtering ${i}/${discovered.length}…`,
        current: i,
        total: discovered.length,
      });
      await yieldEventLoop();
    }
  }

  onProgress?.({
    phase: 'parse',
    message: `Parsing ${files.length} candidate files…`,
    current: 0,
    total: files.length,
  });

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      allowJs: true,
      jsx: 4,
      target: 99,
      module: 99,
      esModuleInterop: true,
      strict: false,
      skipLibCheck: true,
    },
  });

  const components: ComponentInfo[] = [];
  let parsed = 0;

  for (const filePath of files) {
    parsed += 1;
    if (parsed % 10 === 0 || parsed === files.length) {
      onProgress?.({
        phase: 'parse',
        message: `Parsing ${parsed}/${files.length}…`,
        current: parsed,
        total: files.length,
      });
      await yieldEventLoop();
    }

    let sourceFile: SourceFile;
    try {
      sourceFile = project.addSourceFileAtPath(filePath);
    } catch {
      continue;
    }

    const found = extractComponentsFromFile(sourceFile, filePath, config.root, project);
    components.push(...found);
  }

  onProgress?.({
    phase: 'fixtures',
    message: `Generating fixtures for ${components.length} components…`,
  });

  for (const comp of components) {
    comp.fixtures = generateFixtures(comp.props, comp.name);
    comp.variants = generateVariants(comp.props, comp.fixtures);
  }

  components.sort((a, b) => a.name.localeCompare(b.name) || a.relativePath.localeCompare(b.relativePath));

  onProgress?.({ phase: 'done', message: 'Scan complete' });

  return {
    config,
    components,
    stats: {
      totalFiles: files.length,
      totalComponents: components.length,
      withProps: components.filter((c) => c.props.fields.length > 0).length,
      scanDurationMs: Date.now() - started,
    },
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Cheap text heuristics so we don't feed every util/API .ts file into ts-morph.
 * `.tsx` / `.jsx` always pass (likely UI).
 */
export function mightContainComponents(filePath: string): boolean {
  if (/\.(tsx|jsx)$/.test(filePath)) {
    try {
      const stat = fs.statSync(filePath);
      return stat.size > 0 && stat.size <= MAX_FILE_BYTES;
    } catch {
      return false;
    }
  }

  let text: string;
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0 || stat.size > MAX_FILE_BYTES) return false;
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return false;
  }

  if (!/\bexport\b/.test(text)) return false;

  // Strong React / JSX / RN signals
  if (
    /from\s+['"]react(?:-dom)?(?:\/[^'"]*)?['"]/.test(text) ||
    /from\s+['"]react-native(?:-web)?(?:\/[^'"]*)?['"]/.test(text) ||
    /require\(\s*['"]react(?:-dom|native)?['"]\s*\)/.test(text) ||
    /<[A-Z][A-Za-z0-9.]*[\s/>]/.test(text) ||
    /React\.(?:FC|FunctionComponent|memo|forwardRef|createElement)/.test(text)
  ) {
    return true;
  }

  // PascalCase component-looking exports without importing React (rare but possible)
  if (/export\s+(?:default\s+)?function\s+[A-Z][A-Za-z0-9]*/.test(text)) return true;
  if (/export\s+(?:const|let)\s+[A-Z][A-Za-z0-9]*\s*=/.test(text)) return true;
  if (/export\s+default\s+[A-Z][A-Za-z0-9]*/.test(text)) return true;

  return false;
}

function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function extractComponentsFromFile(
  sourceFile: SourceFile,
  filePath: string,
  root: string,
  project: Project,
): ComponentInfo[] {
  // Always POSIX separators so IDs match across Windows URL / Vite lookups
  const relativePath = toPosixPath(path.relative(root, filePath));
  const results: ComponentInfo[] = [];
  const seen = new Set<string>();

  const push = (
    name: string,
    exportName: string,
    isDefaultExport: boolean,
    line: number,
  ) => {
    const id = `${relativePath}::${exportName}`;
    if (seen.has(id)) return;
    seen.add(id);
    const props = extractPropSchema(
      sourceFile,
      isDefaultExport ? name : exportName,
      isDefaultExport,
      project,
    );
    results.push({
      id,
      name,
      exportName,
      filePath,
      relativePath,
      isDefaultExport,
      props,
      fixtures: {},
      variants: [],
      line,
    });
  };

  // Named function exports
  for (const fn of sourceFile.getFunctions()) {
    if (!fn.isExported()) continue;
    const name = fn.getName();
    if (!name || !isComponentName(name)) continue;
    push(name, name, false, fn.getStartLineNumber());
  }

  // Variable exports (const Button = ...)
  for (const stmt of sourceFile.getVariableStatements()) {
    if (!stmt.isExported()) continue;
    for (const decl of stmt.getDeclarations()) {
      const name = decl.getName();
      if (!isComponentName(name)) continue;
      if (!looksLikeComponent(decl)) continue;
      push(name, name, false, decl.getStartLineNumber());
    }
  }

  // export { Foo }
  for (const exp of sourceFile.getExportDeclarations()) {
    for (const spec of exp.getNamedExports()) {
      const name = spec.getName();
      if (!isComponentName(name)) continue;
      const local = sourceFile.getVariableDeclaration(name) ?? sourceFile.getFunction(name);
      if (!local) continue;
      if (Node.isVariableDeclaration(local) && !looksLikeComponent(local)) continue;
      push(name, name, false, local.getStartLineNumber());
    }
  }

  // Default export
  const defaultSymbol = sourceFile.getDefaultExportSymbol();
  if (defaultSymbol) {
    const name = inferDefaultName(defaultSymbol.getName(), filePath);
    const display = isComponentName(name)
      ? name
      : path.basename(filePath, path.extname(filePath));
    if (isComponentName(display)) {
      // Skip if we already catalogued the same component as a named export
      const alreadyNamed = results.some(
        (c) => c.name === display || c.exportName === display,
      );
      if (!alreadyNamed) {
        const line = defaultSymbol.getDeclarations()?.[0]?.getStartLineNumber() ?? 1;
        push(display, 'default', true, line);
      }
    }
  }

  return results;
}

function isComponentName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function looksLikeComponent(decl: import('ts-morph').VariableDeclaration): boolean {
  const init = decl.getInitializer();
  if (!init) {
    // typed as FC / ComponentType
    const typeText = decl.getType().getText();
    return /FC|FunctionComponent|ComponentType|ForwardRef|MemoExotic/.test(typeText);
  }

  if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
    // Heuristic: returns JSX or has PascalCase name (already checked)
    const body = init.getBody();
    if (!body) return true;
    const text = body.getText();
    return /return\s*\(?\s*</.test(text) || /=>\s*</.test(init.getText()) || text.includes('jsx') || text.includes('<');
  }

  if (Node.isCallExpression(init)) {
    const expr = init.getExpression();
    const callee = Node.isIdentifier(expr)
      ? expr.getText()
      : Node.isPropertyAccessExpression(expr)
        ? expr.getName()
        : '';
    return callee === 'memo' || callee === 'forwardRef' || callee === 'styled';
  }

  return false;
}

function inferDefaultName(symbolName: string, filePath: string): string {
  if (symbolName && symbolName !== 'default') return symbolName;
  return path.basename(filePath, path.extname(filePath));
}

export function getComponentById(catalog: LabCatalog, id: string): ComponentInfo | undefined {
  const needle = normalizeComponentId(id);
  if (!needle) return undefined;
  return catalog.components.find((c) => {
    const cid = normalizeComponentId(c.id);
    return (
      cid === needle ||
      c.id === id ||
      encodeURIComponent(c.id) === id ||
      encodeURIComponent(cid) === id
    );
  });
}

/** Decode URI encoding and force `/` so Windows `\` IDs match web requests. */
export function normalizeComponentId(id: string): string {
  let value = id.trim();
  if (!value) return value;
  try {
    // Fastify/Vite may pass already-decoded IDs; only decode when needed
    if (/%[0-9A-Fa-f]{2}/.test(value)) {
      value = decodeURIComponent(value);
    }
  } catch {
    // keep raw
  }
  return toPosixPath(value);
}

function toPosixPath(p: string): string {
  return p.replace(/\\/g, '/');
}

export function searchComponents(catalog: LabCatalog, query: string): ComponentInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog.components.slice(0, 50);
  return catalog.components
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.relativePath.toLowerCase().includes(q) ||
        c.exportName.toLowerCase().includes(q),
    )
    .slice(0, 50);
}
