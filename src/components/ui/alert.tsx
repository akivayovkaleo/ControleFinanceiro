import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'success' | 'warning' | 'error';

const CONFIG: Record<Tone, { className: string; Icon: typeof Info }> = {
  info: { className: 'bg-transfer-soft text-transfer', Icon: Info },
  success: { className: 'bg-income-soft text-income', Icon: CheckCircle2 },
  warning: { className: 'bg-warning-soft text-warning', Icon: AlertTriangle },
  error: { className: 'bg-danger-soft text-danger', Icon: XCircle },
};

export function Alert({
  tone = 'info',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon } = CONFIG[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium',
        toneClass,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
