import { useTheme } from '../../providers/ThemeProvider';
import { demo } from '../../theme';

export type BannerTone = 'info' | 'success' | 'warning';

export interface ThemedBannerProps {
  /** Banner title */
  title: string;
  /** Supporting copy */
  message?: string;
  /** Semantic accent */
  tone?: BannerTone;
  /** Show a control that flips light/dark via ThemeProvider */
  showThemeToggle?: boolean;
}

const toneAccent: Record<BannerTone, string> = {
  info: demo.info,
  success: demo.success,
  warning: demo.warning,
};

/**
 * Pulls colors from ThemeProvider.
 * Previewing this alone (no `.proplabrc` decorator) throws:
 * `useTheme must be used within ThemeProvider`
 */
export function ThemedBanner({
  title,
  message = 'Theme tokens come from context — without ThemeProvider this crashes.',
  tone = 'info',
  showThemeToggle = true,
}: ThemedBannerProps) {
  const { mode, setMode, colors } = useTheme();
  const accent = toneAccent[tone];

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: '16px 18px',
        borderRadius: demo.radius,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.fg,
        fontFamily: demo.font,
        maxWidth: 480,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 10,
          alignSelf: 'stretch',
          borderRadius: 999,
          background: accent,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 650,
            fontSize: 15,
            letterSpacing: '-0.01em',
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.45 }}>
          {message}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: colors.muted,
            fontFamily: demo.mono,
          }}
        >
          mode={mode}
        </div>
      </div>
      {showThemeToggle ? (
        <button
          type="button"
          onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.accentSoft,
            color: colors.accent,
            borderRadius: 8,
            padding: '6px 10px',
            fontFamily: demo.font,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {mode === 'light' ? 'Dark' : 'Light'}
        </button>
      ) : null}
    </div>
  );
}

export default ThemedBanner;
