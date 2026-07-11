import { demo } from '../../theme';
import { Badge } from '../Badge';
import { Button } from '../Button';

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface ProfileStat {
  label: string;
  value: number;
}

export interface ProfileUser {
  name: string;
  email: string;
  handle: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
}

export interface ProfileCardProps {
  /** Primary user payload */
  user: ProfileUser;
  /** Short bio */
  bio?: string;
  /** Location line */
  location?: string;
  /** Metric chips under the bio */
  stats: ProfileStat[];
  /** Show follow CTA */
  showFollow?: boolean;
  /** Whether the viewer already follows this user */
  following?: boolean;
  /** Compact horizontal layout */
  compact?: boolean;
  onFollow?: () => void;
  onMessage?: () => void;
}

const statusTone: Record<UserStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  online: 'success',
  away: 'warning',
  busy: 'danger',
  offline: 'neutral',
};

const roleLabel: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export function ProfileCard({
  user,
  bio,
  location,
  stats = [],
  showFollow = true,
  following = false,
  compact = false,
  onFollow,
  onMessage,
}: ProfileCardProps) {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      style={{
        fontFamily: demo.font,
        width: compact ? 420 : 320,
        padding: 22,
        borderRadius: 18,
        background: demo.white,
        boxShadow: '0 18px 40px rgba(26,24,20,0.1)',
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        gap: 16,
        alignItems: compact ? 'center' : 'stretch',
      }}
    >
      <div
        aria-hidden
        style={{
          width: compact ? 64 : 72,
          height: compact ? 64 : 72,
          borderRadius: 20,
          background: demo.accent,
          color: demo.white,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '-0.03em',
          flexShrink: 0,
          backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {user.avatarUrl ? null : initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 17, letterSpacing: '-0.02em' }}>{user.name}</h3>
          <Badge tone={statusTone[user.status]} pill size="sm">
            {user.status}
          </Badge>
        </div>

        <div style={{ marginTop: 4, fontSize: 12, color: demo.muted, fontFamily: demo.mono }}>
          @{user.handle} · {roleLabel[user.role]}
        </div>

        {bio ? (
          <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.5, color: demo.ink }}>
            {bio}
          </p>
        ) : null}

        {location ? (
          <div style={{ marginTop: 8, fontSize: 12, color: demo.muted }}>📍 {location}</div>
        ) : null}

        {stats.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`,
              gap: 8,
              marginTop: 14,
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: demo.surface,
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: demo.muted, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {showFollow ? (
            <Button
              label={following ? 'Following' : 'Follow'}
              size="sm"
              variant={following ? 'secondary' : 'primary'}
              onClick={onFollow}
            />
          ) : null}
          <Button label="Message" size="sm" variant="ghost" onClick={onMessage} />
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: demo.soft }}>{user.email}</div>
      </div>
    </article>
  );
}

export default ProfileCard;
