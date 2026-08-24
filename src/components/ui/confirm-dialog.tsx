'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Alert } from './alert';

/**
 * Diálogo de confirmação para ações destrutivas.
 *
 * Usa o `<dialog>` nativo em vez de um overlay improvisado: ele já entrega
 * foco preso dentro do diálogo, fechar com Esc e semântica de modal para
 * leitores de tela — três coisas que uma div com `position: fixed` não tem.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  error,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  error?: string;
  onCancel: () => void;
  /** O formulário que executa a ação. */
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onClick={(event) => {
        // Clicar no backdrop fecha. O alvo só é o <dialog> quando o clique
        // caiu fora do conteúdo.
        if (event.target === ref.current) onCancel();
      }}
      aria-labelledby="confirm-title"
      className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border bg-surface p-0 text-fg shadow-pop backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>

        <h2 id="confirm-title" className="text-base font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}

        {error && (
          <Alert tone="error" className="mt-3">
            {error}
          </Alert>
        )}

        <div className="mt-5 space-y-2">
          {children}
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
      <span className="sr-only">{confirmLabel}</span>
    </dialog>
  );
}
