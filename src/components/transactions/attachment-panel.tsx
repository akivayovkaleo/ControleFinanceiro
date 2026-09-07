'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ImageIcon, Paperclip, Trash2 } from 'lucide-react';
import { deleteAttachmentAction, uploadAttachmentAction } from '@/server/actions/attachments';
import { idleState } from '@/server/actions/types';
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_MIME_LABEL,
  formatBytes,
  isImage,
  MAX_ATTACHMENTS_PER_TRANSACTION,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_MB,
} from '@/lib/attachments';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export interface AttachmentView {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export function AttachmentPanel({
  spaceId,
  transactionId,
  attachments,
}: {
  spaceId: string;
  transactionId: string;
  attachments: AttachmentView[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(uploadAttachmentAction, idleState);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  const cheio = attachments.length >= MAX_ATTACHMENTS_PER_TRANSACTION;

  /**
   * Checagem no cliente é cortesia: evita subir 30 MB para receber erro no fim.
   * Quem decide é o servidor, que valida de novo sobre os bytes recebidos.
   */
  const onPick = () => {
    const file = inputRef.current?.files?.[0];
    setLocalError(null);
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setLocalError(`${formatBytes(file.size)} é maior que o limite de ${MAX_ATTACHMENT_MB} MB.`);
      inputRef.current!.value = '';
    }
  };

  return (
    <div className="card">
      <div className="border-b border-border p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Paperclip className="h-4 w-4" aria-hidden />
          Comprovantes
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          {ALLOWED_MIME_LABEL}, até {MAX_ATTACHMENT_MB} MB. No máximo{' '}
          {MAX_ATTACHMENTS_PER_TRANSACTION} por lançamento.
        </p>
      </div>

      {attachments.length > 0 && (
        <ul className="divide-y divide-border">
          {attachments.map((attachment) => (
            <AttachmentRow key={attachment.id} attachment={attachment} spaceId={spaceId} />
          ))}
        </ul>
      )}

      <div className="p-4">
        {state.error && (
          <Alert tone="error" className="mb-3">
            {state.error}
          </Alert>
        )}
        {localError && (
          <Alert tone="warning" className="mb-3">
            {localError}
          </Alert>
        )}

        {cheio ? (
          <p className="text-xs text-muted">
            Este lançamento já tem o máximo de comprovantes. Remova um para anexar outro.
          </p>
        ) : (
          <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="spaceId" value={spaceId} />
            <input type="hidden" name="transactionId" value={transactionId} />
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept={ACCEPT_ATTRIBUTE}
              onChange={onPick}
              required
              className="block w-full max-w-xs text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-xs file:font-medium file:text-fg hover:file:bg-surface-3"
            />
            <SubmitButton variant="outline" pendingLabel="Enviando…">
              Anexar
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

function AttachmentRow({
  attachment,
  spaceId,
}: {
  attachment: AttachmentView;
  spaceId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(deleteAttachmentAction, idleState);

  useEffect(() => {
    if (state.ok) {
      setConfirming(false);
      router.refresh();
    }
  }, [state.ok, router]);

  const Icon = isImage(attachment.mimeType) ? ImageIcon : FileText;

  return (
    <li className="flex items-center justify-between gap-3 p-4">
      <a
        href={`/api/anexos/${attachment.id}`}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2.5 text-sm text-fg hover:underline"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span className="truncate">{attachment.filename}</span>
        <span className="shrink-0 text-xs text-muted">{formatBytes(attachment.sizeBytes)}</span>
      </a>

      <Button
        variant="ghost"
        size="icon"
        className="text-danger"
        onClick={() => setConfirming(true)}
        aria-label={`Remover ${attachment.filename}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>

      <ConfirmDialog
        open={confirming}
        title={`Remover ${attachment.filename}?`}
        description="O arquivo é apagado do servidor. O lançamento continua."
        error={state.error}
        onCancel={() => setConfirming(false)}
      >
        <form action={formAction}>
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="attachmentId" value={attachment.id} />
          <SubmitButton variant="danger" pendingLabel="Removendo…">
            Remover
          </SubmitButton>
        </form>
      </ConfirmDialog>
    </li>
  );
}
