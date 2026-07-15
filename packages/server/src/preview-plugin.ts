import path from 'node:path';
import type { Plugin } from 'vite';
import type { ComponentInfo } from '@proplab/core';
import { normalizeComponentId } from '@proplab/core';

const VIRTUAL_PREFIX = '\0proplab-preview:';

export function proplabPreviewPlugin(
  getComponent: (id: string) => ComponentInfo | undefined,
  getConfigPath?: () => string | null,
): Plugin {
  return {
    name: 'proplab-preview',
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith('/__proplab_entry__') || id.startsWith('__proplab_entry__')) {
        const url = new URL(id, 'http://proplab.local');
        const componentId = url.searchParams.get('id') ?? '';
        return VIRTUAL_PREFIX + componentId;
      }
      if (id.startsWith(VIRTUAL_PREFIX)) return id;
      return null;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      const componentId = id.slice(VIRTUAL_PREFIX.length);
      const decodedId = normalizeComponentId(componentId);
      const comp = getComponent(decodedId) ?? getComponent(componentId);
      if (!comp) {
        return `
          document.body.innerHTML = '<pre style="font:14px ui-monospace,monospace;padding:24px;color:#b91c1c">Component not found: ${JSON.stringify(decodedId || componentId)}</pre>';
        `;
      }

      // Prefer POSIX-style /@fs/ paths for Vite
      const importPath = `/@fs/${comp.filePath.split('\\').join('/')}`;
      const exportExpr = comp.isDefaultExport
        ? 'Mod.default'
        : `Mod[${JSON.stringify(comp.exportName)}] ?? Mod.default`;

      const configAbs = getConfigPath?.() ?? null;
      const configImportPath = configAbs
        ? `/@fs/${configAbs.split('\\').join('/')}`
        : null;

      const configImport = configImportPath
        ? `import * as PropLabConfigMod from ${JSON.stringify(configImportPath)};`
        : 'const PropLabConfigMod = null;';

      return `
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as Mod from ${JSON.stringify(importPath)};
${configImport}

const Component = ${exportExpr};
const COMPONENT_NAME = ${JSON.stringify(comp.name)};

function resolveDecorators(mod) {
  if (!mod) return [];
  const cfg = mod.default !== undefined ? mod.default : mod;
  if (typeof cfg === 'function') return [cfg];
  if (cfg && Array.isArray(cfg.decorators)) return cfg.decorators.filter((d) => typeof d === 'function');
  if (Array.isArray(mod.decorators)) return mod.decorators.filter((d) => typeof d === 'function');
  return [];
}

const decorators = resolveDecorators(PropLabConfigMod);

/** Compose project decorators around a preview tree (first = outermost). */
function applyDecorators(tree) {
  if (!decorators.length) return tree;
  return decorators.reduceRight((child, decorator) => {
    const Story = function PropLabStory() { return child; };
    try {
      const out = decorator(Story);
      return out == null ? child : out;
    } catch (err) {
      console.error('[PropLab] decorator error', err);
      return child;
    }
  }, tree);
}

// Props that make common compound roots (Radix etc.) render standalone
const ROOT_DEFAULT_PROPS = {
  Accordion: { type: 'single', collapsible: true, defaultValue: 'proplab-item' },
  AccordionItem: { value: 'proplab-item' },
  Tabs: { defaultValue: 'proplab-tab' },
  TabsTrigger: { value: 'proplab-tab' },
  TabsContent: { value: 'proplab-tab' },
  RadioGroup: { defaultValue: 'proplab-radio' },
  RadioGroupItem: { value: 'proplab-radio' },
  ToggleGroup: { type: 'single' },
  ToggleGroupItem: { value: 'proplab-toggle' },
  Select: { defaultValue: 'proplab-option', open: true },
  SelectItem: { value: 'proplab-option' },
  Menubar: { value: 'proplab-menu' },
  MenubarMenu: { value: 'proplab-menu' },
  DropdownMenu: { open: true, modal: false },
  ContextMenu: { modal: false },
  Dialog: { open: true, modal: false },
  AlertDialog: { open: true },
  Sheet: { open: true, modal: false },
  Drawer: { open: true, modal: false },
  Popover: { open: true },
  Tooltip: { open: true },
  TooltipProvider: {},
  HoverCard: { open: true },
  Collapsible: { open: true },
  Command: {},
  CommandDialog: { open: true },
  ToastAction: { altText: 'Action' },
  Sidebar: {},
  SidebarProvider: {},
  Form: {},
  NavigationMenu: {},
  Carousel: {},
  InputOTP: { maxLength: 6 },
};

// Popper-based roots need a trigger sibling so content anchors on screen
const WRAPPER_TRIGGER = {
  DropdownMenu: 'DropdownMenuTrigger',
  MenubarMenu: 'MenubarTrigger',
  ContextMenu: 'ContextMenuTrigger',
  Popover: 'PopoverTrigger',
  Tooltip: 'TooltipTrigger',
  HoverCard: 'HoverCardTrigger',
  Select: 'SelectTrigger',
};

// Siblings mounted next to the wrapped subtree (no children of their own),
// e.g. toasts are portaled into a viewport that must exist somewhere
const WRAPPER_SIBLING = {
  ToastProvider: 'ToastViewport',
};

function isRenderable(value) {
  return typeof value === 'function' || (typeof value === 'object' && value !== null);
}

// Find same-module parent components by name prefix, outermost first
// e.g. MenuItem -> [Menu]
function findAncestors(name, mod) {
  return Object.keys(mod)
    .filter((k) => /^[A-Z]/.test(k) && k !== name && name.startsWith(k) && isRenderable(mod[k]))
    .sort((a, b) => a.length - b.length);
}

// Progressive family prefixes: MenubarCheckboxItem -> [MenubarCheckbox, Menubar]
function familyPrefixes(name) {
  const prefixes = [];
  let cur = name;
  for (;;) {
    const next = cur.replace(/[A-Z][a-z0-9]*$/, '');
    if (!next || next === cur) break;
    prefixes.push(next);
    cur = next;
  }
  return prefixes;
}

// Extract the parent component name from a context error message, e.g.
// '\`MenuItem\` must be used within \`Menu\`' or '... must be wrapped in \`TooltipProvider\`'.
// Radix errors use internal names (Menu, MenuContent), so fall back to fuzzy
// matching against the module's exports (MenubarMenu, DropdownMenuContent, ...).
function requiredParentFromError(error, mod, componentName) {
  const msg = String((error && error.message) || error);
  const m = msg.match(/(?:within|inside|wrapped in)\\s+(?:an?\\s+)?\`?<?([A-Z][A-Za-z0-9.]*)>?\`?/);
  if (!m) return null;
  const raw = m[1].replace(/\\./g, '');
  const exportNames = Object.keys(mod).filter((k) => k !== componentName && isRenderable(mod[k]));

  if (exportNames.includes(raw)) return raw;

  // e.g. raw 'Menu' -> 'DropdownMenu', raw 'MenuContent' -> 'DropdownMenuContent'
  const suffixMatch = exportNames.filter((k) => k.endsWith(raw)).sort((a, b) => a.length - b.length)[0];
  if (suffixMatch) return suffixMatch;

  // Swap the error's trailing segment onto the component's family prefixes:
  // MenubarCheckboxItem + 'MenuContent' -> 'Menubar' + 'Content' = MenubarContent
  const rawSegment = (raw.match(/[A-Z][a-z0-9]*$/) || [raw])[0];
  const swapped = exportNames
    .filter((k) => k.endsWith(rawSegment) && familyPrefixes(componentName).some((p) => k.startsWith(p)))
    .sort((a, b) => a.length - b.length)[0];
  return swapped || null;
}

// Structural nesting rank: Provider outermost, then root, Menu, List/Content,
// items, then Sub trees innermost. Approximates Radix-style compound nesting.
function wrapperRank(name) {
  if (/Provider$/.test(name)) return 0;
  // Leaf-like exports that should never wrap anything
  if (/(Input|Icon|Image|Empty|Separator|Shortcut|Overlay|Value|Text)$/.test(name)) return 9;
  if (/Sub(Content|Trigger)$/.test(name)) return 7;
  if (/Sub$/.test(name)) return 6;
  if (/Menu$/.test(name)) return 2;
  if (/List$/.test(name)) return 3;
  if (/(Content|Group|Header)$/.test(name)) return 4;
  if (/(Item|Trigger|Label)$/.test(name)) return 5;
  return 1;
}

function sortWrappers(wrappers) {
  wrappers.sort((a, b) => {
    const ra = wrapperRank(a);
    const rb = wrapperRank(b);
    if (ra !== rb) return ra - rb;
    return a.length - b.length;
  });
}

if (!Component) {
  document.body.innerHTML = '<pre style="font:14px ui-monospace,monospace;padding:24px;color:#b91c1c">Export ${JSON.stringify(comp.exportName)} not found in ${JSON.stringify(comp.relativePath)}</pre>';
} else {
  const rootEl = document.getElementById('root');
  const root = createRoot(rootEl);
  let currentProps = ${JSON.stringify(comp.fixtures)};
  const REACT_NODE_PROPS = new Set(${JSON.stringify(
    comp.props.fields.filter((f) => f.kind === 'reactNode').map((f) => f.name),
  )});
  const ancestors = findAncestors(COMPONENT_NAME, Mod);
  // Export names wrapped around the component, outermost first.
  // Grown iteratively as context errors reveal which parents are required.
  let wrappers = [];
  let retries = 0;
  const MAX_RETRIES = 5;

  function stripFunctions(props) {
    const next = { ...props };
    ${comp.props.fields
      .filter((f) => f.kind === 'function')
      .map(
        (f) =>
          `next[${JSON.stringify(f.name)}] = (...args) => { console.log('[PropLab]', ${JSON.stringify(f.name)}, ...args); window.parent.postMessage({ type: 'proplab:event', name: ${JSON.stringify(f.name)}, args: args.map(a => { try { return typeof a === 'object' ? '[object]' : String(a); } catch { return '?'; } }) }, '*'); };`,
      )
      .join('\n    ')}
    return next;
  }

  /** Text fixtures stay as strings; HTML markup becomes real DOM via innerHTML. */
  function looksLikeHtml(value) {
    if (typeof value !== 'string') return false;
    const t = value.trim();
    return t.length > 0 && /^<[a-zA-Z!/?]/.test(t);
  }

  function htmlToReactNode(html) {
    return React.createElement('span', {
      dangerouslySetInnerHTML: { __html: html },
      style: { display: 'contents' },
    });
  }

  function hydrateReactNodes(props) {
    const next = { ...props };
    for (const name of Object.keys(next)) {
      if (!REACT_NODE_PROPS.has(name) && name !== 'children') continue;
      const v = next[name];
      if (looksLikeHtml(v)) next[name] = htmlToReactNode(v.trim());
    }
    return next;
  }

  function isContextError(error) {
    const msg = String((error && error.message) || error);
    return /must be (used|rendered) within|must be wrapped in|useContext|missing.*(provider|context)|cannot read.*context/i.test(msg);
  }

  function buildTree() {
    const ownProps = {
      ...ROOT_DEFAULT_PROPS[COMPONENT_NAME],
      ...stripFunctions(hydrateReactNodes(currentProps)),
    };
    let tree = React.createElement(Component, ownProps);
    for (let i = wrappers.length - 1; i >= 0; i--) {
      const name = wrappers[i];
      const children = [tree];
      // Give popper-based roots a trigger to anchor to
      const triggerName = WRAPPER_TRIGGER[name];
      if (triggerName && isRenderable(Mod[triggerName]) && !wrappers.includes(triggerName) && COMPONENT_NAME !== triggerName) {
        children.unshift(React.createElement(Mod[triggerName], { key: 'proplab-trigger' }, 'Trigger'));
      }
      const siblingName = WRAPPER_SIBLING[name];
      if (siblingName && isRenderable(Mod[siblingName]) && COMPONENT_NAME !== siblingName) {
        children.push(React.createElement(Mod[siblingName], { key: 'proplab-sibling' }));
      }
      tree = React.createElement(Mod[name], { key: 'w-' + name, ...(ROOT_DEFAULT_PROPS[name] || {}) }, ...children);
    }
    // Project .proplabrc decorators wrap the whole tree (providers, routers, …)
    return applyDecorators(tree);
  }

  // Same-family exports that could be structural parents, closest root first:
  // TabsTrigger -> [Tabs, TabsList]
  function familyCandidates() {
    const prefixes = familyPrefixes(COMPONENT_NAME);
    const ownRank = wrapperRank(COMPONENT_NAME);
    return Object.keys(Mod)
      .filter((k) =>
        k !== COMPONENT_NAME &&
        isRenderable(Mod[k]) &&
        wrapperRank(k) < ownRank &&
        (prefixes.some((p) => k.startsWith(p)) || COMPONENT_NAME.startsWith(k)),
      )
      .sort((a, b) => wrapperRank(a) - wrapperRank(b) || a.length - b.length);
  }

  // Returns true when a retry with an extra wrapper has been scheduled
  function tryGrowWrappers(error) {
    if (retries >= MAX_RETRIES) return false;
    let parent = null;
    if (isContextError(error)) {
      parent = requiredParentFromError(error, Mod, COMPONENT_NAME);
      if (parent && wrappers.includes(parent)) parent = null;
    }
    if (!parent) {
      // Fall back to the prefix ancestors, then rank-based family candidates
      parent =
        ancestors.find((a) => !wrappers.includes(a)) ||
        familyCandidates().find((c) => !wrappers.includes(c)) ||
        null;
    }
    if (!parent) return false;
    wrappers.push(parent);
    sortWrappers(wrappers);
    retries++;
    window.parent.postMessage({ type: 'proplab:wrapped', wrappers: wrappers.slice() }, '*');
    setTimeout(render, 0);
    return true;
  }

  class PreviewErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error };
    }
    componentDidCatch(error) {
      // Many parent-dependence crashes don't mention "context" (cmdk, react-hook-form),
      // so retry with an extra family wrapper on any render error while candidates remain.
      if (tryGrowWrappers(error)) {
        this.retryScheduled = true;
        return;
      }
      window.parent.postMessage({ type: 'proplab:error', message: String(error) }, '*');
    }
    render() {
      if (this.state.error) {
        if (this.retryScheduled) return null; // retry incoming
        const msg = (this.state.error.message || String(this.state.error));
        const missingProviders = isContextError(this.state.error) && decorators.length === 0;
        const friendly = missingProviders
          ? 'This component needs a provider/context. Add a .proplabrc.tsx with decorators (see examples/hard-cases), or wrap it in its parent compound component.\\n\\nOriginal error: ' + msg
          : isContextError(this.state.error)
          ? 'This is a compound sub-component: it must be rendered inside its parent (e.g. MenuItem inside Menu). PropLab could not find or mount a matching parent in the same module.\\n\\nOriginal error: ' + msg
          : 'Preview error: ' + msg;
        return React.createElement('div', { style: { padding: 16 } },
          React.createElement('div', {
            style: { font: '600 13px system-ui', color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap', marginBottom: 12 }
          }, friendly),
          React.createElement('pre', {
            style: { font: '11px ui-monospace,monospace', color: '#b91c1c', whiteSpace: 'pre-wrap', margin: 0 }
          }, this.state.error.stack || ''),
        );
      }
      return this.props.children;
    }
  }

  function render() {
    try {
      root.render(
        React.createElement(
          PreviewErrorBoundary,
          { key: 'attempt-' + retries + '-' + JSON.stringify(currentProps) },
          buildTree(),
        ),
      );
    } catch (err) {
      rootEl.innerHTML = '<pre style="font:13px ui-monospace,monospace;padding:16px;color:#b91c1c;white-space:pre-wrap">' +
        (err && err.stack ? err.stack : String(err)) + '</pre>';
    }
  }

  render();

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.type !== 'proplab:props') return;
    currentProps = data.props ?? {};
    render();
  });

  window.parent.postMessage({
    type: 'proplab:ready',
    id: ${JSON.stringify(comp.id)},
    decorators: decorators.length,
    config: ${JSON.stringify(configAbs ? path.basename(configAbs) : null)},
  }, '*');
}
`;
    },
  };
}

export function previewHtml(
  componentId: string,
  styleUrls: string[] = [],
  options: { reactNative?: boolean } = {},
): string {
  const encoded = encodeURIComponent(componentId);
  const styleTags = styleUrls
    .map((url) => `<link rel="stylesheet" href="${url}" />`)
    .join('\n  ');

  const rnReset = options.reactNative
    ? `
    /* react-native-web expects a flex column root */
    html, body, #root {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 100%;
      height: 100%;
    }
    #root > * { max-width: 100%; }
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PropLab Preview</title>
  ${styleTags}
  <style>
    html, body, #root { margin: 0; padding: 0; min-height: 100%; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      background:
        linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px) 0 0 / 16px 16px,
        linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px) 0 0 / 16px 16px,
        #f8fafc;
      color: #0f172a;
    }
    #root { padding: 24px; box-sizing: border-box; }
    ${rnReset}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/__proplab_entry__?id=${encoded}"></script>
</body>
</html>`;
}
