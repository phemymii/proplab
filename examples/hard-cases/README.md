# PropLab hard cases

Components that **cannot** preview from auto-generated props alone — they read
React context and throw without providers. This kit demonstrates project-level
`.proplabrc` decorators.

## Why these need decorators

| Component | Required context | Error without decorator |
|-----------|------------------|-------------------------|
| `AccountBadge` | `AuthProvider` | `useAuth must be used within AuthProvider` |
| `ThemedBanner` | `ThemeProvider` | `useTheme must be used within ThemeProvider` |
| `ProfileFormField` | `FormProvider` | `useFormContext must be used within FormProvider` |
| `SlotCard` | none | — (`icon` / `children` / `badge` / `footer` are `ReactNode` slots) |

Dummy props (`showEmail`, `title`, `name`, …) are fine. The crash is missing
**app shell**, not missing fixtures.

## The fix: `.proplabrc.tsx`

```tsx
import { AppProviders } from './src/providers/AppProviders';

export default {
  decorators: [
    (Story) => (
      <AppProviders theme="light">
        <Story />
      </AppProviders>
    ),
  ],
};
```

See [`.proplabrc.tsx`](./.proplabrc.tsx). PropLab loads this at preview time and
wraps every component with your decorators (first decorator = outermost).

Also accepted: `proplab.config.ts` / `.js`, or a default-export function used as
a single decorator.

## Run

From the PropLab repo root:

```bash
npm run demo:hard
# open http://localhost:4591
```

Or:

```bash
npx proplab --project examples/hard-cases
```

Open `AccountBadge`, `ThemedBanner`, `ProfileFormField`, or `SlotCard` — the
first three should render with auth / theme / form wired in. `SlotCard` shows
`ReactNode` slots (`icon`, `children`, `badge`, `footer`) editable as text in
the props panel. Remove or rename `.proplabrc.tsx` to see the context errors
again on the provider-backed components.
