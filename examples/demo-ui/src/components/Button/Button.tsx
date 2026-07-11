import type { CSSProperties, ReactNode } from 'react';
import { demo } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Visible button label */
  label: string;
  /** Visual style */
  variant?: ButtonVariant;
  /** Control padding and type scale */
  size?: ButtonSize;
  /** Disable interaction */
  disabled?: boolean;
  /** Show a loading state and block clicks */
  loading?: boolean;
  /** Stretch to fill the parent width */
  fullWidth?: boolean;
  /** Optional leading icon glyph (emoji or short text) */
  icon?: string;
  /** Called when the button is activated */
  onClick?: () => void;
  children?: ReactNode;
}

const sizes: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 13, gap: 6 },
  md: { padding: '10px 16px', fontSize: 14, gap: 8 },
  lg: { padding: '13px 20px', fontSize: 15, gap: 8 },
};

const variants: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: demo.accent,
    color: demo.white,
  },
  secondary: {
    background: demo.accentSoft,
    color: demo.accent,
  },
  ghost: {
    background: 'transparent',
    color: demo.accent,
  },
  danger: {
    background: demo.danger,
    color: demo.white,
  },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  onClick,
}: ButtonProps) {
  const idle = !(disabled || loading);

  return (
    <button
      type="button"
      disabled={!idle}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : undefined,
        border: 'none',
        borderRadius: 10,
        fontFamily: demo.font,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        cursor: idle ? 'pointer' : 'not-allowed',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 120ms ease',
        ...sizes[size],
        ...variants[variant],
      }}
    >
      {loading ? (
        'Loading…'
      ) : (
        <>
          {icon ? <span aria-hidden>{icon}</span> : null}
          {label}
        </>
      )}
    </button>
  );
}

export default Button;
