import clsx from 'clsx';

export type TwButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type TwButtonSize = 'sm' | 'md' | 'lg';

export interface TwButtonProps {
  label: string;
  variant?: TwButtonVariant;
  size?: TwButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
}

const variantClass: Record<TwButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm',
  secondary: 'bg-brand-soft text-brand-dark hover:bg-teal-100',
  ghost: 'bg-transparent text-brand hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
};

const sizeClass: Record<TwButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2',
};

/**
 * Tailwind utility button — PropLab should pick up PostCSS + Tailwind so these classes render.
 */
export function TwButton({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
}: TwButtonProps) {
  const idle = !(disabled || loading);

  return (
    <button
      type="button"
      disabled={!idle}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center rounded-xl font-semibold tracking-tight transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        variantClass[variant],
        sizeClass[size],
        fullWidth && 'w-full',
        !idle && 'cursor-not-allowed opacity-50',
      )}
    >
      {loading ? 'Loading…' : label}
    </button>
  );
}

export default TwButton;
