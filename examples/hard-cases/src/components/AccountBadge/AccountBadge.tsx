import { useAuth } from '../../providers/AuthProvider';
import { demo } from '../../theme';

export type AccountBadgeSize = 'sm' | 'md' | 'lg';

export interface AccountBadgeProps {
  /** Show the signed-in email under the name */
  showEmail?: boolean;
  /** Show role chip */
  showRole?: boolean;
  /** Compact avatar + name only */
  size?: AccountBadgeSize;
  /** Called when the sign-out control is clicked */
  onSignOut?: () => void;
}

const sizes: Record<
  AccountBadgeSize,
  { pad: string; avatar: number; name: number; meta: number }
> = {
  sm: { pad: '8px 10px', avatar: 28, name: 13, meta: 11 },
  md: { pad: '12px 14px', avatar: 36, name: 14, meta: 12 },
  lg: { pad: '16px 18px', avatar: 44, name: 16, meta: 13 },
};

/**
 * Reads the signed-in user from AuthProvider.
 * Previewing this alone (no `.proplabrc` decorator) throws:
 * `useAuth must be used within AuthProvider`
 */
export function AccountBadge({
  showEmail = true,
  showRole = true,
  size = 'md',
  onSignOut,
}: AccountBadgeProps) {
  const { user, isAuthenticated, signOut } = useAuth();
  const s = sizes[size];

  if (!isAuthenticated || !user) {
    return (
      <div
        style={{
          padding: s.pad,
          borderRadius: demo.radius,
          border: `1px dashed ${demo.line}`,
          color: demo.muted,
          fontFamily: demo.font,
          fontSize: s.name,
        }}
      >
        Signed out
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: s.pad,
        borderRadius: demo.radius,
        border: `1px solid ${demo.line}`,
        background: demo.white,
        fontFamily: demo.font,
        maxWidth: 360,
      }}
    >
      <div
        aria-hidden
        style={{
          width: s.avatar,
          height: s.avatar,
          borderRadius: '50%',
          background: demo.accent,
          color: demo.white,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontSize: s.name - 1,
          flexShrink: 0,
        }}
      >
        {user.avatarInitials}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 650,
            fontSize: s.name,
            color: demo.ink,
            letterSpacing: '-0.01em',
          }}
        >
          {user.name}
        </div>
        {showEmail ? (
          <div
            style={{
              fontSize: s.meta,
              color: demo.muted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.email}
          </div>
        ) : null}
      </div>
      {showRole ? (
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
          }}
        >
          {user.role}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => {
          onSignOut?.();
          signOut();
        }}
        style={{
          border: 'none',
          background: 'transparent',
          color: demo.muted,
          fontFamily: demo.font,
          fontSize: s.meta,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        Sign out
      </button>
    </div>
  );
}

export default AccountBadge;
