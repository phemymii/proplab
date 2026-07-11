import { demo } from '../../theme';
import { Badge } from '../Badge';
import { Button } from '../Button';

export type BillingCycle = 'monthly' | 'yearly';
export type PlanTier = 'starter' | 'pro' | 'enterprise';

export interface PricingFeature {
  label: string;
  included: boolean;
}

export interface PricingCardProps {
  /** Plan name */
  name: string;
  /** Short pitch under the name */
  description: string;
  /** Price amount (numeric) */
  price: number;
  /** Currency symbol or code */
  currency?: string;
  /** Billing cadence */
  cycle?: BillingCycle;
  /** Tier badge */
  tier?: PlanTier;
  /** Highlight as the recommended plan */
  featured?: boolean;
  /** Feature checklist */
  features: PricingFeature[];
  /** CTA button label */
  ctaLabel?: string;
  /** Fired when CTA is clicked */
  onSelect?: () => void;
}

const tierTone: Record<PlanTier, 'neutral' | 'info' | 'success'> = {
  starter: 'neutral',
  pro: 'info',
  enterprise: 'success',
};

export function PricingCard({
  name,
  description,
  price,
  currency = '$',
  cycle = 'monthly',
  tier = 'pro',
  featured = false,
  features,
  ctaLabel = 'Get started',
  onSelect,
}: PricingCardProps) {
  return (
    <article
      style={{
        fontFamily: demo.font,
        width: 300,
        padding: 24,
        borderRadius: 18,
        background: featured ? demo.accent : demo.white,
        color: featured ? demo.white : demo.ink,
        boxShadow: featured
          ? '0 24px 48px rgba(61,79,95,0.28)'
          : '0 16px 36px rgba(26,24,20,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 18, letterSpacing: '-0.02em' }}>{name}</h3>
        <Badge tone={tierTone[tier]} pill size="sm">
          {tier}
        </Badge>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: featured ? 'rgba(255,255,255,0.78)' : demo.muted,
        }}
      >
        {description}
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.04em' }}>
          {currency}
          {price}
        </span>
        <span
          style={{
            fontSize: 13,
            color: featured ? 'rgba(255,255,255,0.7)' : demo.muted,
          }}
        >
          / {cycle === 'monthly' ? 'mo' : 'yr'}
        </span>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {features.map((feature) => (
          <li
            key={feature.label}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 13,
              opacity: feature.included ? 1 : 0.45,
            }}
          >
            <span aria-hidden>{feature.included ? '✓' : '–'}</span>
            {feature.label}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 'auto' }}>
        <Button
          label={ctaLabel}
          variant={featured ? 'secondary' : 'primary'}
          fullWidth
          onClick={onSelect}
        />
      </div>
    </article>
  );
}

export default PricingCard;
