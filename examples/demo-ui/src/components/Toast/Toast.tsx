import { demo } from '../../theme';

export type ToastVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
export type ToastPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center';

export interface ToastAction {
  label: string;
}

export interface ToastProps {
  /** Short headline shown in the toast */
  title: string;
  /** Supporting copy under the title */
  description?: string;
  /** Visual tone */
  variant?: ToastVariant;
  /** Where the toast anchors in the preview */
  position?: ToastPosition;
  /** Whether the toast is currently visible */
  open?: boolean;
  /** Show a close control */
  dismissible?: boolean;
  /** Auto-dismiss countdown in milliseconds (0 = sticky) */
  duration?: number;
  /** Optional progress bar for timed toasts */
  showProgress?: boolean;
  /** Action chip under the description */
  action: ToastAction;
  /** Leading icon override (emoji / short mark) */
  icon?: string;
  /** Fired when dismiss is clicked */
  onDismiss?: () => void;
  /** Fired when the action is clicked */
  onAction?: () => void;
}

const variants: Record<ToastVariant, { bg: string; ink: string; mark: string; bar: string }> = {
  default: { bg: demo.ink, ink: demo.white, mark: '•', bar: 'rgba(255,255,255,0.35)' },
  success: { bg: demo.success, ink: demo.white, mark: '✓', bar: 'rgba(255,255,255,0.4)' },
  warning: { bg: demo.warning, ink: demo.white, mark: '!', bar: 'rgba(255,255,255,0.4)' },
  danger: { bg: demo.danger, ink: demo.white, mark: '✕', bar: 'rgba(255,255,255,0.4)' },
  info: { bg: demo.info, ink: demo.white, mark: 'ℹ', bar: 'rgba(255,255,255,0.4)' },
};

const positions: Record<ToastPosition, React.CSSProperties> = {
  'top-left': { top: 16, left: 16, right: 'auto', bottom: 'auto' },
  'top-right': { top: 16, right: 16, left: 'auto', bottom: 'auto' },
  'top-center': { top: 16, left: '50%', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)' },
  'bottom-left': { bottom: 16, left: 16, right: 'auto', top: 'auto' },
  'bottom-right': { bottom: 16, right: 16, left: 'auto', top: 'auto' },
  'bottom-center': {
    bottom: 16,
    left: '50%',
    right: 'auto',
    top: 'auto',
    transform: 'translateX(-50%)',
  },
};

export function Toast({
  title,
  description,
  variant = 'default',
  position = 'bottom-right',
  open = true,
  dismissible = true,
  duration = 4000,
  showProgress = true,
  action,
  icon,
  onDismiss,
  onAction,
}: ToastProps) {
  if (!open) {
    return (
      <div
        style={{
          fontFamily: demo.font,
          color: demo.muted,
          fontSize: 13,
          padding: 16,
        }}
      >
        Toast is closed — set <code>open</code> to true to preview it.
      </div>
    );
  }

  const tone = variants[variant];
  const timed = duration > 0 && showProgress;

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 160,
        width: '100%',
        maxWidth: 420,
        background: demo.surface,
        borderRadius: 16,
        fontFamily: demo.font,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          zIndex: 2,
          width: 320,
          maxWidth: 'calc(100% - 32px)',
          ...positions[position],
          background: tone.bg,
          color: tone.ink,
          borderRadius: 14,
          boxShadow: '0 18px 40px rgba(26,24,20,0.22)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            padding: '14px 14px 12px',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background: 'rgba(255,255,255,0.16)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              flexShrink: 0,
              fontSize: 13,
            }}
          >
            {icon ?? tone.mark}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>{title}</div>
            {description ? (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  lineHeight: 1.45,
                  opacity: 0.88,
                }}
              >
                {description}
              </div>
            ) : null}

            {action ? (
              <button
                type="button"
                onClick={onAction}
                style={{
                  marginTop: 10,
                  border: 'none',
                  background: 'rgba(255,255,255,0.16)',
                  color: tone.ink,
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: demo.font,
                }}
              >
                {action.label}
              </button>
            ) : null}
          </div>

          {dismissible ? (
            <button
              type="button"
              aria-label="Dismiss toast"
              onClick={onDismiss}
              style={{
                border: 'none',
                background: 'transparent',
                color: tone.ink,
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                opacity: 0.75,
                padding: 0,
              }}
            >
              ×
            </button>
          ) : null}
        </div>

        {timed ? (
          <div style={{ height: 3, background: 'rgba(255,255,255,0.12)' }}>
            <div
              style={{
                height: '100%',
                width: '100%',
                background: tone.bar,
                transformOrigin: 'left center',
                animation: `proplab-toast-progress ${duration}ms linear forwards`,
              }}
            />
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes proplab-toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

export default Toast;
