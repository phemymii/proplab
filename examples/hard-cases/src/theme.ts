/** Shared visual tokens for the hard-cases kit. */
export const demo = {
  ink: '#1a1814',
  muted: '#6f6a62',
  soft: '#9a948a',
  line: '#ddd8cf',
  surface: '#f7f5f1',
  panel: '#ebe8e2',
  white: '#ffffff',
  accent: '#3d4f5f',
  accentSoft: '#e5e9ec',
  success: '#2f6b4f',
  successSoft: '#e4f0ea',
  warning: '#8a5a1e',
  warningSoft: '#f5ebdc',
  danger: '#9b3a2f',
  dangerSoft: '#f3e4e1',
  info: '#2f4f6b',
  infoSoft: '#e4ebf0',
  radius: 12,
  font: '"DM Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

export type LabThemeMode = 'light' | 'dark';

export const themePalettes: Record<
  LabThemeMode,
  {
    bg: string;
    fg: string;
    muted: string;
    border: string;
    accent: string;
    accentSoft: string;
  }
> = {
  light: {
    bg: demo.surface,
    fg: demo.ink,
    muted: demo.muted,
    border: demo.line,
    accent: demo.accent,
    accentSoft: demo.accentSoft,
  },
  dark: {
    bg: '#1c1f24',
    fg: '#f2efe8',
    muted: '#9aa3ad',
    border: '#2e343c',
    accent: '#8fb4d0',
    accentSoft: '#24303a',
  },
};
