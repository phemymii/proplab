# PropLab demo UI

A small React component kit used to exercise PropLab’s scanner, fixtures, and live preview.

## Components

| Component | Why it’s useful for PropLab |
|-----------|-----------------------------|
| `Button` | Enums (`variant`, `size`), booleans, callbacks |
| `Badge` | Semantic tones + outlined/pill variants |
| `Card` | Optional slots, tone enum, elevation flag |
| `DataTable` | Column/row arrays, sort state, selection |
| `PricingCard` | Nested feature list, billing cycle, CTA |
| `AlertBanner` | Severity enum, action objects, dismiss handler |
| `Toast` | Variant, position, duration, progress, action chip |
| `ProfileCard` | Nested `user` object, stats array, status/role |

## Run

From the PropLab repo root:

```bash
npm run demo
# open http://localhost:4591
```

Or point PropLab at this folder:

```bash
npx proplab --project examples/demo-ui
```
