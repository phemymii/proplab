import clsx from 'clsx';

export type TwBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

export interface TwBadgeProps {
  label: string;
  tone?: TwBadgeTone;
  pill?: boolean;
}

const toneClass: Record<TwBadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-rose-50 text-rose-800 ring-rose-200',
  brand: 'bg-brand-soft text-brand-dark ring-teal-200',
};

export function TwBadge({ label, tone = 'neutral', pill = true }: TwBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold tracking-wide ring-1 ring-inset',
        pill ? 'rounded-full' : 'rounded-md',
        toneClass[tone],
      )}
    >
      {label}
    </span>
  );
}

export default TwBadge;
