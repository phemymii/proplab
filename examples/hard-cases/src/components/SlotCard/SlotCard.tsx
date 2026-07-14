import type { ReactNode } from 'react';
import { demo } from '../../theme';

export interface SlotCardProps {
  /** Card title */
  title: string;
  /** Leading slot (icon / emblem) */
  icon?: ReactNode;
  /** Main body */
  children: ReactNode;
  /** Trailing badge / status chip */
  badge?: ReactNode;
  /** Bottom slot (actions / footnotes) */
  footer?: ReactNode;
}

/**
 * Demonstrates ReactNode slots editable in PropLab as text fixtures.
 * Strings are valid React nodes on web — edit `icon`, `children`, `badge`,
 * and `footer` in the props panel to see slots update live.
 */
export function SlotCard({
  title,
  icon,
  children,
  badge,
  footer,
}: SlotCardProps) {
  return (
    <article
      style={{
        maxWidth: 420,
        borderRadius: demo.radius,
        border: `1px solid ${demo.line}`,
        background: demo.white,
        fontFamily: demo.font,
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderBottom: `1px solid ${demo.line}`,
          background: demo.surface,
        }}
      >
        {icon != null && icon !== '' ? (
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: demo.accentSoft,
              color: demo.accent,
              display: 'grid',
              placeItems: 'center',
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        ) : null}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontWeight: 650,
            fontSize: 15,
            color: demo.ink,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        {badge != null && badge !== '' ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '4px 8px',
              borderRadius: 999,
              background: demo.accentSoft,
              color: demo.accent,
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        ) : null}
      </header>

      <div
        style={{
          padding: '14px 16px',
          fontSize: 14,
          lineHeight: 1.5,
          color: demo.muted,
        }}
      >
        {children}
      </div>

      {footer != null && footer !== '' ? (
        <footer
          style={{
            padding: '10px 16px 14px',
            borderTop: `1px solid ${demo.line}`,
            fontSize: 12,
            color: demo.soft,
            fontFamily: demo.mono,
          }}
        >
          {footer}
        </footer>
      ) : null}
    </article>
  );
}

export default SlotCard;
