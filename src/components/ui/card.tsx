import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  sheen = true,
}: {
  className?: string;
  children: ReactNode;
  /** Degradê quase imperceptível no topo. Ver `.surface-sheen` em globals.css. */
  sheen?: boolean;
}) {
  return <div className={cn('card', sheen && 'surface-sheen', className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fg">{title}</h2>
        {description && <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

/**
 * Estado vazio.
 *
 * Um app financeiro novo é 90% telas vazias. Cada uma explica o que aquilo
 * significa e oferece a próxima ação — em vez de deixar a pessoa olhando
 * para o nada.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-surface-2 to-surface-3 text-subtle ring-1 ring-border">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
