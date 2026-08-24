'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Fronteira de erro global.
 *
 * Mostra uma mensagem genérica de propósito: `error.message` pode carregar
 * detalhe de banco ou caminho de arquivo. O `digest` permite cruzar o que a
 * pessoa viu com o log do servidor sem expor nada.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] erro não tratado:', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Algo deu errado</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Tivemos um problema ao carregar esta tela. Tente de novo — se persistir, recarregue
        a página.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-2xs text-subtle">Código: {error.digest}</p>
      )}
      <Button onClick={reset} className="mt-6">
        Tentar de novo
      </Button>
    </main>
  );
}
