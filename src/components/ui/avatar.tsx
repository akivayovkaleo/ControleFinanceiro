import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';

/**
 * Avatar por iniciais e cor.
 *
 * Num espaço de casal, a cor é o principal sinal visual de "de quem é isto" —
 * ela se repete no extrato, no acerto e nos filtros. Por isso cada membro
 * escolhe a sua.
 */
export function Avatar({
  name,
  color,
  size = 'md',
  className,
  ring = false,
}: {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  ring?: boolean;
}) {
  const SIZE: Record<string, string> = {
    xs: 'h-5 w-5 text-[9px]',
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        ring && 'ring-2 ring-surface',
        SIZE[size],
        className,
      )}
      style={{ backgroundColor: color ?? '#5b6478' }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}

/** Pilha de avatares sobrepostos, para mostrar os membros de um espaço. */
export function AvatarStack({
  members,
  size = 'sm',
  max = 4,
}: {
  members: Array<{ displayName: string; color: string }>;
  size?: 'xs' | 'sm' | 'md';
  max?: number;
}) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;

  return (
    <div className="flex -space-x-1.5">
      {shown.map((member, index) => (
        <Avatar
          key={`${member.displayName}-${index}`}
          name={member.displayName}
          color={member.color}
          size={size}
          ring
        />
      ))}
      {rest > 0 && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </div>
  );
}
