# PropLab

**Work in progress.** PropLab is an early-stage component lab for React: it scans your project, builds a catalog from exports, generates props from TypeScript types, and previews components live — without requiring hand-written story files.

> Expect rough edges. APIs, UI, and framework support will change. **React Native / Expo preview is experimental and not fully supported yet.**

```bash
npx proplab
```

Opens the lab at [http://localhost:4591](http://localhost:4591).

### Tutorial

![PropLab tutorial — browse components, edit props, and preview live](https://github.com/phemymii/proplab/blob/main/assets/tutorial.gif?raw=true)

---

## Status

| Area | State |
|------|--------|
| React (Vite / CRA-style) | Usable for exploration |
| Next.js (App Router) | Partial — shims + stubs, not a full Next runtime |
| Tailwind / PostCSS | Works when project configs are present |
| Compound / context components | Best-effort auto-wrapping (Radix-style) |
| React Native / Expo | **Not solidly compatible yet** — catalog works; preview is experimental and often breaks on real Expo apps |
| Config / providers / stories | `.proplabrc` decorators supported — see [`examples/hard-cases`](examples/hard-cases) |

This is a **v0.1** experiment. Use it to explore component APIs and fixtures — not as a production design-system docs host yet.

---

## Why PropLab?

Hand-writing fixtures for every component adds friction. PropLab flips the workflow:

1. **Discover** — AST scan finds exported React components  
2. **Extract** — prop types become an editable schema  
3. **Generate** — dummy fixtures and variants from enums, booleans, objects, arrays  
4. **Preview** — Vite-powered live render with a props panel  

---

## Getting started

### Prerequisites

- **Node.js 18+**
- A React project with dependencies installed (`npm install` / `pnpm install` / etc.)
- PropLab resolves packages from the **target project’s** `node_modules`, not its own

### Run against your project

```bash
# From the root of any React app
npx proplab

# Or point at a path
npx proplab --project ./apps/web

# Scan only (no UI) — useful for CI / debugging discovery
npx proplab --scan-only
```

Then open [http://localhost:4591](http://localhost:4591).

### CLI options

```
Usage: proplab [options]

Options:
  -p, --project <path>   Project root (default: cwd)
  --port <number>        Server port (default: 4591)
  -i, --include <paths>  Only scan these dirs/files (faster on large repos)
  --pull <paths>         Same as --include
  --no-open              Do not open the browser
  --no-watch             Disable filesystem watching
  --scan-only            Print catalog stats and exit
```

On large monorepos, scope the scan:

```bash
npx proplab --include src/components
npx proplab --pull src/components/Button.tsx src/components/Card.tsx
npx proplab --projects /path/to/project --pull src/components/Card.tsx
npx proplab --include apps/web/src packages/ui/src
```

`--include` / `--pull` limit what appears in the **catalog**. Preview still resolves imports from the rest of the project (so `Button` can render children it imports), but those dependencies won’t show up as separate sidebar entries unless you include their paths too.

---

## Try the bundled demo

The repo ships a small React kit under [`examples/demo-ui`](examples/demo-ui) so you can evaluate PropLab without wiring your own app.

**What’s in the demo**

| Component | Good for exercising… |
|-----------|----------------------|
| `Button`, `Badge`, `Card` | Enums, booleans, simple variants |
| `DataTable` | Column/row arrays, selection, density |
| `PricingCard` | Nested feature lists, billing cycle, CTA |
| `AlertBanner` | Severity, action objects, dismiss |
| `Toast` | Position, duration, progress, action chip |
| `ProfileCard` | Nested `user` object, stats, status/role |

### Run the demo (from this repo)

```bash
git clone https://github.com/phemymii/proplab.git
cd PropLab
npm install
npm run demo
```

Then open [http://localhost:4591](http://localhost:4591).

`npm run demo` builds all packages and starts PropLab against `examples/demo-ui` (browser open is disabled by default; use the URL above).

Equivalent manual command:

```bash
npm run build
node packages/cli/dist/index.js --project examples/demo-ui
```

### Hard cases (`.proplabrc` decorators)

[`examples/hard-cases`](examples/hard-cases) has components that read Auth / Theme / Form context. A [`.proplabrc.tsx`](examples/hard-cases/.proplabrc.tsx) wraps every preview with `AppProviders`.

```bash
npm run demo:hard
```

---

## Features (current)

- Component catalog with search and folder grouping  
- Prop schema from TypeScript interfaces / component parameter types  
- Auto fixtures for string, number, boolean, enums, objects, arrays  
- Named variants derived from enum + boolean props  
- Live preview iframe via Vite middleware  
- Props controls + live JSON  
- **Open in editor** — opens the selected file (and line) via `cursor` / `code`, or `PROPLAB_EDITOR`  
- Filesystem watch + WebSocket catalog refresh  
- Light / dark lab UI  
- Path alias resolution from `tsconfig` / `jsconfig` (including `extends`)  
- Best-effort wrapping for compound components that need parent context  
- Project `.proplabrc` / `proplab.config.*` decorators (global providers)  

---

## How it works

```
Your project
     │
     ▼
@proplab/core      Discovery (ts-morph) → prop schema → fixtures / variants
     │
     ▼
@proplab/server    Fastify API + Vite preview middleware + file watch
     │
     ▼
@proplab/web       Catalog · preview · props panel
```

The preview loads your real module via Vite (`/@fs/...`), then syncs prop edits from the lab UI with `postMessage`.

| Package | Role |
|---------|------|
| `@proplab/core` | Scanner, prop schema, fixtures |
| `@proplab/server` | API, Vite preview, static UI |
| `@proplab/web` | Lab interface |
| `proplab` | CLI |

---

## Framework notes

### React (web)

Best supported path today: standard React + TypeScript projects with local `node_modules`. Vite/Next-style path aliases and Tailwind/PostCSS are picked up when present.

### Next.js

Partial support only:

- Common `next/*` imports are **shimmed** for the browser preview (`link`, `image`, `navigation`, themes, …)  
- `'use server'` modules are stubbed  
- App Router `page.tsx` / `layout.tsx` are excluded from the catalog by default  
- This is **not** a full Next.js runtime — server components, RSC data fetching, and many App Router behaviors won’t work as in production  

### React Native / Expo — not solidly compatible yet

**Expo / React Native support is still early and unreliable.** PropLab can usually *find* components and generate props, but live preview is a best-effort browser path via `react-native-web` (not a native simulator). Many real Expo apps will fail or look wrong — especially anything that depends on native modules.

Treat Expo as experimental: useful for simple presentational UI, not as a drop-in lab for production Expo codebases.

```bash
# In your Expo app (required for any chance of live preview)
npx expo install react-native-web react-dom

npx proplab --project ./path/to/project
```

What can work today (simple cases):

- Catalog + prop fixtures for RN/Expo components  
- `react-native` → `react-native-web` aliasing + `.web.*` extensions  
- Soft shims/stubs for some Expo / RN packages so sibling UI can still load  

Common failure modes:

- Native-only modules (Skia, camera, bluetooth, secure store, TrueSheet, …)  
- Reanimated / Gesture Handler / native navigation  
- Heavy Expo Router apps and large dependency graphs  
- Pixel-perfect iOS/Android layout  

For a minimal smoke test, use the bundled kit: [`examples/expo-ui`](examples/expo-ui) (`npm run demo:expo`).

---

## Limitations

- Early software — bugs, incomplete edge cases, and breaking changes are expected  
- **Expo / React Native is not solidly compatible yet** — expect broken previews on many real apps; catalog/listing is the more reliable part  
- Large repos: PropLab prefers `src` / `app` / `pages` / `components` (and workspace packages) and skips non-UI files; use `--include` to narrow further  
- Components that need custom providers (forms, themes, routers) — add a `.proplabrc` with decorators (see `examples/hard-cases`)  
- Node-only packages (`sharp`, `nodemailer`, `fs`, …) are stubbed in preview  
- Generated fixtures are heuristics — nested/index-signature types can look thin  
- Global CSS is auto-injected when common entry files are found (`app/globals.css`, etc.)  
- Not a replacement for visual regression or a11y audits yet  

---

## Local development

```bash
git clone https://github.com/phemymii/proplab.git
cd PropLab
npm install
npm run build

# Demo kit (recommended first run)
npm run demo

# Or your own project
npm run proplab -- --project /path/to/your-app

# Lab UI only (Vite), proxies API to :4591 when the server is running
npm run dev
```

---

## Publishing (maintainers)

Publishable packages (in order):

1. `@proplab/core`
2. `@proplab/server` (bundles the web UI)
3. `proplab` (CLI — what users install via `npx proplab`)

```bash
npm login
npm run publish:packages
```

GitHub: [github.com/phemymii/proplab](https://github.com/phemymii/proplab)

---

## Contributing / feedback

Issues and PRs are welcome — especially reproductions against real apps (Next, Expo, monorepos).

- Repo: [github.com/phemymii/proplab](https://github.com/phemymii/proplab)  
- Bugs: [Issues](https://github.com/phemymii/proplab/issues)  

---

## License

MIT
