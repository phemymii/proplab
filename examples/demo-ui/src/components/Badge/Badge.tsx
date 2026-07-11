import type { CSSProperties, ReactNode } from 'react';
import { demo } from '../../theme';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  children: ReactNode;
  /** Semantic color */
  tone?: BadgeTone;
  /** Rounder pill shape */
  pill?: boolean;
  /** Optional leading mark */
  icon?: string;
  size?: BadgeSize;
  /** Soft outline instead of filled chip */
  outlined?: boolean;
}

const tones: Record<BadgeTone, { fill: string; ink: string }> = {
  neutral: { fill: demo.panel, ink: demo.ink },
  success: { fill: demo.successSoft, ink: demo.success },
  warning: { fill: demo.warningSoft, ink: demo.warning },
  danger: { fill: demo.dangerSoft, ink: demo.danger },
  info: { fill: demo.infoSoft, ink: demo.info },
};

const sizes: Record<BadgeSize, CSSProperties> = {
  sm: { padding: '2px 8px', fontSize: 11 },
  md: { padding: '4px 10px', fontSize: 12 },
};

export function Badge({
  children,
  tone = 'neutral',
  pill = false,
  icon,
  size = 'md',
  outlined = false,
}: BadgeProps) {
  const palette = tones[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: demo.font,
        fontWeight: 600,
        borderRadius: pill ? 999 : 8,
        background: outlined ? 'transparent' : palette.fill,
        color: palette.ink,
        boxShadow: outlined ? `inset 0 0 0 1px ${palette.ink}33` : undefined,
        ...sizes[size],
      }}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}

export default Badge;
