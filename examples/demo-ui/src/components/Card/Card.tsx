import type { ReactNode } from 'react';
import { demo } from '../../theme';

export type CardTone = 'default' | 'muted' | 'accent';

export interface CardProps {
  /** Card heading */
  title: string;
  /** Supporting copy under the title */
  description?: string;
  /** Small label above the title */
  eyebrow?: string;
  /** Soft tonal treatment */
  tone?: CardTone;
  /** Lift the card with a shadow */
  elevated?: boolean;
  /** Optional footer slot content */
  footer?: ReactNode;
  children?: ReactNode;
}

const tones: Record<CardTone, { bg: string; ink: string }> = {
  default: { bg: demo.white, ink: demo.ink },
  muted: { bg: demo.surface, ink: demo.ink },
  accent: { bg: demo.accent, ink: demo.white },
};

export function Card({
  title,
  description,
  eyebrow,
  tone = 'default',
  elevated = false,
  footer,
  children,
}: CardProps) {
  const palette = tones[tone];

  return (
    <section
      style={{
        padding: 22,
        borderRadius: 16,
        background: palette.bg,
        color: palette.ink,
        maxWidth: 380,
        boxShadow: elevated ? '0 18px 40px rgba(26,24,20,0.12)' : 'none',
        fontFamily: demo.font,
      }}
    >
      {eyebrow ? (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.65,
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <h3
        style={{
          margin: '0 0 6px',
          fontSize: 18,
          letterSpacing: '-0.02em',
          fontWeight: 700,
        }}
      >
        {title}
      </h3>
      {description ? (
        <p
          style={{
            margin: '0 0 14px',
            color: tone === 'accent' ? 'rgba(255,255,255,0.78)' : demo.muted,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {description}
        </p>
      ) : null}
      {children}
      {footer ? (
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            opacity: 0.9,
            fontSize: 13,
          }}
        >
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export default Card;
