'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from './button';
import { cn } from '@/lib/utils';

/**
 * Botão de envio que se desabilita e mostra spinner enquanto a action roda.
 *
 * `useFormStatus` só funciona dentro de um <form>; por isso o componente
 * precisa ser cliente e ficar abaixo do form na árvore.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      className={cn(className)}
      aria-busy={pending}
      {...props}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
