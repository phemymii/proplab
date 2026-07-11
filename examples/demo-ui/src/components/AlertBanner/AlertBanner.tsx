import { demo } from '../../theme';
import { Button } from '../Button';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface AlertAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface AlertBannerProps {
  /** Banner headline */
  title: string;
  /** Supporting message */
  message: string;
  /** Visual severity */
  severity?: AlertSeverity;
  /** Show a dismiss control */
  dismissible?: boolean;
  /** Optional action buttons */
  actions: AlertAction[];
  /** Compact single-line layout */
  compact?: boolean;
  /** Fired when dismiss is clicked */
  onDismiss?: () => void;
  /** Fired when an action label is clicked */
  onAction?: (label: string) => void;
}

const severityStyle: Record<
  AlertSeverity,
  { bg: string; ink: string; mark: string }
> = {
  info: { bg: demo.infoSoft, ink: demo.info, mark: 'ℹ' },
  success: { bg: demo.successSoft, ink: demo.success, mark: '✓' },
  warning: { bg: demo.warningSoft, ink: demo.warning, mark: '!' },
  danger: { bg: demo.dangerSoft, ink: demo.danger, mark: '✕' },
};

export function AlertBanner({
  title,
  message,
  severity = 'info',
  dismissible = true,
  actions = [],
  compact = false,
  onDismiss,
  onAction,
}: AlertBannerProps) {
  const tone = severityStyle[severity];

  return (
    <div
      role="status"
      style={{
        fontFamily: demo.font,
        display: 'flex',
        gap: 12,
        alignItems: compact ? 'center' : 'flex-start',
        padding: compact ? '12px 14px' : '16px 18px',
        borderRadius: 14,
        background: tone.bg,
        color: tone.ink,
        maxWidth: 560,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: 'rgba(255,255,255,0.55)',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {tone.mark}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>{title}</div>
        <div
          style={{
            marginTop: compact ? 0 : 4,
            fontSize: 13,
            lineHeight: 1.5,
            opacity: 0.9,
          }}
        >
          {message}
        </div>
        {actions.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {actions.map((action) => (
              <Button
                key={action.label}
                label={action.label}
                size="sm"
                variant={action.variant ?? 'secondary'}
                onClick={() => onAction?.(action.label)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {dismissible ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{
            border: 'none',
            background: 'transparent',
            color: tone.ink,
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            opacity: 0.7,
            padding: 0,
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export default AlertBanner;
