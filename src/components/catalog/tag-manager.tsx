'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { deleteTagAction, saveTagAction } from '@/server/actions/tags';
import { idleState } from '@/server/actions/types';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input } from '@/components/ui/field';
import { ColorPicker } from '@/components/ui/color-picker';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/card';

export interface TagView {
  id: string;
  name: string;
  color: string;
  transactionCount: number;
}

export function TagManager({ spaceId, tags }: { spaceId: string; tags: TagView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(saveTagAction, idleState);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-sm font-semibold text-fg">Etiquetas</h2>
          <p className="mt-0.5 text-xs text-muted">
            A categoria diz que tipo de gasto é. A etiqueta diz a que ele se refere — uma viagem,
            uma obra, um projeto.
          </p>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Nova etiqueta
          </Button>
        )}
      </div>

      {open && (
        <form action={formAction} className="space-y-4 border-b border-border p-4">
          <input type="hidden" name="spaceId" value={spaceId} />

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Field label="Nome" htmlFor="tag-name" error={state.fieldErrors?.name} required>
            <Input
              id="tag-name"
              name="name"
              placeholder="Viagem ao Chile"
              maxLength={40}
              autoFocus
              required
            />
          </Field>

          <ColorPicker name="color" label="Cor" />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <SubmitButton className="flex-1" pendingLabel="Criando…">
              Criar etiqueta
            </SubmitButton>
          </div>
        </form>
      )}

      {tags.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<TagIcon className="h-6 w-6" aria-hidden />}
            title="Nenhuma etiqueta ainda"
            description="Etiquetas servem para juntar gastos de categorias diferentes que pertencem à mesma coisa — a passagem, o hotel e o restaurante da mesma viagem."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} spaceId={spaceId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TagRow({ tag, spaceId }: { tag: TagView; spaceId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(deleteTagAction, idleState);

  useEffect(() => {
    if (state.ok) {
      setConfirming(false);
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <li className="flex items-center justify-between gap-3 p-4">
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: tag.color }}
          aria-hidden
        />
        <span className="truncate text-sm text-fg">{tag.name}</span>
        <span className="shrink-0 text-xs text-muted">
          {tag.transactionCount === 0
            ? 'sem uso'
            : `${tag.transactionCount} ${tag.transactionCount === 1 ? 'lançamento' : 'lançamentos'}`}
        </span>
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="text-danger"
        onClick={() => setConfirming(true)}
        aria-label={`Remover etiqueta ${tag.name}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>

      <ConfirmDialog
        open={confirming}
        title={`Remover a etiqueta "${tag.name}"?`}
        description={
          tag.transactionCount > 0
            ? `Ela sai de ${tag.transactionCount} ${
                tag.transactionCount === 1 ? 'lançamento' : 'lançamentos'
              }. Os lançamentos continuam lá — só perdem a etiqueta.`
            : 'Esta etiqueta não está em nenhum lançamento.'
        }
        error={state.error}
        onCancel={() => setConfirming(false)}
      >
        <form action={formAction}>
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="tagId" value={tag.id} />
          <SubmitButton variant="danger" pendingLabel="Removendo…">
            Remover
          </SubmitButton>
        </form>
      </ConfirmDialog>
    </li>
  );
}
