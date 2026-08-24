import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm';

/**
 * O primário carrega uma sombra na cor da marca, não cinza. Uma sombra cinza
 * sob um botão colorido parece sujeira; na cor dele, parece luz.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-fg shadow-brand hover:bg-brand-strong active:scale-[0.985]',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3 active:scale-[0.985]',
  subtle: 'bg-brand-soft text-brand hover:bg-brand-soft/70',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white shadow-sm hover:brightness-110 active:scale-[0.985]',
  outline:
    'border border-border-strong bg-surface text-fg hover:bg-surface-2 hover:border-brand/40',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  xl: 'h-13 px-7 text-base gap-2.5 rounded-2xl',
  icon: 'h-9 w-9 rounded-lg',
  'icon-sm': 'h-7 w-7 rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-all duration-150 ease-out',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
