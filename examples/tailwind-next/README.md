# PropLab · Tailwind + Next.js demo

Minimal **Next.js App Router** kit with **Tailwind CSS** so you can verify PropLab’s
PostCSS / Tailwind preview path.

## What’s included

| Component | Exercises |
|-----------|-----------|
| `TwButton` | Variants, sizes, loading, `clsx` class merge |
| `TwBadge` | Tone enum + pill boolean |
| `TwCard` | Title / description / ReactNode slots |
| `TwAlert` | Severity enum + dismiss action |

Also:

- `app/globals.css` with `@tailwind` directives (auto-injected into previews)
- `postcss.config.mjs` + `tailwind.config.ts`
- `next` in dependencies so PropLab detects `nextjs` project type
- App Router `page.tsx` / `layout.tsx` are skipped from the catalog by default

## Run

From the PropLab repo root:

```bash
cd examples/tailwind-next && npm install && cd ../..
npm run demo:tailwind
```

Then open [http://localhost:4591](http://localhost:4591) and pick `TwButton` /
`TwBadge` / `TwCard` / `TwAlert`. Utility classes should render (teal brand button,
shadowed card, etc.).

## Notes

- This is a **preview kit**, not a full Next runtime — PropLab still uses Vite for
  the iframe. Server Components / RSC data fetching won’t run here.
- If styles look unstyled, confirm `examples/tailwind-next/node_modules` has
  `tailwindcss`, `postcss`, and `autoprefixer` installed.
