import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface TwCardProps {
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  elevated?: boolean;
}

export function TwCard({
  title,
  description = 'Short supporting copy for this card.',
  children,
  footer,
  elevated = true,
}: TwCardProps) {
  return (
    <article
      className={clsx(
        'max-w-md overflow-hidden rounded-2xl border border-line bg-white',
        elevated && 'shadow-card',
      )}
    >
      <header className="border-b border-line bg-slate-50 px-5 py-4">
        <h3 className="text-base font-bold tracking-tight text-ink">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-relaxed text-mist">{description}</p> : null}
      </header>
      {children != null && children !== '' ? (
        <div className="px-5 py-4 text-sm leading-relaxed text-slate-600">{children}</div>
      ) : null}
      {footer != null && footer !== '' ? (
        <footer className="border-t border-line px-5 py-3 text-xs text-mist">{footer}</footer>
      ) : null}
    </article>
  );
}

export default TwCard;
